import { RecipeFuture } from "./future";
import { AdjacencyList, VertexDescriptor } from "./graph";
import { Artifact } from "./hardhat";
import { LibraryMap } from "./recipeGraph";

export interface IExecutionGraph {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, ExecutionVertex>;
  getEdges(): Array<{ from: number; to: number }>;
}

export type ArgValue = boolean | string | number | RecipeFuture;

export type ExecutionVertexType =
  | "ContractDeploy"
  | "DeployedContract"
  | "LibraryDeploy"
  | "ContractCall";

export type ExecutionVertex =
  | ContractDeploy
  | DeployedContract
  | LibraryDeploy
  | ContractCall;

export interface ContractDeploy extends VertexDescriptor {
  type: "ContractDeploy";
  artifact: Artifact;
  args: ArgValue[];
  libraries: LibraryMap;
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
}
