import type { DeploymentState } from "./execution/types/deployment-state.js";
import type { AdjacencyList } from "./utils/adjacency-list.js";
import type { Future, IgnitionModule } from "../types/module.js";

import { ExecutionStatus } from "./execution/types/execution-state.js";
import { AdjacencyListConverter } from "./utils/adjacency-list-converter.js";
import { getFuturesFromModule } from "./utils/get-futures-from-module.js";

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
    deploymentState: DeploymentState,
    maxBatchSize?: number,
  ): string[][] {
    const batchState = this._initializeBatchStateFrom(module, deploymentState);

    const batches: string[][] = [];

    while (!this._allVisited(batchState)) {
      const nextBatch = this._resolveNextBatch(batchState);

      if (maxBatchSize !== undefined && nextBatch.length > maxBatchSize) {
        // Split the batch into chunks and add artificial dependencies
        const splitBatches = this._splitBatch(
          nextBatch,
          maxBatchSize,
          batchState,
        );

        // Only mark the first chunk as visited immediately
        // The remaining chunks will be processed in subsequent iterations
        // because they now have dependencies on the previous chunks
        batches.push(splitBatches[0]);
        this._markAsVisited(batchState, splitBatches[0]);

        // Add artificial dependencies for remaining chunks
        for (let i = 1; i < splitBatches.length; i++) {
          const currentChunk = splitBatches[i];
          const previousChunk = splitBatches[i - 1];

          // Add dependencies from futures in current chunk to futures in previous chunk
          for (const futureId of currentChunk) {
            for (const prevFutureId of previousChunk) {
              batchState.adjacencyList.addDependency({
                from: futureId,
                to: prevFutureId,
              });
            }
          }
        }
      } else {
        batches.push(nextBatch);
        this._markAsVisited(batchState, nextBatch);
      }
    }

    return batches;
  }

  private static _initializeBatchStateFrom(
    module: IgnitionModule,
    deploymentState: DeploymentState,
  ): BatchState {
    const allFutures = getFuturesFromModule(module);

    const visitState = this._initializeVisitStateFrom(
      allFutures,
      deploymentState,
    );

    const adjacencyList =
      AdjacencyListConverter.buildAdjacencyListFromFutures(allFutures);

    this._eliminateAlreadyVisitedFutures({ adjacencyList, visitState });

    return { adjacencyList, visitState };
  }

  private static _initializeVisitStateFrom(
    futures: Future[],
    deploymentState: DeploymentState,
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
      }),
    );
  }

  public static _eliminateAlreadyVisitedFutures({
    adjacencyList,
    visitState,
  }: {
    adjacencyList: AdjacencyList;
    visitState: VisitStatusMap;
  }): void {
    const visitedFutures = Object.entries(visitState)
      .filter(([, vs]) => vs === VisitStatus.VISITED)
      .map(([futureId]) => futureId);

    for (const visitedFuture of visitedFutures) {
      adjacencyList.eliminate(visitedFuture);
    }
  }

  private static _allVisited(batchState: BatchState): boolean {
    return Object.values(batchState.visitState).every(
      (s) => s === VisitStatus.VISITED,
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
      this._allDependenciesVisited(futureId, batchState),
    );

    return allUnvisitedWhereDepsVisited.sort();
  }

  private static _allDependenciesVisited(
    futureId: string,
    batchState: BatchState,
  ): boolean {
    const dependencies = batchState.adjacencyList.getDependenciesFor(futureId);

    return [...dependencies].every((depId) => {
      // We distinguish between module and future ids here, as the future's always have `#` and the modules don't.
      if (/#/.test(depId)) {
        return batchState.visitState[depId] === VisitStatus.VISITED;
      }

      return this._checkModuleDependencyIsComplete(depId, batchState);
    });
  }

  /**
   * This is needed because moduleIds are not present in the visit state
   * causing an infinite loop when checking whether a dependency is visited if that dependency is a module.
   */
  private static _checkModuleDependencyIsComplete(
    moduleId: string,
    batchState: BatchState,
  ) {
    const dependencies = Object.keys(batchState.visitState).filter((futureId) =>
      futureId.startsWith(moduleId),
    );

    return dependencies.every(
      (depId) => batchState.visitState[depId] === VisitStatus.VISITED,
    );
  }

  /**
   * Splits a batch that exceeds maxBatchSize into multiple smaller batches.
   */
  private static _splitBatch(
    batch: string[],
    maxBatchSize: number,
    _batchState: BatchState,
  ): string[][] {
    const splitBatches: string[][] = [];

    for (let i = 0; i < batch.length; i += maxBatchSize) {
      const chunk = batch.slice(i, i + maxBatchSize);
      splitBatches.push(chunk);
    }

    return splitBatches;
  }
}
