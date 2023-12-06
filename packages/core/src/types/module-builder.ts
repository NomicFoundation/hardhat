import { Abi, Artifact } from "./artifact";
import {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  CallableContractFuture,
  ContractAtFuture,
  ContractCallFuture,
  ContractDeploymentFuture,
  ContractFuture,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  LibraryDeploymentFuture,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  ReadEventArgumentFuture,
  SendDataFuture,
  StaticCallFuture,
} from "./module";

/**
 * The options for a `contract` deployment.
 *
 * @beta
 */
export interface ContractOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
  value?:
    | bigint
    | ModuleParameterRuntimeValue<bigint>
    | StaticCallFuture<string, string>
    | ReadEventArgumentFuture;
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
 * The options for a `call` call.
 *
 * @beta
 */
export interface CallOptions {
  id?: string;
  after?: Future[];
  value?:
    | bigint
    | ModuleParameterRuntimeValue<bigint>
    | StaticCallFuture<string, string>
    | ReadEventArgumentFuture;
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
  ): NamedArtifactContractDeploymentFuture<ContractNameT>;

  contract<const AbiT extends Abi>(
    contractName: string,
    artifact: Artifact<AbiT>,
    args?: ArgumentType[],
    options?: ContractOptions
  ): ContractDeploymentFuture<AbiT>;

  library<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    options?: LibraryOptions
  ): NamedArtifactLibraryDeploymentFuture<LibraryNameT>;

  library<const AbiT extends Abi>(
    libraryName: string,
    artifact: Artifact<AbiT>,
    options?: LibraryOptions
  ): LibraryDeploymentFuture<AbiT>;

  call<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args?: ArgumentType[],
    options?: CallOptions
  ): ContractCallFuture<ContractNameT, FunctionNameT>;

  staticCall<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args?: ArgumentType[],
    nameOrIndex?: string | number,
    options?: StaticCallOptions
  ): StaticCallFuture<ContractNameT, FunctionNameT>;

  contractAt<ContractNameT extends string>(
    contractName: ContractNameT,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options?: ContractAtOptions
  ): NamedArtifactContractAtFuture<ContractNameT>;

  contractAt<const AbiT extends Abi>(
    contractName: string,
    artifact: Artifact<AbiT>,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options?: ContractAtOptions
  ): ContractAtFuture<AbiT>;

  readEventArgument(
    futureToReadFrom:
      | NamedArtifactContractDeploymentFuture<string>
      | ContractDeploymentFuture
      | SendDataFuture
      | ContractCallFuture<string, string>,
    eventName: string,
    nameOrIndex: string | number,
    options?: ReadEventArgumentOptions
  ): ReadEventArgumentFuture;

  send(
    id: string,
    to:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>
      | AccountRuntimeValue,
    value?: bigint | ModuleParameterRuntimeValue<bigint>,
    data?: string,
    options?: SendDataOptions
  ): SendDataFuture;

  useModule<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    ignitionSubmodule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >
  ): IgnitionModuleResultsT;
}
