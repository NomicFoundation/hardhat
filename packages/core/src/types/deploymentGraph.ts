import type { BigNumber } from "ethers";

import {
  ArtifactContract,
  ArtifactLibrary,
  EventFuture,
  ContractCall,
  DeployedContract,
  DeploymentGraphFuture,
  FutureDict,
  HardhatContract,
  HardhatLibrary,
  OptionalParameter,
  ParameterValue,
  RequiredParameter,
  CallableFuture,
  Virtual,
  ParameterFuture,
  BytesFuture,
  ArtifactFuture,
  EventParamFuture,
  SendFuture,
  AddressResolvable,
} from "./future";
import { AdjacencyList, VertexDescriptor } from "./graph";
import { Artifact } from "./hardhat";
import { ModuleDict, Subgraph } from "./module";

export interface ScopeData {
  before: Virtual;
  after?: Virtual;
  parameters?: { [key: string]: string | number | DeploymentGraphFuture };
}

export interface IDeploymentGraph {
  vertexes: Map<number, DeploymentGraphVertex>;
  adjacencyList: AdjacencyList;
  scopeData: {
    [key: string]: ScopeData;
  };
  getEdges(): Array<{ from: number; to: number }>;
}

export interface LibraryMap {
  [key: string]: DeploymentGraphFuture;
}

export type ExternalParamValue = boolean | string | number | BigNumber;

export type InternalParamValue =
  | ExternalParamValue
  | DeploymentGraphFuture
  | EventParamFuture;

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

export interface DeployedContractDeploymentVertex extends VertexDescriptor {
  type: "DeployedContract";
  scopeAdded: string;
  address: string | EventParamFuture;
  abi: any[];
  after: DeploymentGraphFuture[];
}

export interface HardhatLibraryDeploymentVertex extends VertexDescriptor {
  type: "HardhatLibrary";
  libraryName: string;
  scopeAdded: string;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
  from: string;
}

export interface ArtifactLibraryDeploymentVertex extends VertexDescriptor {
  type: "ArtifactLibrary";
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
  from: string;
}

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

export interface VirtualVertex extends VertexDescriptor {
  type: "Virtual";
  scopeAdded: string;
  after: DeploymentGraphFuture[];
}

export interface EventVertex extends VertexDescriptor {
  type: "Event";
  scopeAdded: string;
  abi: any[];
  address: string | ArtifactContract | EventParamFuture;
  event: string;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
}

export interface SendVertex extends VertexDescriptor {
  type: "SendETH";
  scopeAdded: string;
  address: AddressResolvable;
  value: BigNumber | ParameterFuture;
  after: DeploymentGraphFuture[];
  from: string;
}

export interface ContractOptions {
  args?: InternalParamValue[];
  libraries?: {
    [key: string]: DeploymentGraphFuture;
  };
  after?: DeploymentGraphFuture[];
  value?: BigNumber | ParameterFuture;
  from?: string;
}

export interface CallOptions {
  args: InternalParamValue[];
  after?: DeploymentGraphFuture[];
  value?: BigNumber | ParameterFuture;
  from?: string;
}

export interface AwaitOptions {
  args: InternalParamValue[];
  after?: DeploymentGraphFuture[];
}

export interface SendOptions {
  value: BigNumber | ParameterFuture;
  after?: DeploymentGraphFuture[];
  from?: string;
}

export interface UseSubgraphOptions {
  parameters?: { [key: string]: number | string | DeploymentGraphFuture };
  after?: DeploymentGraphFuture[];
}

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

  getBytesForArtifact(artifactName: string): BytesFuture;

  useSubgraph<T extends FutureDict>(
    subgraph: Subgraph<T>,
    options?: UseSubgraphOptions
  ): Virtual & T;

  useModule<T extends ModuleDict>(
    module: Subgraph<T>,
    options?: UseSubgraphOptions
  ): Virtual & T;
}

export interface DeploymentBuilderOptions {
  chainId: number;
  accounts: string[];
}

export interface CallPoints {
  [key: number]: Error;
}
