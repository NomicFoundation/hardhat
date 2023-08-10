import { Artifact } from "../../../types/artifact";

import {
  CallExecutionResult,
  DeploymentExecutionResult,
  SendDataExecutionResult,
  StaticCallExecutionResult,
} from "./execution-result";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "./execution-state";
import {
  RawStaticCallResult,
  Transaction,
  TransactionReceiptStatus,
} from "./jsonrpc";
import { OnchainInteraction, StaticCall } from "./network-interaction";

export type LoadArtifactFunction = (
  artifactFutureId: string
) => Promise<Artifact>;

export type OnchainInteractionRequest = Omit<
  OnchainInteraction,
  "transactions" | "nonce"
>;

export enum OnchainInteractionResponseType {
  SUCCESSFUL_TRANSACTION = "SUCCESSFUL_TRANSACTION",
  SIMULATION_RESULT = "SIMULATION_RESULT",
}

export interface SuccessfulTransaction {
  type: OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION;
  transaction: Required<Transaction> & {
    status: TransactionReceiptStatus.SUCCESS;
  };
}

export interface SimulationResult {
  type: OnchainInteractionResponseType.SIMULATION_RESULT;
  result: RawStaticCallResult;
}

export type OnchainInteractionResponse =
  | SuccessfulTransaction
  | SimulationResult;

export interface SimulationSuccessSignal {
  type: "SIMULATION_SUCCESS_SIGNAL";
}

export type StaticCallRequest = Omit<StaticCall, "result">;

export type StaticCallResponse = RawStaticCallResult;

export interface ExecutionStrategy {
  executeDeployment: (
    executionState: DeploymentExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    DeploymentExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  >;

  executeCall: (
    executionState: CallExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    CallExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  >;

  executeSendData: (
    executionState: SendDataExecutionState,
    fallbackSender: string
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    SendDataExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  >;

  executeStaticCall: (
    executionState: StaticCallExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ) => AsyncGenerator<
    StaticCallRequest,
    StaticCallExecutionResult,
    StaticCallResponse
  >;
}
