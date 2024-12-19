import { isFuture } from "../../type-guards";
import { Future } from "../../types/module";

import { AdjacencyList } from "./adjacency-list";

export class AdjacencyListConverter {
  public static buildAdjacencyListFromFutures(
    futures: Future[]
  ): AdjacencyList {
    const dependencyGraph = new AdjacencyList(futures.map((f) => f.id));

    for (const future of futures) {
      for (const dependency of future.dependencies) {
        dependencyGraph.addDependency({ from: future.id, to: dependency.id });

        if (isFuture(dependency)) {
          this._optionallyAddDependenciesSubmoduleSiblings(
            dependencyGraph,
            future,
            dependency
          );
        }
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
}
