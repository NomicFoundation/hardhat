import type { BigNumber, ethers } from "ethers";

import {
  AddressResolvable,
  ArtifactContract,
  DeploymentGraphFuture,
  EventParamFuture,
} from "../../types/future";
import { Artifact } from "../../types/hardhat";

import { LibraryMap } from "./deploymentGraph";
import {
  AdjacencyList,
  ResultsAccumulator,
  VertexDescriptor,
  VertexVisitResult,
  VisitResult,
} from "./graph";

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
  | "AwaitedEvent"
  | "SentETH";

export type ExecutionVertex =
  | ContractDeploy
  | DeployedContract
  | LibraryDeploy
  | ContractCall
  | AwaitedEvent
  | SentETH;

export interface ContractDeploy extends VertexDescriptor {
  type: "ContractDeploy";
  artifact: Artifact;
  args: ArgValue[];
  libraries: LibraryMap;
  value: BigNumber;
  signer: ethers.Signer;
}

export interface DeployedContract extends VertexDescriptor {
  type: "DeployedContract";
  address: string | EventParamFuture;
  abi: any[];
}

export interface LibraryDeploy extends VertexDescriptor {
  type: "LibraryDeploy";
  artifact: Artifact;
  args: ArgValue[];
  signer: ethers.Signer;
}

export interface ContractCall extends VertexDescriptor {
  type: "ContractCall";
  contract: any;
  method: string;
  args: ArgValue[];
  value: BigNumber;
  signer: ethers.Signer;
}

export interface AwaitedEvent extends VertexDescriptor {
  type: "AwaitedEvent";
  abi: any[];
  address: string | ArtifactContract | EventParamFuture;
  event: string;
  args: ArgValue[];
}

export interface SentETH extends VertexDescriptor {
  type: "SentETH";
  address: AddressResolvable;
  value: BigNumber;
  signer: ethers.Signer;
}

export interface ContractDeploySuccess {
  name: string;
  abi: any[];
  bytecode: string;
  address: string;
  value: ethers.BigNumber;
}

export interface DeployedContractSuccess {
  name: string;
  abi: any[];
  address: string;
}

export interface LibraryDeploySuccess {
  name: string;
  abi: any[];
  bytecode: string;
  address: string;
}

export interface AwaitedEventSuccess {
  topics: ethers.utils.Result;
}

export interface ContractCallSuccess {
  hash: string;
}

export interface SendETHSuccess {
  hash: string;
  value: ethers.BigNumber;
}

export type VertexVisitResultSuccessResult =
  | ContractDeploySuccess
  | DeployedContractSuccess
  | LibraryDeploySuccess
  | AwaitedEventSuccess
  | ContractCallSuccess
  | SendETHSuccess;

export type ExecutionVertexVisitResult =
  VertexVisitResult<VertexVisitResultSuccessResult>;

export type ExecutionResultsAccumulator =
  ResultsAccumulator<VertexVisitResultSuccessResult>;

export type ExecutionVisitResult = VisitResult<VertexVisitResultSuccessResult>;
