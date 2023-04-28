import assert from "assert";

import { IgnitionValidationError } from "../../errors";
import { ArtifactType, SolidityParamsType } from "../stubs";
import {
  ArtifactContractDeploymentFuture,
  IgnitionModule,
  IgnitionModuleResult,
  NamedContractDeploymentFuture,
} from "../types/module";
import {
  ContractFromArtifactOptions,
  ContractOptions,
  IgnitionModuleBuilder,
} from "../types/module-builder";

import {
  ArtifactContractDeploymentFutureImplementation,
  IgnitionModuleImplementation,
  NamedContractDeploymentFutureImplementation,
} from "./module";
import { isFuture } from "./utils";

export class IgnitionModuleBuilderImplementation<
  ModuleIdT extends string,
  ResultsContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ResultsContractNameT>
> implements IgnitionModuleBuilder
{
  private _futureIds: Set<string>;

  constructor(
    private readonly _module: IgnitionModuleImplementation<
      ModuleIdT,
      ResultsContractNameT,
      IgnitionModuleResultsT
    >
  ) {
    this._futureIds = new Set<string>();
  }

  public contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args: SolidityParamsType = [],
    options: ContractOptions = {}
  ): NamedContractDeploymentFuture<ContractNameT> {
    const id = options.id ?? contractName;
    const futureId = `${this._module.id}:${id}`;

    this._assertUniqueContractId(futureId);

    const future = new NamedContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args
    );

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    this._module.futures.add(future);

    return future;
  }

  public contractFromArtifact(
    contractName: string,
    artifact: ArtifactType,
    args: SolidityParamsType = [],
    options: ContractFromArtifactOptions = {}
  ): ArtifactContractDeploymentFuture {
    const id = options.id ?? contractName;
    const futureId = `${this._module.id}:${id}`;

    this._assertUniqueContractId(futureId);

    const future = new ArtifactContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args,
      artifact
    );

    this._module.futures.add(future);

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    for (const afterFuture of (options.after ?? []).filter(isFuture)) {
      future.dependencies.add(afterFuture);
    }

    return future;
  }

  public useModule<
    SubmoduleModuleIdT extends string,
    SubmoduleContractNameT extends string,
    SubmoduleIgnitionModuleResultsT extends IgnitionModuleResult<SubmoduleContractNameT>
  >(
    ignitionModule: IgnitionModule<
      SubmoduleModuleIdT,
      SubmoduleContractNameT,
      SubmoduleIgnitionModuleResultsT
    >
  ): SubmoduleIgnitionModuleResultsT {
    assert(
      ignitionModule !== undefined,
      "Trying to use `undefined` as submodule. Make sure you don't have a circular dependency of modules."
    );

    // Some things that should be done here:
    //   - Keep track of the submodule
    //   - return the submodule's results
    //
    this._module.submodules.add(ignitionModule);

    return ignitionModule.results;
  }

  private _assertUniqueContractId(futureId: string) {
    if (this._futureIds.has(futureId)) {
      const validationError = new IgnitionValidationError(
        `Contracts must have unique ids, ${futureId} has already been used, ensure the id passed is unique \`m.contract("MyContract", [], { id: "MyId"})\``
      );

      // Improve the stack trace to stop on module api level
      Error.captureStackTrace(validationError, this.contract);

      throw validationError;
    }

    this._futureIds.add(futureId);
  }
}
