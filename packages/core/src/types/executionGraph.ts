import type { BigNumber } from "ethers";

import { LibraryMap } from "./deploymentGraph";
import { ArtifactContract, DeploymentGraphFuture } from "./future";
import { AdjacencyList, VertexDescriptor } from "./graph";
import { Artifact } from "./hardhat";

export interface IExecutionGraph {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, ExecutionVertex>;
  getEdges(): Array<{ from: number; to: number }>;
}

export type ArgValue =
  | boolean
  | string
  | number
  | BigNumber
  | DeploymentGraphFuture;

export type ExecutionVertexType =
  | "ContractDeploy"
  | "DeployedContract"
  | "LibraryDeploy"
  | "ContractCall"
  | "AwaitedEvent";

export type ExecutionVertex =
  | ContractDeploy
  | DeployedContract
  | LibraryDeploy
  | ContractCall
  | AwaitedEvent;

export interface ContractDeploy extends VertexDescriptor {
  type: "ContractDeploy";
  artifact: Artifact;
  args: ArgValue[];
  libraries: LibraryMap;
  value: BigNumber;
}

export interface DeployedContract extends VertexDescriptor {
  type: "DeployedContract";
  address: string;
  abi: any[];
}

export interface LibraryDeploy extends VertexDescriptor {
  type: "LibraryDeploy";
  artifact: Artifact;
  args: ArgValue[];
}

export interface ContractCall extends VertexDescriptor {
  type: "ContractCall";
  contract: any;
  method: string;
  args: ArgValue[];
  value: BigNumber;
}

export interface AwaitedEvent extends VertexDescriptor {
  type: "AwaitedEvent";
  abi: any[];
  address: string | ArtifactContract;
  event: string;
  args: ArgValue[];
}
