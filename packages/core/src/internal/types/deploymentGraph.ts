import type { BigNumber } from "ethers";

import {
  AddressResolvable,
  ArtifactContract,
  ArtifactFuture,
  ArtifactLibrary,
  CallableFuture,
  ContractCall,
  DeployedContract,
  DeploymentGraphFuture,
  EventFuture,
  EventParamFuture,
  HardhatContract,
  HardhatLibrary,
  OptionalParameter,
  ParameterFuture,
  ParameterValue,
  RequiredParameter,
  SendFuture,
  Virtual,
} from "../../types/future";
import { Artifact } from "../../types/hardhat";
import { Module, ModuleDict } from "../../types/module";

import { AdjacencyList, VertexDescriptor } from "./graph";

/**
 * Scope data to manage internal nested calls to submodules.
 *
 * @internal
 */
export interface ScopeData {
  before: Virtual;
  after?: Virtual;
  parameters?: { [key: string]: string | number | DeploymentGraphFuture };
}

/**
 * A dependency graph that matches the deployment decribed by a Module.
 *
 * @internal
 */
export interface IDeploymentGraph {
  vertexes: Map<number, DeploymentGraphVertex>;
  adjacencyList: AdjacencyList;
  scopeData: {
    [key: string]: ScopeData;
  };
  getEdges(): Array<{ from: number; to: number }>;
}

/**
 * A mapping of library names to the future address
 * of the deployed library.
 *
 * @internal
 */
export interface LibraryMap {
  [key: string]: DeploymentGraphFuture;
}

/**
 * Allowed parameters that can be passed into a module.
 *
 * @internal
 */
export type ExternalParamValue = boolean | string | number | BigNumber;

/**
 * Allowed parameters across internal `useModule` boundaries.
 *
 * @internal
 */
export type InternalParamValue =
  | ExternalParamValue
  | DeploymentGraphFuture
  | EventParamFuture;

/**
 * A vertex representing an action specified in the Deployment api.
 *
 * @internal
 */
export type DeploymentGraphVertex =
  | HardhatContractDeploymentVertex
  | ArtifactContractDeploymentVertex
  | DeployedContractDeploymentVertex
  | HardhatLibraryDeploymentVertex
  | ArtifactLibraryDeploymentVertex
  | CallDeploymentVertex
  | VirtualVertex
  | EventVertex
  | SendVertex;

/**
 * Deploy a contract, where the contract will be retrieved by name
 * from Hardhat's Artifact store.
 *
 * @internal
 */
export interface HardhatContractDeploymentVertex extends VertexDescriptor {
  type: "HardhatContract";
  scopeAdded: string;
  contractName: string;
  args: InternalParamValue[];
  libraries: LibraryMap;
  after: DeploymentGraphFuture[];
  value: BigNumber | ParameterFuture;
  from: string;
}

/**
 * Deploy a contract based on a given Artifact.
 *
 * @internal
 */
export interface ArtifactContractDeploymentVertex extends VertexDescriptor {
  type: "ArtifactContract";
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
  libraries: LibraryMap;
  after: DeploymentGraphFuture[];
  value: BigNumber | ParameterFuture;
  from: string;
}

/**
 * Refer to an existing deployed contract, for later use in the Module.
 *
 * @internal
 */
export interface DeployedContractDeploymentVertex extends VertexDescriptor {
  type: "DeployedContract";
  scopeAdded: string;
  address: string | EventParamFuture;
  abi: any[];
  after: DeploymentGraphFuture[];
}

/**
 * Deploy a library, where the library will be retrieved by name
 * from Hardhat's Artifact store.
 *
 * @internal
 */
export interface HardhatLibraryDeploymentVertex extends VertexDescriptor {
  type: "HardhatLibrary";
  libraryName: string;
  scopeAdded: string;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
  from: string;
}

/**
 * Deploy a library based on a given artifact.
 *
 * @internal
 */
export interface ArtifactLibraryDeploymentVertex extends VertexDescriptor {
  type: "ArtifactLibrary";
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
  from: string;
}

/**
 * Invoke a smart contract method.
 *
 * @internal
 */
export interface CallDeploymentVertex extends VertexDescriptor {
  type: "Call";
  scopeAdded: string;
  contract: CallableFuture;
  method: string;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
  value: BigNumber | ParameterFuture;
  from: string;
}

/**
 * A non-action vertex used to represent group relationships. The virtual
 * vertex can depend on many other vertexes, so a dependency on the virtual
 * vertex will mean depending on all its dependents.
 *
 * The virtual vertex is removed during translation to a simplified
 * execution graph.
 *
 * @internal
 */
export interface VirtualVertex extends VertexDescriptor {
  type: "Virtual";
  scopeAdded: string;
  after: DeploymentGraphFuture[];
}

/**
 * Await on an on-chain Ethereum event.
 *
 * @internal
 */
export interface EventVertex extends VertexDescriptor {
  type: "Event";
  scopeAdded: string;
  abi: any[];
  address: string | ArtifactContract | EventParamFuture;
  event: string;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
}

/**
 * Send ETH to a contract/address.
 *
 * @internal
 */
export interface SendVertex extends VertexDescriptor {
  type: "SendETH";
  scopeAdded: string;
  address: AddressResolvable;
  value: BigNumber | ParameterFuture;
  after: DeploymentGraphFuture[];
  from: string;
}

/**
 * The options for a Contract deploy.
 *
 * @internal
 */
export interface ContractOptions {
  args?: InternalParamValue[];
  libraries?: {
    [key: string]: DeploymentGraphFuture;
  };
  after?: DeploymentGraphFuture[];
  value?: BigNumber | ParameterFuture;
  from?: string;
}

/**
 * The options for a smart contract method call.
 *
 * @internal
 */
export interface CallOptions {
  args: InternalParamValue[];
  after?: DeploymentGraphFuture[];
  value?: BigNumber | ParameterFuture;
  from?: string;
}

/**
 * The options for an await action.
 *
 * @internal
 */
export interface AwaitOptions {
  args: InternalParamValue[];
  after?: DeploymentGraphFuture[];
}

/**
 * The options for sending ETH to an address/contract.
 *
 * @internal
 */
export interface SendOptions {
  value: BigNumber | ParameterFuture;
  after?: DeploymentGraphFuture[];
  from?: string;
}

/**
 * The options when using a module within another module.
 *
 * @internal
 */
export interface UseModuleOptions {
  parameters?: { [key: string]: number | string | DeploymentGraphFuture };
  after?: DeploymentGraphFuture[];
}

/**
 * A builder object for specifying the different parts and
 * dependencies of your deployment.
 *
 * @internal
 */
export interface IDeploymentBuilder {
  chainId: number;
  accounts: string[];
  graph: IDeploymentGraph;

  contract(contractName: string, options?: ContractOptions): HardhatContract;
  contract(
    contractName: string,
    artifact: Artifact,
    options?: ContractOptions
  ): ArtifactContract;

  contractAt(
    contractName: string,
    address: string | EventParamFuture,
    abi: any[],
    options?: { after?: DeploymentGraphFuture[] }
  ): DeployedContract;

  library(contractName: string, options?: ContractOptions): HardhatLibrary;
  library(
    contractName: string,
    artifact: Artifact,
    options?: ContractOptions
  ): ArtifactLibrary;

  call(
    contractFuture: DeploymentGraphFuture,
    functionName: string,
    options: CallOptions
  ): ContractCall;

  event(
    contractFuture: ArtifactFuture,
    eventName: string,
    options: AwaitOptions
  ): EventFuture;

  sendETH(sendTo: AddressResolvable, options: SendOptions): SendFuture;

  getParam(paramName: string): RequiredParameter;

  getOptionalParam(
    paramName: string,
    defaultValue: ParameterValue
  ): OptionalParameter;

  getArtifact(contractName: string): Artifact;

  useModule<T extends ModuleDict>(
    module: Module<T>,
    options?: UseModuleOptions
  ): Virtual & T;
}

export interface DeploymentBuilderOptions {
  chainId: number;
  accounts: string[];
  artifacts: Artifact[];
}

export interface CallPoints {
  [key: number]: Error;
}
