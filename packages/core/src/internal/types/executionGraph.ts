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

/**
 * A dependency graph for on-chain execution.
 *
 * @internal
 */
export interface IExecutionGraph {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, ExecutionVertex>;
  getEdges(): Array<{ from: number; to: number }>;
}

/**
 * The base value that Ethereum ABIs accept.
 *
 * @internal
 */
export type BaseArgValue = number | BigNumber | string | boolean;

/**
 * A composite (i.e. arrays and nested objects) of base value that Ethereum
 * ABIs accept.
 *
 * @internal
 */
export type StructuredArgValue =
  | BaseArgValue
  | StructuredArgValue[]
  | { [field: string]: StructuredArgValue };

/**
 * The allowed values when passing an argument to a smart contract method call.
 *
 * @internal
 */
export type ArgValue =
  | BaseArgValue
  | StructuredArgValue
  | DeploymentGraphFuture;

/**
 * The different types of the vertexes of the execution graph.
 *
 * @internal
 */
export type ExecutionVertexType =
  | "ContractDeploy"
  | "DeployedContract"
  | "LibraryDeploy"
  | "ContractCall"
  | "StaticContractCall"
  | "AwaitedEvent"
  | "SentETH";

/**
 * The vertexes of the execution graph.
 *
 * @internal
 */
export type ExecutionVertex =
  | ContractDeployExecutionVertex
  | DeployedContractExecutionVertex
  | LibraryDeployExecutionVertex
  | ContractCallExecutionVertex
  | StaticContractCallExecutionVertex
  | AwaitedEventExecutionVertex
  | SentETHExecutionVertex;

/**
 * Deploy a contract based on the given artifact.
 *
 * @internal
 */
export interface ContractDeployExecutionVertex extends VertexDescriptor {
  type: "ContractDeploy";
  artifact: Artifact;
  args: ArgValue[];
  libraries: LibraryMap;
  value: BigNumber;
  signer: ethers.Signer;
}

/**
 * Make no on-chain action but substitute an already known
 * address and abi.
 *
 * @internal
 */
export interface DeployedContractExecutionVertex extends VertexDescriptor {
  type: "DeployedContract";
  address: string | EventParamFuture;
  abi: any[];
}

/**
 * Deploy a library based on the given artifact.
 *
 * @internal
 */
export interface LibraryDeployExecutionVertex extends VertexDescriptor {
  type: "LibraryDeploy";
  artifact: Artifact;
  args: ArgValue[];
  signer: ethers.Signer;
}

/**
 * Make a method call to a smart chain contract.
 *
 * @internal
 */
export interface ContractCallExecutionVertex extends VertexDescriptor {
  type: "ContractCall";
  contract: any;
  method: string;
  args: ArgValue[];
  value: BigNumber;
  signer: ethers.Signer;
}

/**
 * Make a static call to a read-only method of a smart chain contract.
 *
 * @internal
 */
export interface StaticContractCallExecutionVertex extends VertexDescriptor {
  type: "StaticContractCall";
  contract: any;
  method: string;
  args: ArgValue[];
  signer: ethers.Signer;
}

/**
 * Wait for the an Ethereum event to execute.
 *
 * @internal
 */
export interface AwaitedEventExecutionVertex extends VertexDescriptor {
  type: "AwaitedEvent";
  abi: any[];
  address: string | ArtifactContract | EventParamFuture;
  event: string;
  args: ArgValue[];
}

/**
 * Transfer ETH to a contract/address.
 *
 * @internal
 */
export interface SentETHExecutionVertex extends VertexDescriptor {
  type: "SentETH";
  address: AddressResolvable;
  value: BigNumber;
  signer: ethers.Signer;
}

/**
 * The result of a successful contract deployment.
 *
 * @internal
 */
export interface ContractDeploySuccess {
  name: string;
  abi: any[];
  bytecode: string;
  address: string;
  value: ethers.BigNumber;
}

/**
 * The result of a successful existing contract.
 *
 * @internal
 */
export interface DeployedContractSuccess {
  name: string;
  abi: any[];
  address: string;
}

/**
 * The result of a successful library deployment.
 *
 * @internal
 */
export interface LibraryDeploySuccess {
  name: string;
  abi: any[];
  bytecode: string;
  address: string;
}

/**
 * The result of a successful wait on an Ethereum event.
 *
 * @internal
 */
export interface AwaitedEventSuccess {
  topics: ethers.utils.Result;
}

/**
 * The result of a successful smart contract method invocation.
 *
 * @internal
 */
export interface ContractCallSuccess {
  hash: string;
}

/**
 * The result of a successful smart contract static call.
 *
 * @internal
 */
export interface StaticContractCallSuccess {
  data: BaseArgValue | ethers.utils.Result;
}

/**
 * The result of a successful transfer of ETH to a contract/address.
 *
 * @internal
 */
export interface SendETHSuccess {
  hash: string;
  value: ethers.BigNumber;
}

/**
 * The result of a successful vertex execution.
 *
 * @internal
 */
export type VertexVisitResultSuccessResult =
  | ContractDeploySuccess
  | DeployedContractSuccess
  | LibraryDeploySuccess
  | AwaitedEventSuccess
  | ContractCallSuccess
  | StaticContractCallSuccess
  | SendETHSuccess;

/**
 * The result of a processing a vertex of the execution graph.
 *
 * @internal
 */
export type ExecutionVertexVisitResult =
  VertexVisitResult<VertexVisitResultSuccessResult>;

export type ExecutionResultsAccumulator =
  ResultsAccumulator<VertexVisitResultSuccessResult>;

export type ExecutionVisitResult = VisitResult<VertexVisitResultSuccessResult>;
