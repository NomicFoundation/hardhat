import type { Future, IgnitionModule } from "../../types/module.js";

import { isFuture } from "../../type-guards.js";

import { AdjacencyList } from "./adjacency-list.js";

export class AdjacencyListConverter {
  public static buildAdjacencyListFromFutures(
    futures: Future[],
  ): AdjacencyList {
    const dependencyGraph = new AdjacencyList(futures.map((f) => f.id));

    for (const future of futures) {
      for (const dependency of future.dependencies) {
        dependencyGraph.addDependency({ from: future.id, to: dependency.id });

        if (isFuture(dependency)) {
          this._optionallyAddDependenciesSubmoduleSiblings(
            dependencyGraph,
            future,
            dependency,
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
   *
   * The rule doesn't apply when the dependency's module (transitively) uses
   * the future's module, e.g. when a module passes one of its own futures
   * into a submodule. Waiting for all of that module's futures would usually
   * be circular, as the module normally depends on the submodule's results.
   */
  private static _optionallyAddDependenciesSubmoduleSiblings(
    dependencyGraph: AdjacencyList,
    future: Future,
    dependency: Future,
  ): void {
    if (future.module === dependency.module) {
      return;
    }

    if (this._isSubmoduleOf(future.module, dependency.module)) {
      return;
    }

    for (const moduleDep of dependency.module.futures) {
      dependencyGraph.addDependency({
        from: future.id,
        to: moduleDep.id,
      });
    }
  }

  private static _isSubmoduleOf(
    module: IgnitionModule,
    potentialAncestor: IgnitionModule,
    visited: Set<IgnitionModule> = new Set(),
  ): boolean {
    for (const submodule of potentialAncestor.submodules) {
      if (visited.has(submodule)) {
        continue;
      }

      visited.add(submodule);

      if (
        submodule === module ||
        this._isSubmoduleOf(module, submodule, visited)
      ) {
        return true;
      }
    }

    return false;
  }
}
