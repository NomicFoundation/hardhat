import { CallExecutor } from "../executors/CallExecutor";
import { ContractExecutor } from "../executors/ContractExecutor";
import { Executor } from "../executors/Executor";
import { ExistingContractExecutor } from "../executors/ExistingContractExecutor";
import { ParamExecutor } from "../executors/ParamExecutor";
import { ArtifactContractFuture } from "../futures/ArtifactContractFuture";
import { ContractFuture } from "../futures/ContractFuture";
import { ExistingContractFuture } from "../futures/ExistingContractFuture";
import { InternalCallFuture } from "../futures/InternalCallFuture";
import { InternalContractFuture } from "../futures/InternalContractFuture";
import { InternalFuture } from "../futures/InternalFuture";
import { ParamFuture } from "../futures/ParamFuture";
import type {
  CallOptions,
  ContractOptions,
  ExistingContractOptions,
} from "../futures/types";
import type { Artifact, Contract, Tx } from "../types";

import { ExecutionGraph } from "./ExecutionGraph";
import { UserModule } from "./UserModule";
import type {
  ModuleBuilder,
  UserContractOptions,
  UserCallOptions,
  ParamValue,
} from "./types";
import { isArtifact } from "./utils";

export class ModuleBuilderImpl implements ModuleBuilder {
  private _currentModuleId: string | undefined;
  private _executionGraph = new ExecutionGraph();
  private _executors: Executor[] = [];
  private _knownModules: Map<string, [UserModule<any>, any]> = new Map();

  constructor(public chainId: number) {}

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
  ): InternalFuture<ContractOptions, Contract> {
    let future;
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options = givenOptions;

      const id = options?.id ?? contractName;
      const args = options?.args ?? [];
      const libraries = options?.libraries ?? {};

      future = new ArtifactContractFuture(this.getModuleId(), id, {
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

      future = new InternalContractFuture(this.getModuleId(), id, {
        contractName,
        args,
        libraries,
      });
    }

    this.addExecutor(new ContractExecutor(future));

    return future;
  }

  public contractAt(
    contractName: string,
    address: string,
    abi: any[]
  ): InternalFuture<ExistingContractOptions, Contract> {
    const id = contractName;

    const future = new ExistingContractFuture(this.getModuleId(), id, {
      contractName,
      address,
      abi,
    });

    this.addExecutor(new ExistingContractExecutor(future));

    return future;
  }

  public call(
    contract: ContractFuture,
    method: string,
    options?: UserCallOptions
  ): InternalFuture<CallOptions, Tx> {
    const id =
      options?.id ?? `${(contract as InternalContractFuture).id}.${method}`;
    const args = options?.args ?? [];
    const b = new InternalCallFuture(this.getModuleId(), id, {
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

  public getParam(paramName: string): ParamFuture {
    const id = paramName;

    const future = new ParamFuture(this.getModuleId(), id, { paramName });

    this.addExecutor(new ParamExecutor(future));

    return future;
  }

  public getOptionalParam(
    paramName: string,
    defaultValue: ParamValue
  ): ParamFuture {
    const id = paramName;

    const future = new ParamFuture(this.getModuleId(), id, {
      paramName,
      defaultValue,
    });

    this.addExecutor(new ParamExecutor(future));

    return future;
  }
}
