import type { Future, IgnitionModule } from "../../types/module.js";

import { isFuture } from "../../type-guards.js";

import { AdjacencyList } from "./adjacency-list.js";
import { getFuturesFromModule } from "./get-futures-from-module.js";

export class AdjacencyListConverter {
  public static buildAdjacencyListFromFutures(
    futures: Future[],
  ): AdjacencyList {
    const dependencyGraph = new AdjacencyList(futures.map((f) => f.id));

    for (const future of futures) {
      for (const dependency of future.dependencies) {
        if (isFuture(dependency)) {
          // Only futures are added to the dependency graph. A module
          // dependency is replaced by its futures in the call below.
          dependencyGraph.addDependency({ from: future.id, to: dependency.id });
        }

        this._optionallyAddDependenciesFromSubmodules(
          dependencyGraph,
          future,
          dependency,
        );
      }
    }

    return dependencyGraph;
  }

  /**
   * The famed Malaga rule, if a future's dependency is in a submodule,
   * then that future should not be executed until all futures in the
   * submodule and its submodules (recursive) have been run.
   *
   * The same applies to a module dependency (i.e. a module passed in
   * `after`): the future waits for all the futures of that module and
   * of its submodules (recursive).
   */
  private static _optionallyAddDependenciesFromSubmodules(
    dependencyGraph: AdjacencyList,
    future: Future,
    dependency: Future | IgnitionModule,
  ): void {
    if (isFuture(dependency) && future.module === dependency.module) {
      return;
    }

    const moduleFutures = getFuturesFromModule(
      isFuture(dependency) ? dependency.module : dependency,
    );

    for (const moduleDep of moduleFutures) {
      dependencyGraph.addDependency({
        from: future.id,
        to: moduleDep.id,
      });
    }
  }
}
