import { isFuture } from "../../type-guards";
import {
  Future,
  IgnitionModule,
  IgnitionModuleResult,
} from "../../types/module";

import { AdjacencyList } from "./adjacency-list";
import { getFuturesFromModule } from "./get-futures-from-module";

export class AdjacencyListConverter {
  public static buildAdjacencyListFromFutures(
    futures: Future[]
  ): AdjacencyList {
    const dependencyGraph = new AdjacencyList(futures.map((f) => f.id));

    for (const future of futures) {
      for (const dependency of future.dependencies) {
        dependencyGraph.addDependency({ from: future.id, to: dependency.id });

        this._optionallyAddDependenciesFromSubmodules(
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
   * submodule and its submodules (recursive) have been run.
   */
  private static _optionallyAddDependenciesFromSubmodules(
    dependencyGraph: AdjacencyList,
    future: Future,
    dependency:
      | Future
      | IgnitionModule<string, string, IgnitionModuleResult<string>>
  ): void {
    // we only need to worry about this case if the dependency is a future
    if (isFuture(dependency) && future.module === dependency.module) {
      return;
    }

    const futures = getFuturesFromModule(
      isFuture(dependency) ? dependency.module : dependency
    );

    for (const moduleDep of futures) {
      dependencyGraph.addDependency({
        from: future.id,
        to: moduleDep.id,
      });
    }
  }
}
