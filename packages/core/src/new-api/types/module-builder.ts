import { ArtifactType, SolidityParamsType } from "../stubs";

import {
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  ContractFuture,
  Future,
  IgnitionModuleResult,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
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
  libraries?: Record<string, ContractFuture<string>>;
}

export interface ContractFromArtifactOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
}

export interface LibraryOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
}

export interface LibraryFromArtifactOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
}

export interface CallOptions {
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

  library<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    options?: LibraryOptions
  ): NamedLibraryDeploymentFuture<LibraryNameT>;

  libraryFromArtifact(
    libraryName: string,
    artifact: ArtifactType,
    options?: LibraryFromArtifactOptions
  ): ArtifactLibraryDeploymentFuture;

  call<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: ContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args?: SolidityParamsType,
    options?: CallOptions
  ): NamedContractCallFuture<ContractNameT, FunctionNameT>;

  staticCall<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: ContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args?: SolidityParamsType,
    options?: CallOptions
  ): NamedStaticCallFuture<ContractNameT, FunctionNameT>;

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
