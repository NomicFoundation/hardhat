import { SolidityParameterType } from "../../../types/module";

import { DeploymentExecutionStateFutureTypes } from "./execution-state";
import { Transaction, TransactionReceipt } from "./jsonrpc";
import { NetworkInteraction } from "./network-interaction";

export type JournalMessage =
  | RunStartMessage
  | DeploymentExecutionStateInitializeMessage
  | NetworkInteractionRequestMessage
  | TransactionSendMessage
  | TransactionConfirmMessage;

export enum JournalMessageType {
  RUN_START = "RUN_START",
  DEPLOYMENT_EXECUTION_STATE_INITIALIZE = "DEPLOYMENT_EXECUTION_STATE_INITIALIZE",
  NETWORK_INTERACTION_REQUEST = "NETWORK_INTERACTION_REQUEST",
  TRANSACTION_SEND = "TRANSACTION_SEND",
  TRANSACTION_CONFIRM = "TRANSACTION_CONFIRM",
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

export interface NetworkInteractionRequestMessage {
  type: JournalMessageType.NETWORK_INTERACTION_REQUEST;
  futureId: string;
  networkInteraction: NetworkInteraction;
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
