import { Artifact } from "./artifact";
import {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  ArtifactContractAtFuture,
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  ContractFuture,
  Future,
  IgnitionModuleResult,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  NamedContractAtFuture,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
  ReadEventArgumentFuture,
  SendDataFuture,
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
  value?: bigint;
  from?: string | AccountRuntimeValue;
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
  value?: bigint;
  from?: string | AccountRuntimeValue;
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
  from?: string | AccountRuntimeValue;
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
  from?: string | AccountRuntimeValue;
}

/**
 * The options for a `call` call.
 *
 * @beta
 */
export interface CallOptions {
  id?: string;
  after?: Future[];
  value?: bigint;
  from?: string | AccountRuntimeValue;
}

/**
 * The options for a `staticCall` call.
 *
 * @beta
 */
export interface StaticCallOptions {
  id?: string;
  after?: Future[];
  from?: string | AccountRuntimeValue;
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
 * The options for a `readEventArgument` call.
 *
 * @beta
 */
export interface ReadEventArgumentOptions {
  /**
   * The future id.
   */
  id?: string;

  /**
   * The contract that emitted the event. If omitted the contract associated with
   * the future you are reading the event from will be used.
   */
  emitter?: ContractFuture<string>;

  /**
   * If multiple events with the same name were emitted by the contract, you can
   * choose which of those to read from by specifying its index (0-indexed).
   */
  eventIndex?: number;
}

/**
 * The options for a `send` call.
 *
 * @beta
 */
export interface SendDataOptions {
  id?: string;
  after?: Future[];
  from?: string | AccountRuntimeValue;
}

/**
 * The build api for configuring a deployment within a module.
 *
 * @beta
 */
export interface IgnitionModuleBuilder {
  getAccount(accountIndex: number): AccountRuntimeValue;

  getParameter<ParamTypeT extends ModuleParameterType = any>(
    parameterName: string,
    defaultValue?: ParamTypeT
  ): ModuleParameterRuntimeValue<ParamTypeT>;

  contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args?: ArgumentType[],
    options?: ContractOptions
  ): NamedContractDeploymentFuture<ContractNameT>;

  contractFromArtifact(
    contractName: string,
    artifact: Artifact,
    args?: ArgumentType[],
    options?: ContractFromArtifactOptions
  ): ArtifactContractDeploymentFuture;

  library<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    options?: LibraryOptions
  ): NamedLibraryDeploymentFuture<LibraryNameT>;

  libraryFromArtifact(
    libraryName: string,
    artifact: Artifact,
    options?: LibraryFromArtifactOptions
  ): ArtifactLibraryDeploymentFuture;

  call<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: ContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args?: ArgumentType[],
    options?: CallOptions
  ): NamedContractCallFuture<ContractNameT, FunctionNameT>;

  staticCall<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: ContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args?: ArgumentType[],
    options?: StaticCallOptions
  ): NamedStaticCallFuture<ContractNameT, FunctionNameT>;

  contractAt<ContractNameT extends string>(
    contractName: ContractNameT,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options?: ContractAtOptions
  ): NamedContractAtFuture<ContractNameT>;

  contractAtFromArtifact(
    contractName: string,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    artifact: Artifact,
    options?: ContractAtOptions
  ): ArtifactContractAtFuture;

  readEventArgument(
    futureToReadFrom:
      | NamedContractDeploymentFuture<string>
      | ArtifactContractDeploymentFuture
      | NamedContractCallFuture<string, string>,
    eventName: string,
    argumentName: string,
    options?: ReadEventArgumentOptions
  ): ReadEventArgumentFuture;

  send(
    id: string,
    to: string | AddressResolvableFuture,
    value?: bigint,
    data?: string,
    options?: SendDataOptions
  ): SendDataFuture;

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
