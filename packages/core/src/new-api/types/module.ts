import { ArtifactType, SolidityParamType, SolidityParamsType } from "../stubs";

/**
 * The different future types supported by Ignition.
 *
 * @beta
 */
export enum FutureType {
  NAMED_CONTRACT_DEPLOYMENT,
  ARTIFACT_CONTRACT_DEPLOYMENT,
  NAMED_LIBRARY_DEPLOYMENT,
  ARTIFACT_LIBRARY_DEPLOYMENT,
  NAMED_CONTRACT_CALL,
  NAMED_STATIC_CALL,
  NAMED_CONTRACT_AT,
  ARTIFACT_CONTRACT_AT,
  READ_EVENT_ARGUMENT,
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
  | ReadEventArgumentFuture;

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

interface BaseFuture {
  id: string; // Unique identifier of a future. My current proposal "<module-id>:<extra identifier created by each action>"

  type: FutureType;

  // The following fields define the deployment graph

  // TODO: Not convinced about this circular dependency between module and future.
  module: IgnitionModule;

  // Any future that needs to be executed before this one
  dependencies: Set<Future>;
}

interface BaseContractFuture<ContractNameT extends string> extends BaseFuture {
  contractName: ContractNameT;
}

interface BaseFunctionCallFuture<FunctionNameT extends string>
  extends BaseFuture {
  functionName: FunctionNameT;
}

/**
 * A future representing the deployment of a contract that belongs to this project.
 *
 * @beta
 */
export interface NamedContractDeploymentFuture<ContractNameT extends string>
  extends BaseContractFuture<ContractNameT> {
  type: FutureType.NAMED_CONTRACT_DEPLOYMENT;
  constructorArgs: SolidityParamsType;
  libraries: Record<string, ContractFuture<string>>;
  value: bigint;
  from: string | undefined;
}

/**
 * A future representing the deployment of a contract that we only know its artifact.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ArtifactContractDeploymentFuture
  extends BaseContractFuture<string> {
  type: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT;
  artifact: ArtifactType;
  constructorArgs: SolidityParamsType;
  libraries: Record<string, ContractFuture<string>>;
  value: bigint;
  from: string | undefined;
}

/**
 * A future representing the deployment of a library that belongs to this project
 *
 * @beta
 */
export interface NamedLibraryDeploymentFuture<LibraryNameT extends string>
  extends BaseContractFuture<LibraryNameT> {
  type: FutureType.NAMED_LIBRARY_DEPLOYMENT;
  libraries: Record<string, ContractFuture<string>>;
  from: string | undefined;
}

/**
 * A future representing the deployment of a library that we only know its artifact.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ArtifactLibraryDeploymentFuture
  extends BaseContractFuture<string> {
  type: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT;
  artifact: ArtifactType;
  libraries: Record<string, ContractFuture<string>>;
  from: string | undefined;
}

/**
 * A future representing the calling of a contract function that modifies on-chain state
 *
 * @beta
 */
export interface NamedContractCallFuture<
  ContractNameT extends string,
  FunctionNameT extends string
> extends BaseFunctionCallFuture<FunctionNameT> {
  type: FutureType.NAMED_CONTRACT_CALL;
  contract: ContractFuture<ContractNameT>;
  args: SolidityParamsType;
  value: bigint;
  from: string | undefined;
}

/**
 * A future representing the static calling of a contract function that does not modify state
 *
 * @beta
 */
export interface NamedStaticCallFuture<
  ContractNameT extends string,
  FunctionNameT extends string
> extends BaseFunctionCallFuture<FunctionNameT> {
  type: FutureType.NAMED_STATIC_CALL;
  contract: ContractFuture<ContractNameT>;
  args: SolidityParamsType;
  from: string | undefined;
}

/**
 * A future representing a previously deployed contract at a known address that belongs to this project.
 *
 * @beta
 */
export interface NamedContractAtFuture<ContractNameT extends string>
  extends BaseContractFuture<ContractNameT> {
  type: FutureType.NAMED_CONTRACT_AT;

  address: string | NamedStaticCallFuture<string, string>;
}

/**
 * A future representing a previously deployed contract at a known address with a given artifact.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ArtifactContractAtFuture extends BaseContractFuture<string> {
  type: FutureType.ARTIFACT_CONTRACT_AT;
  address: string | NamedStaticCallFuture<string, string>;
  artifact: ArtifactType;
}

/**
 * A future that represents reading an argument of an event emitted by the
 * transaction that executed another future.
 *
 * @beta
 */
export interface ReadEventArgumentFuture extends BaseFuture {
  type: FutureType.READ_EVENT_ARGUMENT;
  futureToReadFrom: Future;
  eventName: string;
  argumentName: string;
  emitter: ContractFuture<string>;
  eventIndex: number;
}

/**
 * An object containing the parameters passed into the module.
 *
 * @beta
 */
export interface ModuleParameters {
  [parameterName: string]: SolidityParamType;
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
