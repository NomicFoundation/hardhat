import { ArtifactType, SolidityParamsType } from "../stubs";

import {
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  ContractAtFuture,
  ContractFuture,
  Future,
  IgnitionModuleResult,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
} from "./module";

/**
 * The definition used to construct an Ignition module.
 *
 * @beta
 */
export interface IgnitionModuleDefinition<
  ModuleIdT extends string,
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
> {
  id: ModuleIdT;
  moduleDefintionFunction: (m: IgnitionModuleBuilder) => IgnitionModuleResultsT;
}

/**
 * The options for a `ContractOptions` call.
 *
 * @beta
 */
export interface ContractOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
}

/**
 * The options for a `contractFromArtifact` call.
 *
 * @beta
 */
export interface ContractFromArtifactOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
}

/**
 * The options for a `library` call.
 *
 * @beta
 */
export interface LibraryOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
}

/**
 * The options for a `libraryFromArtifact` call.
 *
 * @beta
 */
export interface LibraryFromArtifactOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
}

/**
 * The options for a `call` call.
 *
 * @beta
 */
export interface CallOptions {
  id?: string;
  after?: Future[];
}

/**
 * The options for a `staticCall` call.
 *
 * @beta
 */
export interface StaticCallOptions {
  id?: string;
  after?: Future[];
}

/**
 * The options for a `contractAt` call.
 *
 * @beta
 */
export interface ContractAtOptions {
  id?: string;
  after?: Future[];
}

/**
 * The build api for configuring a deployment within a module.
 *
 * @beta
 */
export interface IgnitionModuleBuilder {
  chainId: number;
  accounts: string[];

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
    options?: StaticCallOptions
  ): NamedStaticCallFuture<ContractNameT, FunctionNameT>;

  contractAt(
    contractName: string,
    address: string,
    artifact: ArtifactType,
    options?: ContractAtOptions
  ): ContractAtFuture;

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
