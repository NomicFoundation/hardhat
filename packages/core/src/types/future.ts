import type { ArtifactOld } from "./hardhat";

/**
 * A future representing the address of a contract deployed using the
 * Hardhat Artifact system.
 *
 * @alpha
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
 * @alpha
 */
export interface ArtifactContract {
  vertexId: number;
  label: string;
  type: "contract";
  subtype: "artifact";
  artifact: ArtifactOld;
  _future: true;
}

/**
 * A future representing the address of an already deployed contract.
 *
 * @alpha
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
 * @alpha
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
 * @alpha
 */
export interface ArtifactLibrary {
  vertexId: number;
  label: string;
  type: "library";
  subtype: "artifact";
  artifact: ArtifactOld;
  _future: true;
}

/**
 * A future representing an on-chain smart contract method invocation.
 *
 * @alpha
 */
export interface ContractCall {
  vertexId: number;
  label: string;
  type: "call";
  _future: true;
}

/**
 * A future representing a retrieval of data from statically calling an on-chain smart contract method.
 *
 * @alpha
 */
export interface StaticContractCall {
  vertexId: number;
  label: string;
  type: "static-call";
  _future: true;
}

/**
 * A future representing an on-chain Ethereum event.
 *
 * @alpha
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
 * @alpha
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
 * @alpha
 */
export interface EventParams {
  [eventParam: string]: EventParamFuture;
}

/**
 * A future representing a parameter of an on-chain Ethereum event.
 *
 * @alpha
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
 * @alpha
 */
export type ParameterValue = string | number | DeploymentGraphFuture;

/**
 * A future representing a parameter value that _must_ be provided to the module
 * for it to execute.
 *
 * @alpha
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
 * @alpha
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
 * @alpha
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
 * @alpha
 */
export interface ProxyFuture {
  label: string;
  type: "proxy";
  proxy: DependableFuture;
  value: DependableFuture;
  _future: true;
}

/**
 * A future representing the address of a deployed Contract.
 *
 * @alpha
 */
export type ContractFutureOld =
  | HardhatContract
  | ArtifactContract
  | DeployedContract;

/**
 * The future representing the address of a deployed library.
 *
 * @alpha
 */
export type LibraryFuture = HardhatLibrary | ArtifactLibrary;

/**
 * The future representing the value of calling a smart contract method.
 *
 * @alpha
 */
export type CallableFuture = ContractFutureOld | LibraryFuture;

/**
 * A future value from an on-chain action that.
 *
 * @alpha
 */
export type DependableFuture =
  | ContractFutureOld
  | LibraryFuture
  | ContractCall
  | StaticContractCall
  | Virtual
  | ProxyFuture
  | EventFuture
  | SendFuture;

/**
 * A future value representing an Ethereum address.
 *
 * @alpha
 */
export type AddressResolvable =
  | string
  | ParameterFuture
  | EventParamFuture
  | ContractFutureOld;

/**
 * The future value of a passed parameter to a Module.
 *
 * @alpha
 */
export type ParameterFuture = RequiredParameter | OptionalParameter;

/**
 * The future values usable within the Module api.
 *
 * @alpha
 */
export type DeploymentGraphFuture =
  | DependableFuture
  | ParameterFuture
  | EventParamFuture
  | StaticContractCall;
