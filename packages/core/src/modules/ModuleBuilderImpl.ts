import { ArtifactContractBinding } from "../bindings/ArtifactContractBinding";
import { ContractBinding } from "../bindings/ContractBinding";
import { ExistingContractBinding } from "../bindings/ExistingContractBinding";
import { InternalBinding } from "../bindings/InternalBinding";
import { InternalCallBinding } from "../bindings/InternalCallBinding";
import { InternalContractBinding } from "../bindings/InternalContractBinding";
import type {
  CallOptions,
  ContractOptions,
  ExistingContractOptions,
} from "../bindings/types";
import { CallExecutor } from "../executors/CallExecutor";
import { ContractExecutor } from "../executors/ContractExecutor";
import { Executor } from "../executors/Executor";
import { ExistingContractExecutor } from "../executors/ExistingContractExecutor";
import type { Artifact, Contract, Tx } from "../types";

import { ExecutionGraph } from "./ExecutionGraph";
import { UserModule } from "./UserModule";
import type {
  ModuleBuilder,
  UserContractOptions,
  UserCallOptions,
} from "./types";
import { isArtifact } from "./utils";

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
    artifactOrOptions?: Artifact | UserContractOptions,
    givenOptions?: UserContractOptions
  ): InternalBinding<ContractOptions, Contract> {
    let binding;
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options = givenOptions;

      const id = options?.id ?? contractName;
      const args = options?.args ?? [];
      const libraries = options?.libraries ?? {};

      binding = new ArtifactContractBinding(this.getModuleId(), id, {
        contractName,
        args,
        libraries,
        artifact,
      });
    } else {
      const options = artifactOrOptions;

      const id = options?.id ?? contractName;
      const args = options?.args ?? [];
      const libraries = options?.libraries ?? {};

      binding = new InternalContractBinding(this.getModuleId(), id, {
        contractName,
        args,
        libraries,
      });
    }

    this.addExecutor(new ContractExecutor(binding));

    return binding;
  }

  public contractAt(
    contractName: string,
    address: string,
    abi: any[]
  ): InternalBinding<ExistingContractOptions, Contract> {
    const id = contractName;

    const binding = new ExistingContractBinding(this.getModuleId(), id, {
      contractName,
      address,
      abi,
    });

    this.addExecutor(new ExistingContractExecutor(binding));

    return binding;
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
