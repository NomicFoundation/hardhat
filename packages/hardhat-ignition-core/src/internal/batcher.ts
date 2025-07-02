import { Future, IgnitionModule } from "../types/module";

import { DeploymentState } from "./execution/types/deployment-state";
import { ExecutionStatus } from "./execution/types/execution-state";
import { AdjacencyList } from "./utils/adjacency-list";
import { AdjacencyListConverter } from "./utils/adjacency-list-converter";
import { getFuturesFromModule } from "./utils/get-futures-from-module";

enum VisitStatus {
  UNVISITED,
  VISITED,
}

interface VisitStatusMap {
  [key: string]: VisitStatus;
}

interface BatchState {
  adjacencyList: AdjacencyList;
  visitState: VisitStatusMap;
}

export class Batcher {
  public static batch(
    module: IgnitionModule,
    deploymentState: DeploymentState
  ): string[][] {
    const batchState = this._initializeBatchStateFrom(module, deploymentState);

    const batches: string[][] = [];

    while (!this._allVisited(batchState)) {
      const nextBatch = this._resolveNextBatch(batchState);

      batches.push(nextBatch);

      this._markAsVisited(batchState, nextBatch);
    }

    return batches;
  }

  private static _initializeBatchStateFrom(
    module: IgnitionModule,
    deploymentState: DeploymentState
  ): BatchState {
    const allFutures = getFuturesFromModule(module);

    const visitState = this._initializeVisitStateFrom(
      allFutures,
      deploymentState
    );

    const adjacencyList =
      AdjacencyListConverter.buildAdjacencyListFromFutures(allFutures);

    this._eliminateAlreadyVisitedFutures({ adjacencyList, visitState });

    return { adjacencyList, visitState };
  }

  private static _initializeVisitStateFrom(
    futures: Future[],
    deploymentState: DeploymentState
  ): VisitStatusMap {
    return Object.fromEntries(
      futures.map((f) => {
        const executionState = deploymentState.executionStates[f.id];

        if (executionState === undefined) {
          return [f.id, VisitStatus.UNVISITED];
        }

        switch (executionState.status) {
          case ExecutionStatus.FAILED:
          case ExecutionStatus.TIMEOUT:
          case ExecutionStatus.HELD:
          case ExecutionStatus.STARTED:
            return [f.id, VisitStatus.UNVISITED];
          case ExecutionStatus.SUCCESS:
            return [f.id, VisitStatus.VISITED];
        }
      })
    );
  }

  public static _eliminateAlreadyVisitedFutures({
    adjacencyList,
    visitState,
  }: {
    adjacencyList: AdjacencyList;
    visitState: VisitStatusMap;
  }) {
    const visitedFutures = Object.entries(visitState)
      .filter(([, vs]) => vs === VisitStatus.VISITED)
      .map(([futureId]) => futureId);

    for (const visitedFuture of visitedFutures) {
      adjacencyList.eliminate(visitedFuture);
    }
  }

  private static _allVisited(batchState: BatchState): boolean {
    return Object.values(batchState.visitState).every(
      (s) => s === VisitStatus.VISITED
    );
  }

  private static _markAsVisited(batchState: BatchState, nextBatch: string[]) {
    for (const futureId of nextBatch) {
      batchState.visitState[futureId] = VisitStatus.VISITED;
    }
  }

  private static _resolveNextBatch(batchState: BatchState): string[] {
    const allUnvisited = Object.entries(batchState.visitState)
      .filter(([, state]) => state === VisitStatus.UNVISITED)
      .map(([id]) => id);

    const allUnvisitedWhereDepsVisited = allUnvisited.filter((futureId) =>
      this._allDependenciesVisited(futureId, batchState)
    );

    return allUnvisitedWhereDepsVisited.sort();
  }

  private static _allDependenciesVisited(
    futureId: string,
    batchState: BatchState
  ): boolean {
    const dependencies = batchState.adjacencyList.getDependenciesFor(futureId);

    return [...dependencies].every(
      (depId) => batchState.visitState[depId] === VisitStatus.VISITED
    );
  }
}
