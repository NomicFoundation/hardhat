import { Executor } from "../executors/Executor";

export class IgnitionModule {
  constructor(public readonly id: string, private _executors: Executor[]) {}

  public getSortedExecutors(): Executor[] {
    const dependencies = new Map<string, Set<string>>();

    for (const executor of this._executors) {
      const executorDependencies =
        dependencies.get(executor.future.id) ?? new Set();

      for (const executorDependency of executor.future.getDependencies()) {
        if (executorDependency.moduleId === executor.future.moduleId) {
          executorDependencies.add(executorDependency.id);
        }
      }

      dependencies.set(executor.future.id, executorDependencies);
    }

    const added = new Set<string>();
    const sortedExecutors: Executor[] = [];

    while (added.size < this._executors.length) {
      for (const executor of this._executors) {
        if (added.has(executor.future.id)) {
          continue;
        }

        const executorDependencies =
          dependencies.get(executor.future.id) ?? new Set();

        if ([...executorDependencies].every((d) => added.has(d))) {
          sortedExecutors.push(executor);
          added.add(executor.future.id);
        }
      }
    }

    return sortedExecutors;
  }
}
