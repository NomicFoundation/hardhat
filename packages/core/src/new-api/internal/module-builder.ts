import assert from "assert";

import { ArtifactType, SolidityParamsType } from "../stubs";
import {
  ArtifactContractDeploymentFuture,
  IgnitionModule,
  IgnitionModuleResult,
  NamedContractDeploymentFuture,
} from "../types/module";
import { IgnitionModuleBuilder } from "../types/module-builder";

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
  constructor(
    private readonly _module: IgnitionModuleImplementation<
      ModuleIdT,
      ResultsContractNameT,
      IgnitionModuleResultsT
    >
  ) {}

  public contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args: SolidityParamsType = [],
    id = contractName
  ): NamedContractDeploymentFuture<ContractNameT> {
    // Some things that should be done here:
    //   - create the future. - done
    //   - add it to the set of futures of the module - done
    //   - add any dependency (e.g. futures in `args` or `after`)
    //   - validate that the id is not repeated
    const futureId = `${this._module.id}:${id}`;

    const future = new NamedContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args
    );

    for (const arg of args.filter(isFuture)) {
      future.dependencies.add(arg);
    }

    this._module.futures.add(future);

    return future;
  }

  public contractFromArtifact(
    contractName: string,
    artifact: ArtifactType,
    args: SolidityParamsType,
    id = contractName
  ): ArtifactContractDeploymentFuture {
    // See `contract`
    const futureId = `${this._module.id}:${id}`;
    const future = new ArtifactContractDeploymentFutureImplementation(
      futureId,
      this._module,
      contractName,
      args,
      artifact
    );

    this._module.futures.add(future);

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
}
