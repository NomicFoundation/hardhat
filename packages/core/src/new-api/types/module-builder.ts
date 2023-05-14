import { ArtifactType, SolidityParamsType } from "../stubs";

import {
  ArtifactContractDeploymentFuture,
  Future,
  IgnitionModuleResult,
  NamedContractDeploymentFuture,
} from "./module";

export interface IgnitionModuleDefinition<
  ModuleIdT extends string,
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
> {
  id: ModuleIdT;
  moduleDefintionFunction: (m: IgnitionModuleBuilder) => IgnitionModuleResultsT;
}

export interface ContractOptions {
  id?: string;
  after?: Future[];
}

export interface ContractFromArtifactOptions {
  id?: string;
  after?: Future[];
}

export interface IgnitionModuleBuilder {
  contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args?: SolidityParamsType,
    options?: ContractOptions
  ): NamedContractDeploymentFuture<ContractNameT>;

  contractFromArtifact(
    contractName: string,
    artifact: ArtifactType,
    args?: SolidityParamsType,
    options?: ContractFromArtifactOptions
  ): ArtifactContractDeploymentFuture;

  useModule<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    submoduleDefinition: IgnitionModuleDefinition<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >
  ): IgnitionModuleResultsT;
}
