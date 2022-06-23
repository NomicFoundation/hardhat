import { Executor } from "../executors/Executor";

import { IgnitionModule } from "./IgnitionModule";

export class ExecutionGraph {
  private _modules: Map<string, Map<string, Executor>> = new Map();
  private _dependencies: Map<string, Set<string>> = new Map();

  public addExecutor(executor: Executor) {
    const moduleId = executor.binding.moduleId;
    let executorsMap = this._modules.get(moduleId);
    if (executorsMap === undefined) {
      executorsMap = new Map();
      this._modules.set(moduleId, executorsMap);
    }

    if (executorsMap.has(executor.binding.id)) {
      throw new Error(`Executor with id ${executor.binding.id} already exists`);
    }

    const dependencies = executor.binding.getDependencies();
    for (const dependency of dependencies) {
      this._addDependency(moduleId, dependency.moduleId);
    }

    executorsMap.set(executor.binding.id, executor);
  }

  public getModule(moduleId: string): IgnitionModule | undefined {
    const executorsMap = this._modules.get(moduleId);
    if (executorsMap === undefined) {
      return undefined;
    }

    return new IgnitionModule(moduleId, [...executorsMap.values()]);
  }

  public getSortedModules(): IgnitionModule[] {
    const added = new Set<string>();
    const ignitionModules = this._getModules();
    const sortedModules: IgnitionModule[] = [];

    while (added.size < ignitionModules.length) {
      for (const ignitionModule of ignitionModules) {
        if (added.has(ignitionModule.id)) {
          continue;
        }

        const dependencies =
          this._dependencies.get(ignitionModule.id) ?? new Set();
        if ([...dependencies].every((d) => added.has(d))) {
          sortedModules.push(ignitionModule);
          added.add(ignitionModule.id);
        }
      }
    }

    return sortedModules;
  }

  private _addDependency(moduleId: string, dependencyModuleId: string) {
    if (moduleId !== dependencyModuleId) {
      const dependencies =
        this._dependencies.get(moduleId) ?? new Set<string>();
      dependencies.add(dependencyModuleId);
      this._dependencies.set(moduleId, dependencies);
    }
  }

  private _getModules(): IgnitionModule[] {
    return [...this._modules.entries()].map(
      ([id, executorsMap]) => new IgnitionModule(id, [...executorsMap.values()])
    );
  }
}
