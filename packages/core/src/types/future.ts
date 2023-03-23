import type { Artifact } from "./hardhat";

/**
 * A future representing the address of a contract deployed using the
 * Hardhat Artifact system.
 *
 * @internal
 */
export interface HardhatContract {
  vertexId: number;
  label: string;
  type: "contract";
  subtype: "hardhat";
  contractName: string;
  _future: true;
}

/**
 * A future representing the value of a contract deployed using a given
 * artifact.
 *
 * @internal
 */
export interface ArtifactContract {
  vertexId: number;
  label: string;
  type: "contract";
  subtype: "artifact";
  artifact: Artifact;
  _future: true;
}

/**
 * A future representing the address of an already deployed contract.
 *
 * @internal
 */
export interface DeployedContract {
  vertexId: number;
  label: string;
  type: "contract";
  subtype: "deployed";
  abi: any[];
  address: string | EventParamFuture;
  _future: true;
}

/**
 * A future representing the address of a library deployed using Hardhat's
 * artifact system.
 *
 * @internal
 */
export interface HardhatLibrary {
  vertexId: number;
  label: string;
  type: "library";
  subtype: "hardhat";
  libraryName: string;
  _future: true;
}

/**
 * A future representing the address of a library deployed using a given
 * artifact.
 *
 * @internal
 */
export interface ArtifactLibrary {
  vertexId: number;
  label: string;
  type: "library";
  subtype: "artifact";
  artifact: Artifact;
  _future: true;
}

/**
 * A future representing an on-chain smart contract method invocation.
 *
 * @internal
 */
export interface ContractCall {
  vertexId: number;
  label: string;
  type: "call";
  _future: true;
}

/**
 * A future representing an on-chain Ethereum event.
 *
 * @internal
 */
export interface EventFuture {
  vertexId: number;
  label: string;
  type: "await";
  subtype: "event";
  _future: true;
  params: EventParams;
}

/**
 * A future representing the sending of Eth to a contract/address.
 *
 * @internal
 */
export interface SendFuture {
  vertexId: number;
  label: string;
  type: "send";
  subtype: "eth";
  _future: true;
}

/**
 * A mapping of named parameter labels to future parameter values.
 *
 * @internal
 */
export interface EventParams {
  [eventParam: string]: EventParamFuture;
}

/**
 * A future representing a parameter of an on-chain Ethereum event.
 *
 * @internal
 */
export interface EventParamFuture {
  vertexId: number;
  label: string;
  type: "eventParam";
  subtype: string;
  _future: true;
}

/**
 * A value that can be used as a Module parameter.
 *
 * @internal
 */
export type ParameterValue = string | number | DeploymentGraphFuture;

/**
 * A future representing a parameter value that _must_ be provided to the module
 * for it to execute.
 *
 * @internal
 */
export interface RequiredParameter {
  label: string;
  type: "parameter";
  subtype: "required";
  scope: string;
  _future: true;
}

/**
 * A future representing a parameter value that _may_ be provided to the module
 * for it to execute. In its absence the `defaultValue` will be used.
 *
 * @internal
 */
export interface OptionalParameter {
  label: string;
  type: "parameter";
  subtype: "optional";
  defaultValue: ParameterValue;
  scope: string;
  _future: true;
}

/**
 * A future representing a virtual node used for grouping other actions.
 *
 * @internal
 */
export interface Virtual {
  vertexId: number;
  label: string;
  type: "virtual";
  _future: true;
}

/**
 * A future that allows the splitting of dependency from value resolution.
 * A proxy can stand for the value of another future, but point its
 * dependency (the proxy) on a different.
 *
 * This allows the wrapping of a returned Contract future so that a
 * dependency on it can be made to depend on the Virtual vertex that
 * represents the entire submodule.
 *
 * @internal
 */
export interface ProxyFuture {
  label: string;
  type: "proxy";
  proxy: DependableFuture;
  value: DependableFuture;
  _future: true;
}

/**
 * A future representing an artifact deployment or an already existing deployed
 * contract.
 *
 * @privateRemarks
 * TODO: is this needed?
 *
 * @internal
 */
export type ArtifactFuture = ArtifactContract | DeployedContract;

/**
 * A future representing the address of a deployed Contract.
 *
 * @internal
 */
export type ContractFuture =
  | HardhatContract
  | ArtifactContract
  | DeployedContract;

/**
 * The future representing the address of a deployed library.
 *
 * @internal
 */
export type LibraryFuture = HardhatLibrary | ArtifactLibrary;

/**
 * The future representing the value of calling a smart contract method.
 *
 * @internal
 */
export type CallableFuture = ContractFuture | LibraryFuture;

/**
 * A future value from an on-chain action that.
 *
 * @internal
 */
export type DependableFuture =
  | CallableFuture
  | ContractCall
  | Virtual
  | ProxyFuture
  | EventFuture
  | SendFuture;

/**
 * A future value representing an Ethereum address.
 *
 * @internal
 */
export type AddressResolvable =
  | string
  | ParameterFuture
  | EventParamFuture
  | ContractFuture;

/**
 * The future value of a passed parameter to a Module.
 *
 * @internal
 */
export type ParameterFuture = RequiredParameter | OptionalParameter;

/**
 * The future values usable within the Module api.
 *
 * @internal
 */
export type DeploymentGraphFuture =
  | DependableFuture
  | ParameterFuture
  | EventParamFuture;

export interface FutureDict {
  [key: string]: DeploymentGraphFuture;
}
