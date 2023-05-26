import { Artifact } from "./artifact";
import { FutureType, IgnitionModule, IgnitionModuleResult } from "./module";

/**
 * A serialized bigint.
 *
 * @beta
 */
export interface SerializedBigInt {
  _kind: "bigint";
  value: string;
}

/**
 * The serialized version of BaseArgumentType
 *
 * @beta
 */
export type SerializedBaseArgumentType =
  | number
  | SerializedBigInt
  | string
  | boolean
  | FutureToken;

/**
 * The serialized version of ArgumentType
 *
 * @beta
 */
export type SerializedArgumentType =
  | SerializedBaseArgumentType
  | SerializedArgumentType[]
  | { [field: string]: SerializedArgumentType };

/**
 * In serialized form a pointer to a future stored at the top level
 * within the module.
 *
 * @beta
 */
export interface FutureToken {
  futureId: string;
  _kind: "FutureToken";
}

/**
 * In serialized form a pointer to a module stored at the top level
 * within the deployment.
 *
 * @beta
 */
export interface ModuleToken {
  moduleId: string;
  _kind: "ModuleToken";
}

/**
 * The base of the different serialized futures.
 *
 * @beta
 */
export interface BaseSerializedFuture {
  id: string;
  type: FutureType;
  dependencies: FutureToken[];
  moduleId: string;
}

/**
 * The serialized version of the NamedContractDeploymentFuture.
 *
 * @beta
 */
export interface SerializedNamedContractDeploymentFuture
  extends BaseSerializedFuture {
  type: FutureType.NAMED_CONTRACT_DEPLOYMENT;
  contractName: string;
  constructorArgs: SerializedArgumentType[];
  libraries: SerializedLibraries;
  value: SerializedBigInt;
  from: string | SerializedAccountRuntimeValue | undefined;
}

/**
 * The serialized version of the ArtifactContractDeploymentFuture.
 *
 * @beta
 */
export interface SerializedArtifactContractDeploymentFuture
  extends BaseSerializedFuture {
  type: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT;
  contractName: string;
  constructorArgs: SerializedArgumentType[];
  artifact: Artifact;
  libraries: SerializedLibraries;
  value: SerializedBigInt;
  from: string | SerializedAccountRuntimeValue | undefined;
}

/**
 * The serialized version of the NamedLibraryDeploymentFuture.
 *
 * @beta
 */
export interface SerializedNamedLibraryDeploymentFuture
  extends BaseSerializedFuture {
  type: FutureType.NAMED_LIBRARY_DEPLOYMENT;
  contractName: string;
  libraries: SerializedLibraries;
  from: string | SerializedAccountRuntimeValue | undefined;
}

/**
 * The serialized version of the ArtifactLibraryDeploymentFuture.
 *
 * @beta
 */
export interface SerializedArtifactLibraryDeploymentFuture
  extends BaseSerializedFuture {
  type: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT;
  contractName: string;
  artifact: Artifact;
  libraries: SerializedLibraries;
  from: string | SerializedAccountRuntimeValue | undefined;
}

/**
 * The serialized version of NamedContractCallFuture.
 *
 * @beta
 */
export interface SerializedNamedContractCallFuture
  extends BaseSerializedFuture {
  type: FutureType.NAMED_CONTRACT_CALL;
  functionName: string;
  contract: FutureToken;
  args: SerializedArgumentType[];
  value: SerializedBigInt;
  from: string | SerializedAccountRuntimeValue | undefined;
}

/**
 * The serialized version of NamedStaticCallFuture.
 *
 * @beta
 */
export interface SerializedNamedStaticCallFuture extends BaseSerializedFuture {
  type: FutureType.NAMED_STATIC_CALL;
  functionName: string;
  contract: FutureToken;
  args: SerializedArgumentType[];
  from: string | SerializedAccountRuntimeValue | undefined;
}

/**
 * The serialized version of NamedContractAtFuture.
 *
 * @beta
 */
export interface SerializedNamedContractAtFuture extends BaseSerializedFuture {
  type: FutureType.NAMED_CONTRACT_AT;
  contractName: string;
  address: string | FutureToken;
}

/**
 * The serialized version of ArtifactContractAtFuture.
 *
 * @beta
 */
export interface SerializedArtifactContractAtFuture
  extends BaseSerializedFuture {
  type: FutureType.ARTIFACT_CONTRACT_AT;
  contractName: string;
  address: string | FutureToken;
  artifact: Artifact;
}

/**
 * The serialized version of ReadEventArgumentFuture.
 *
 * @beta
 */
export interface SerializedReadEventArgumentFuture
  extends BaseSerializedFuture {
  type: FutureType.READ_EVENT_ARGUMENT;
  futureToReadFrom: FutureToken;
  eventName: string;
  argumentName: string;
  emitter: FutureToken;
  eventIndex: number;
}

/**
 * The serialized version of ReadEventArgumentFuture.
 *
 * @beta
 */
export interface SerializedSendDataFuture extends BaseSerializedFuture {
  type: FutureType.SEND_DATA;
  to: string | FutureToken;
  value: SerializedBigInt;
  data: string | undefined;
  from: string | SerializedAccountRuntimeValue | undefined;
}

/**
 * The srialized version of RuntimeValue.
 *
 * @beta
 */
export type SerializedRuntimeValue = SerializedAccountRuntimeValue;

/**
 * The serialized version of AccountRuntimeValue.
 *
 * @beta
 */
export interface SerializedAccountRuntimeValue {
  _kind: "AccountRuntimeValue";
  accountIndex: number;
}

/**
 * The details of a deployment that will be used in the UI.
 *
 * @beta
 */
export interface StoredDeployment {
  details: {
    networkName: string;
    chainId: number;
  };
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}

// Serialized Deployments

/**
 * The serialized version of a complete deployment, combining the
 * chain details with the module to be deployed.
 *
 * @beta
 */
export interface SerializedStoredDeployment {
  details: {
    networkName: string;
    chainId: number;
  };
  startModule: string;
  modules: {
    [key: string]: SerializedStoredModule;
  };
}

/**
 * The serialized version of an Ignition module.
 *
 * @beta
 */
export interface SerializedStoredModule {
  id: string;
  submodules: ModuleToken[];
  futures: SerializedStoredFutures;
  results: SerializedStoredResults;
}

/**
 * Serialized versions of a modules used submodules.
 *
 * @beta
 */
export interface SerializedStoredSubmodules {
  [key: string]: SerializedStoredModule;
}

/**
 * The serialized futures that are executed in deploying a module.
 *
 * @beta
 */
export interface SerializedStoredFutures {
  [key: string]: SerializedFuture;
}

/**
 * The serialized results of a module.
 *
 * @beta
 */
export interface SerializedStoredResults {
  [key: string]: FutureToken;
}

/**
 * The serialized libraries, where each library
 * has been replaced by a token.
 *
 * @beta
 */
export interface SerializedLibraries {
  [key: string]: FutureToken;
}

/**
 * The set of serialized future types
 *
 * @beta
 */
export type SerializedFuture =
  | SerializedNamedContractDeploymentFuture
  | SerializedArtifactContractDeploymentFuture
  | SerializedNamedLibraryDeploymentFuture
  | SerializedArtifactLibraryDeploymentFuture
  | SerializedNamedContractCallFuture
  | SerializedNamedStaticCallFuture
  | SerializedNamedContractAtFuture
  | SerializedArtifactContractAtFuture
  | SerializedReadEventArgumentFuture
  | SerializedSendDataFuture;
