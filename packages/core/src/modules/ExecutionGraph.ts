import { Executor } from "../executors/Executor";
import { ParamFuture } from "../futures/ParamFuture";

import { IgnitionModule } from "./IgnitionModule";

export class ExecutionGraph {
  private _modules: Map<string, Map<string, Executor>> = new Map();
  private _dependencies: Map<string, Set<string>> = new Map();

  public addExecutor(executor: Executor) {
    const moduleId = executor.future.moduleId;
    let executorsMap = this._modules.get(moduleId);
    if (executorsMap === undefined) {
      executorsMap = new Map();
      this._modules.set(moduleId, executorsMap);
    }

    if (executorsMap.has(executor.future.id)) {
      if (executor.future instanceof ParamFuture) {
        if (executor.future.input.defaultValue === undefined) {
          throw new Error(
            `A parameter should only be retrieved once, but found more than one call to getParam for "${executor.future.id}"`
          );
        } else {
          throw new Error(
            `An optional parameter should only be retrieved once, but found more than one call to getParam for "${executor.future.id}"`
          );
        }
      } else {
        throw new Error(
          `Executor with id ${executor.future.id} already exists`
        );
      }
    }

    const dependencies = executor.future.getDependencies();
    for (const dependency of dependencies) {
      this._addDependency(moduleId, dependency.moduleId);
    }

    executorsMap.set(executor.future.id, executor);
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
