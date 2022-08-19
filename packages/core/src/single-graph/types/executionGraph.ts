import { AdjacencyList } from "../utils/adjacencyList";

import { RecipeFuture } from "./future";
import { Artifact } from "./hardhat";
import { LibraryMap } from "./recipeGraph";

export type ArgValue = string | number | RecipeFuture;

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

export type ExecutionVertex =
  | ContractDeploy
  | DeployedContract
  | LibraryDeploy
  | ContractCall;

export interface IExecutionGraph {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, ExecutionVertex>;
}
