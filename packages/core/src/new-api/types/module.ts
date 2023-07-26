import { Artifact } from "./artifact";

/**
 * Base argument type that smart contracts can receive in their constructors
 * and functions.
 *
 * @beta
 */
export type BaseArgumentType =
  | number
  | bigint
  | string
  | boolean
  | ContractFuture<string>
  | NamedStaticCallFuture<string, string>
  | ReadEventArgumentFuture
  | RuntimeValue;

/**
 * Argument type that smart contracts can receive in their constructors and functions.
 *
 * @beta
 */
export type ArgumentType =
  | BaseArgumentType
  | ArgumentType[]
  | { [field: string]: ArgumentType };

/**
 * The different future types supported by Ignition.
 *
 * @beta
 */
export enum FutureType {
  NAMED_CONTRACT_DEPLOYMENT = "NAMED_CONTRACT_DEPLOYMENT",
  ARTIFACT_CONTRACT_DEPLOYMENT = "ARTIFACT_CONTRACT_DEPLOYMENT",
  NAMED_LIBRARY_DEPLOYMENT = "NAMED_LIBRARY_DEPLOYMENT",
  ARTIFACT_LIBRARY_DEPLOYMENT = "ARTIFACT_LIBRARY_DEPLOYMENT",
  NAMED_CONTRACT_CALL = "NAMED_CONTRACT_CALL",
  NAMED_STATIC_CALL = "NAMED_STATIC_CALL",
  NAMED_CONTRACT_AT = "NAMED_CONTRACT_AT",
  ARTIFACT_CONTRACT_AT = "ARTIFACT_CONTRACT_AT",
  READ_EVENT_ARGUMENT = "READ_EVENT_ARGUMENT",
  SEND_DATA = "SEND_DATA",
}

/**
 * The unit of execution in an Ignition deploy.
 *
 * @beta
 */
export type Future =
  | NamedContractDeploymentFuture<string>
  | ArtifactContractDeploymentFuture
  | NamedLibraryDeploymentFuture<string>
  | ArtifactLibraryDeploymentFuture
  | NamedContractCallFuture<string, string>
  | NamedStaticCallFuture<string, string>
  | NamedContractAtFuture<string>
  | ArtifactContractAtFuture
  | ReadEventArgumentFuture
  | SendDataFuture;

/**
 * A future representing a contract. Either an existing one or one
 * that will be deployed.
 *
 * @beta
 */
export type ContractFuture<ContractNameT extends string> =
  | NamedContractDeploymentFuture<ContractNameT>
  | ArtifactContractDeploymentFuture
  | NamedLibraryDeploymentFuture<ContractNameT>
  | ArtifactLibraryDeploymentFuture
  | NamedContractAtFuture<ContractNameT>
  | ArtifactContractAtFuture;

/**
 * A future representing a deployment.
 *
 * @beta
 */
export type DeploymentFuture<ContractNameT extends string> =
  | NamedContractDeploymentFuture<ContractNameT>
  | ArtifactContractDeploymentFuture
  | NamedLibraryDeploymentFuture<ContractNameT>
  | ArtifactLibraryDeploymentFuture;

/**
 * A future representing a call. Either a static one or one that modifies contract state
 *
 * @beta
 */
export type FunctionCallFuture<
  ContractNameT extends string,
  FunctionNameT extends string
> =
  | NamedContractCallFuture<ContractNameT, FunctionNameT>
  | NamedStaticCallFuture<ContractNameT, FunctionNameT>;

/**
 * A future that can be resolved to a standard Ethereum address.
 *
 * @beta
 */
export type AddressResolvableFuture =
  | ContractFuture<string>
  | NamedStaticCallFuture<string, string>
  | ReadEventArgumentFuture;

/**
 * A future representing the deployment of a contract that belongs to this project.
 *
 * @beta
 */
export interface NamedContractDeploymentFuture<ContractNameT extends string> {
  type: FutureType.NAMED_CONTRACT_DEPLOYMENT;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  contractName: ContractNameT;
  constructorArgs: ArgumentType[];
  libraries: Record<string, ContractFuture<string>>;
  value: bigint | ModuleParameterRuntimeValue<bigint>;
  from: string | AccountRuntimeValue | undefined;
}

/**
 * A future representing the deployment of a contract that we only know its artifact.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ArtifactContractDeploymentFuture {
  type: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  contractName: string;
  artifact: Artifact;
  constructorArgs: ArgumentType[];
  libraries: Record<string, ContractFuture<string>>;
  value: bigint | ModuleParameterRuntimeValue<bigint>;
  from: string | AccountRuntimeValue | undefined;
}

/**
 * A future representing the deployment of a library that belongs to this project
 *
 * @beta
 */
export interface NamedLibraryDeploymentFuture<LibraryNameT extends string> {
  type: FutureType.NAMED_LIBRARY_DEPLOYMENT;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  contractName: LibraryNameT;
  libraries: Record<string, ContractFuture<string>>;
  from: string | AccountRuntimeValue | undefined;
}

/**
 * A future representing the deployment of a library that we only know its artifact.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ArtifactLibraryDeploymentFuture {
  type: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  contractName: string;
  artifact: Artifact;
  libraries: Record<string, ContractFuture<string>>;
  from: string | AccountRuntimeValue | undefined;
}

/**
 * A future representing the calling of a contract function that modifies on-chain state
 *
 * @beta
 */
export interface NamedContractCallFuture<
  ContractNameT extends string,
  FunctionNameT extends string
> {
  type: FutureType.NAMED_CONTRACT_CALL;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  contract: ContractFuture<ContractNameT>;
  functionName: FunctionNameT;
  args: ArgumentType[];
  value: bigint | ModuleParameterRuntimeValue<bigint>;
  from: string | AccountRuntimeValue | undefined;
}

/**
 * A future representing the static calling of a contract function that does not modify state
 *
 * @beta
 */
export interface NamedStaticCallFuture<
  ContractNameT extends string,
  FunctionNameT extends string
> {
  type: FutureType.NAMED_STATIC_CALL;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  contract: ContractFuture<ContractNameT>;
  functionName: FunctionNameT;
  args: ArgumentType[];
  from: string | AccountRuntimeValue | undefined;
}

/**
 * A future representing a previously deployed contract at a known address that belongs to this project.
 *
 * @beta
 */
export interface NamedContractAtFuture<ContractNameT extends string> {
  type: FutureType.NAMED_CONTRACT_AT;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  contractName: ContractNameT;
  address:
    | string
    | AddressResolvableFuture
    | ModuleParameterRuntimeValue<string>;
}

/**
 * A future representing a previously deployed contract at a known address with a given artifact.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ArtifactContractAtFuture {
  type: FutureType.ARTIFACT_CONTRACT_AT;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  contractName: string;
  address:
    | string
    | AddressResolvableFuture
    | ModuleParameterRuntimeValue<string>;
  artifact: Artifact;
}

/**
 * A future that represents reading an argument of an event emitted by the
 * transaction that executed another future.
 *
 * @beta
 */
export interface ReadEventArgumentFuture {
  type: FutureType.READ_EVENT_ARGUMENT;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  futureToReadFrom: Future;
  eventName: string;
  argumentName: string;
  emitter: ContractFuture<string>;
  eventIndex: number;
}

/**
 * A future that represents sending arbitrary data to the EVM.
 *
 * @beta
 */
export interface SendDataFuture {
  type: FutureType.SEND_DATA;
  id: string;
  module: IgnitionModule;
  dependencies: Set<Future>;
  to: string | AddressResolvableFuture | ModuleParameterRuntimeValue<string>;
  value: bigint | ModuleParameterRuntimeValue<bigint>;
  data: string | undefined;
  from: string | AccountRuntimeValue | undefined;
}

/**
 * Base type of module parameters's values.
 *
 * @beta
 */
export type BaseSolidityParameterType = number | bigint | string | boolean;

/**
 * Types that can be passed across the Solidity ABI boundary.
 *
 * @beta
 */
export type SolidityParameterType =
  | BaseSolidityParameterType
  | SolidityParameterType[]
  | { [field: string]: SolidityParameterType };

/**
 * Type of module parameters's values.
 *
 * @beta
 */
export type ModuleParameterType = SolidityParameterType;

/**
 * The different runtime values supported by Ignition.
 *
 * @beta
 */
export enum RuntimeValueType {
  ACCOUNT = "ACCOUNT",
  MODULE_PARAMETER = "MODULE_PARAMETER",
}

/**
 * A value that's only available during deployment.
 *
 * @beta
 */
export type RuntimeValue =
  | AccountRuntimeValue
  | ModuleParameterRuntimeValue<ModuleParameterType>;

/**
 * A local account.
 *
 * @beta
 */
export interface AccountRuntimeValue {
  type: RuntimeValueType.ACCOUNT;
  accountIndex: number;
}

/**
 * A module parameter.
 *
 * @beta
 */
export interface ModuleParameterRuntimeValue<
  ParamTypeT extends ModuleParameterType
> {
  type: RuntimeValueType.MODULE_PARAMETER;
  moduleId: string;
  name: string;
  defaultValue: ParamTypeT | undefined;
}

/**
 * An object containing the parameters passed into the module.
 *
 * @beta
 */
export interface ModuleParameters {
  [parameterName: string]: ModuleParameterType;
}

/**
 * The results of deploying a module must be a dictionary of contract futures
 *
 * @beta
 */
export interface IgnitionModuleResult<ContractNameT extends string> {
  [name: string]: ContractFuture<ContractNameT>;
}

/**
 * A recipe for deploying and configuring contracts.
 *
 * @beta
 */
export interface IgnitionModule<
  ModuleIdT extends string = string,
  ContractNameT extends string = string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT> = IgnitionModuleResult<ContractNameT>
> {
  id: ModuleIdT; // Unique id
  futures: Set<Future>; // Future created in this module — All of them have to be deployed before returning the results. Note that not all of them are in results
  submodules: Set<IgnitionModule>; // Modules used by this module — Note that there's only one instance of each module
  results: IgnitionModuleResultsT; // The futures returned by the callback passed to buildModule
}
