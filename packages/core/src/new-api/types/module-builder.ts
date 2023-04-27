import { ArtifactType, SolidityParamsType } from "../stubs";

import {
  ArtifactContractDeploymentFuture,
  IgnitionModule,
  IgnitionModuleResult,
  NamedContractDeploymentFuture,
} from "./module";

export interface IgnitionModuleBuilder {
  contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args?: SolidityParamsType
  ): NamedContractDeploymentFuture<ContractNameT>;

  contractFromArtifact(
    contractName: string,
    artifact: ArtifactType,
    args: SolidityParamsType
  ): ArtifactContractDeploymentFuture;

  useModule<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >
  ): IgnitionModuleResultsT;
}
