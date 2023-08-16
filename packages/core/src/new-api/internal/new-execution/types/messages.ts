import { FutureType, SolidityParameterType } from "../../../types/module";

import {
  CallExecutionResult,
  DeploymentExecutionResult,
  SendDataExecutionResult,
  StaticCallExecutionResult,
} from "./execution-result";
import { DeploymentExecutionStateFutureTypes } from "./execution-state";
import {
  OnchainInteractionRequest,
  StaticCallRequest,
} from "./execution-strategy";
import {
  RawStaticCallResult,
  Transaction,
  TransactionReceipt,
} from "./jsonrpc";

export type JournalMessage =
  | RunStartMessage
  | DeploymentExecutionStateInitializeMessage
  | DeploymentExecutionStateCompleteMessage
  | CallExecutionStateInitializeMessage
  | CallExecutionStateCompleteMessage
  | StaticCallExecutionStateInitializeMessage
  | StaticCallExecutionStateCompleteMessage
  | SendDataExecutionStateInitializeMessage
  | SendDataExecutionStateCompleteMessage
  | NetworkInteractionRequestMessage
  | TransactionSendMessage
  | TransactionConfirmMessage
  | StaticCallCompleteMessage;

export enum JournalMessageType {
  RUN_START = "RUN_START",
  DEPLOYMENT_EXECUTION_STATE_INITIALIZE = "DEPLOYMENT_EXECUTION_STATE_INITIALIZE",
  DEPLOYMENT_EXECUTION_STATE_COMPLETE = "DEPLOYMENT_EXECUTION_STATE_COMPLETE",
  CALL_EXECUTION_STATE_INITIALIZE = "CALL_EXECUTION_STATE_INITIALIZE",
  CALL_EXECUTION_STATE_COMPLETE = "CALL_EXECUTION_STATE_COMPLETE",
  STATIC_CALL_EXECUTION_STATE_INITIALIZE = "STATIC_CALL_EXECUTION_STATE_INITIALIZE",
  STATIC_CALL_EXECUTION_STATE_COMPLETE = "STATIC_CALL_EXECUTION_STATE_COMPLETE",
  SEND_DATA_EXECUTION_STATE_INITIALIZE = "SEND_DATA_EXECUTION_STATE_INITIALIZE",
  SEND_DATA_EXECUTION_STATE_COMPLETE = "SEND_DATA_EXECUTION_STATE_COMPLETE",
  NETWORK_INTERACTION_REQUEST = "NETWORK_INTERACTION_REQUEST",
  TRANSACTION_SEND = "TRANSACTION_SEND",
  TRANSACTION_CONFIRM = "TRANSACTION_CONFIRM",
  STATIC_CALL_COMPLETE = "STATIC_CALL_COMPLETE",
}

export interface RunStartMessage {
  type: JournalMessageType.RUN_START;
  chainId: number;
}

export interface DeploymentExecutionStateInitializeMessage {
  type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE;
  futureId: string;
  futureType: DeploymentExecutionStateFutureTypes;
  strategy: string;
  dependencies: string[];
  artifactFutureId: string;
  contractName: string;
  constructorArgs: SolidityParameterType[];
  libraries: Record<string, string>;
  value: bigint;
  from: string | undefined;
}

export interface DeploymentExecutionStateCompleteMessage {
  type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: DeploymentExecutionResult;
}

export interface CallExecutionStateInitializeMessage {
  type: JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE;
  futureId: string;
  futureType: FutureType.NAMED_CONTRACT_CALL;
  strategy: string;
  dependencies: string[];
  artifactFutureId: string;
  contractAddress: string;
  functionName: string;
  args: SolidityParameterType[];
  value: bigint;
  from: string | undefined;
}

export interface CallExecutionStateCompleteMessage {
  type: JournalMessageType.CALL_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: CallExecutionResult;
}

export interface StaticCallExecutionStateInitializeMessage {
  type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE;
  futureId: string;
  futureType: FutureType.NAMED_STATIC_CALL;
  strategy: string;
  dependencies: string[];
  artifactFutureId: string;
  contractAddress: string;
  functionName: string;
  args: SolidityParameterType[];
  from: string | undefined;
}

export interface StaticCallExecutionStateCompleteMessage {
  type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: StaticCallExecutionResult;
}

export interface SendDataExecutionStateInitializeMessage {
  type: JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE;
  futureId: string;
  strategy: string;
  dependencies: string[];
  to: string;
  data: string;
  value: bigint;
  from: string | undefined;
}

export interface SendDataExecutionStateCompleteMessage {
  type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: SendDataExecutionResult;
}

export interface NetworkInteractionRequestMessage {
  type: JournalMessageType.NETWORK_INTERACTION_REQUEST;
  futureId: string;
  networkInteraction: OnchainInteractionRequest | StaticCallRequest;
}

export interface TransactionSendMessage {
  type: JournalMessageType.TRANSACTION_SEND;
  futureId: string;
  networkInteractionId: number;
  transaction: Transaction;
}

export interface TransactionConfirmMessage {
  type: JournalMessageType.TRANSACTION_CONFIRM;
  futureId: string;
  networkInteractionId: number;
  hash: string;
  receipt: TransactionReceipt;
}

export interface StaticCallCompleteMessage {
  type: JournalMessageType.STATIC_CALL_COMPLETE;
  futureId: string;
  networkInteractionId: number;
  result: RawStaticCallResult;
}
