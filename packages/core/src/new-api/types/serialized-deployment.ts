import { ArtifactType } from "../stubs";

import { FutureType, IgnitionModule, IgnitionModuleResult } from "./module";

/**
 * The serialized version of a Solidity method parameter.
 *
 * @beta
 */
export type SerializedSolidityParamType = number | string | FutureToken;

/**
 * An array of serialized params.
 *
 * @beta
 */
export type SerializedSolidityParamsType = SerializedSolidityParamType[];

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
  constructorArgs: SerializedSolidityParamsType;
  libraries: SerializedLibraries;
  value: string;
  from: string | undefined;
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
  constructorArgs: SerializedSolidityParamsType;
  artifact: ArtifactType;
  libraries: SerializedLibraries;
  value: string;
  from: string | undefined;
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
  from: string | undefined;
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
  artifact: ArtifactType;
  libraries: SerializedLibraries;
  from: string | undefined;
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
  args: SerializedSolidityParamsType;
  value: string;
  from: string | undefined;
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
  args: SerializedSolidityParamsType;
  from: string | undefined;
}

/**
 * The serialized version of ContractAtFuture.
 *
 * @beta
 */
export interface SerializedContractAtFuture extends BaseSerializedFuture {
  type: FutureType.CONTRACT_AT;
  contractName: string;
  address: string;
  artifact: ArtifactType;
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
  | SerializedContractAtFuture;
