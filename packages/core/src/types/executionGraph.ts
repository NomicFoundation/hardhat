import { RecipeFuture } from "./future";
import { AdjacencyList } from "./graph";
import { Artifact } from "./hardhat";
import { LibraryMap } from "./recipeGraph";

export interface IExecutionGraph {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, ExecutionVertex>;
  toMermaid(): string;
}

export type ArgValue = boolean | string | number | RecipeFuture;

export type ExecutionVertex =
  | ContractDeploy
  | DeployedContract
  | LibraryDeploy
  | ContractCall;

export interface ContractDeploy {
  type: "ContractDeploy";
  id: number;
  label: string;
  artifact: Artifact;
  args: ArgValue[];
  libraries: LibraryMap;
}

export interface DeployedContract {
  type: "DeployedContract";
  id: number;
  label: string;
  address: string;
  abi: any[];
}

export interface LibraryDeploy {
  type: "LibraryDeploy";
  id: number;
  label: string;
  artifact: Artifact;
  args: ArgValue[];
}

export interface ContractCall {
  type: "ContractCall";
  id: number;
  label: string;
  contract: any;
  method: string;
  args: ArgValue[];
}
