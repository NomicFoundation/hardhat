import { CallBinding } from "./bindings/CallBinding";
import { ContractBinding } from "./bindings/ContractBinding";
import { InternalBinding } from "./bindings/InternalBinding";
import { InternalCallBinding } from "./bindings/InternalCallBinding";
import { InternalContractBinding } from "./bindings/InternalContractBinding";
import { Bindable, CallOptions, ContractOptions } from "./bindings/types";
import { CallExecutor } from "./executors/CallExecutor";
import { ContractExecutor } from "./executors/ContractExecutor";
import { Executor } from "./executors/executors";
import { Contract, Tx } from "./types";

export class IgnitionModule {
  constructor(public readonly id: string, private _executors: Executor[]) {}

  public getSortedExecutors(): Executor[] {
    const dependencies = new Map<string, Set<string>>();

    for (const executor of this._executors) {
      const executorDependencies =
        dependencies.get(executor.binding.id) ?? new Set();

      for (const executorDependency of executor.binding.getDependencies()) {
        if (executorDependency.moduleId === executor.binding.moduleId) {
          executorDependencies.add(executorDependency.id);
        }
      }

      dependencies.set(executor.binding.id, executorDependencies);
    }

    const added = new Set<string>();
    const sortedExecutors: Executor[] = [];

    while (added.size < this._executors.length) {
      for (const executor of this._executors) {
        if (added.has(executor.binding.id)) {
          continue;
        }

        const executorDependencies =
          dependencies.get(executor.binding.id) ?? new Set();
        if ([...executorDependencies].every((d) => added.has(d))) {
          sortedExecutors.push(executor);
          added.add(executor.binding.id);
        }
      }
    }

    return sortedExecutors;
  }
}

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

interface UserContractOptions {
  id?: string;
  args?: Array<Bindable<any>>;
}

interface UserCallOptions {
  id?: string;
  args?: Array<Bindable<any>>;
}

export interface ModuleBuilder {
  getModuleId: () => string;
  addExecutor: (executor: Executor) => void;

  contract: (
    contractName: string,
    options?: UserContractOptions
  ) => ContractBinding;

  call: (
    contract: ContractBinding,
    method: string,
    options?: UserCallOptions
  ) => CallBinding;

  useModule: <T>(userModule: UserModule<T>) => T;
}

export class ModuleBuilderImpl implements ModuleBuilder {
  private _currentModuleId: string | undefined;
  private _executionGraph = new ExecutionGraph();
  private _executors: Executor[] = [];
  private _knownModules: Map<string, [UserModule<any>, any]> = new Map();

  constructor() {}

  public getModuleId(): string {
    if (this._currentModuleId === undefined) {
      throw new Error("[ModuleBuilderImpl] Assertion error: no module is set");
    }

    return this._currentModuleId;
  }

  public buildExecutionGraph(): ExecutionGraph {
    return this._executionGraph;
  }

  public addExecutor(executor: Executor) {
    if (this._currentModuleId === undefined) {
      throw new Error("[ModuleBuilderImpl] Assertion error: no module is set");
    }

    this._executionGraph.addExecutor(executor);
  }

  public contract(
    contractName: string,
    options?: UserContractOptions
  ): InternalBinding<ContractOptions, Contract> {
    const id = options?.id ?? contractName;
    const args = options?.args ?? [];
    const b = new InternalContractBinding(this.getModuleId(), id, {
      contractName,
      args,
    });

    this.addExecutor(new ContractExecutor(b));

    return b;
  }

  public call(
    contract: ContractBinding,
    method: string,
    options?: UserCallOptions
  ): InternalBinding<CallOptions, Tx> {
    const id =
      options?.id ?? `${(contract as InternalContractBinding).id}.${method}`;
    const args = options?.args ?? [];
    const b = new InternalCallBinding(this.getModuleId(), id, {
      contract,
      method,
      args,
    });

    this.addExecutor(new CallExecutor(b));

    return b;
  }

  public useModule<T>(userModule: UserModule<T>): T {
    const knownModuleAndOutput = this._knownModules.get(userModule.id);
    if (knownModuleAndOutput !== undefined) {
      const [knownModule, knownOutput] = knownModuleAndOutput;
      if (userModule === knownModule) {
        return knownOutput;
      } else {
        throw new Error(`Module with id ${userModule.id} already exists`);
      }
    }

    const previousModuleId = this._currentModuleId;
    this._currentModuleId = userModule.id;
    const output = userModule.definition(this);
    this._currentModuleId = previousModuleId;

    this._knownModules.set(userModule.id, [userModule, output]);

    return output;
  }
}

type ModuleDefinition<T> = (m: ModuleBuilder) => T;

export class UserModule<T> {
  public readonly version = 1;

  constructor(
    public readonly id: string,
    public readonly definition: ModuleDefinition<T>
  ) {}
}

export function buildModule<T>(
  moduleId: string,
  moduleDefinition: ModuleDefinition<T>
): UserModule<T> {
  return new UserModule(moduleId, moduleDefinition);
}
