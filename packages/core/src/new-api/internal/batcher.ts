import { ExecutionStateMap, ExecutionStatus } from "../types/execution-state";
import { Future, IgnitionModule } from "../types/module";

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
    executionStateMap: ExecutionStateMap
  ): string[][] {
    const batchState = this._initializeBatchStateFrom(
      module,
      executionStateMap
    );

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
    executionStateMap: ExecutionStateMap
  ): BatchState {
    const allFutures = this._recursiveGetFuturesFor(module);

    const visitState = this._intializeVisitStateFrom(
      allFutures,
      executionStateMap
    );

    const adjacencyList = this._buildAdjacencyListFor(allFutures);

    this._eleminateAlreadyVisitedFutures({ adjacencyList, visitState });

    return { adjacencyList, visitState };
  }

  private static _recursiveGetFuturesFor(module: IgnitionModule): Future[] {
    return [...module.futures].concat(
      Array.from(module.submodules).flatMap((sub) =>
        this._recursiveGetFuturesFor(sub)
      )
    );
  }

  private static _intializeVisitStateFrom(
    futures: Future[],
    executionStateMap: ExecutionStateMap
  ): VisitStatusMap {
    return Object.fromEntries(
      futures.map((f) => {
        const executionState = executionStateMap[f.id];

        if (executionState === undefined) {
          return [f.id, VisitStatus.UNVISITED];
        }

        switch (executionState.status) {
          case ExecutionStatus.FAILED:
          case ExecutionStatus.HOLD:
          case ExecutionStatus.STARTED:
            return [f.id, VisitStatus.UNVISITED];
          case ExecutionStatus.SUCCESS:
            return [f.id, VisitStatus.VISITED];
        }
      })
    );
  }

  private static _buildAdjacencyListFor(futures: Future[]): AdjacencyList {
    const dependencyGraph = new AdjacencyList();

    for (const future of futures) {
      for (const dependency of future.dependencies) {
        dependencyGraph.addDependency({ from: future.id, to: dependency.id });

        this._optionallyAddDependenciesSubmoduleSiblings(
          dependencyGraph,
          future,
          dependency
        );
      }
    }

    return dependencyGraph;
  }

  /**
   * The famed Malaga rule, if a future's dependency is in a submodule,
   * then that future should not be executed until all futures in the
   * submodule have been run.
   */
  private static _optionallyAddDependenciesSubmoduleSiblings(
    dependencyGraph: AdjacencyList,
    future: Future,
    dependency: Future
  ): void {
    if (future.module === dependency.module) {
      return;
    }

    for (const moduleDep of dependency.module.futures) {
      dependencyGraph.addDependency({
        from: future.id,
        to: moduleDep.id,
      });
    }
  }

  public static _eleminateAlreadyVisitedFutures({
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

export class AdjacencyList {
  /**
   * A mapping from futures to each futures dependencies.
   *
   * Example:
   *     A
   *    ^ ^
   *    | |
   *    B C
   * Gives a mapping of {A: [], B: [A], C:[A]}
   *
   */
  private _list: Map<string, Set<string>> = new Map<string, Set<string>>();

  /**
   * Add a dependency from `from` to `to`. If A depends on B
   * then {`from`: A, `to`: B} should be passed.
   */
  public addDependency({ from, to }: { from: string; to: string }) {
    const toSet = this._list.get(from) ?? new Set<string>();

    toSet.add(to);

    this._list.set(from, toSet);
  }

  /**
   * Get the dependencies, if A depends on B, A's dependencies includes B
   * @param from - the future to get the list of dependencies for
   * @returns - the dependencies
   */
  public getDependenciesFor(from: string): Set<string> {
    return this._list.get(from) ?? new Set<string>();
  }

  /**
   * Get the dependents, if A depends on B, B's dependents includes A
   * @param from - the future to get the list of dependents for
   * @returns - the dependents
   */
  public getDependentsFor(to: string) {
    return [...this._list.entries()]
      .filter(([_from, toSet]) => toSet.has(to))
      .map(([from]) => from);
  }

  /**
   * Remove a future, transfering its dependencies to its dependents.
   * @param futureId - The future to eliminate
   */
  public eliminate(futureId: string): void {
    const dependents = this.getDependentsFor(futureId);
    const dependencies = this.getDependenciesFor(futureId);

    this._list.delete(futureId);

    for (const dependent of dependents) {
      const toSet = this._list.get(dependent);

      if (toSet === undefined) {
        throw new Error("Dependency sets should be defined");
      }

      const setWithoutFuture = new Set<string>(
        [...toSet].filter((n) => n !== futureId)
      );

      const updatedSet = new Set<string>([
        ...setWithoutFuture,
        ...dependencies,
      ]);

      this._list.set(dependent, updatedSet);
    }
  }
}
