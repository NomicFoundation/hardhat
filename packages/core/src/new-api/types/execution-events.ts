export type ExecutionEvent =
  | RunStartEvent
  | WipeExecutionStateEvent
  | DeploymentExecutionStateInitializeEvent
  | DeploymentExecutionStateCompleteEvent
  | CallExecutionStateInitializeEvent
  | CallExecutionStateCompleteEvent
  | StaticCallExecutionStateInitializeEvent
  | StaticCallExecutionStateCompleteEvent
  | SendDataExecutionStateInitializeEvent
  | SendDataExecutionStateCompleteEvent
  | ContractAtExecutionStateInitializeEvent
  | ReadEventArgExecutionStateInitializeEvent
  | NetworkInteractionRequestEvent
  | TransactionSendEvent
  | TransactionConfirmEvent
  | StaticCallCompleteEvent
  | OnchainInteractionBumpFeesEvent
  | OnchainInteractionDroppedEvent
  | OnchainInteractionReplacedByUserEvent
  | OnchainInteractionTimeoutEvent
  | BatchInitializeEvent;

export enum ExecutionEventType {
  RUN_START = "RUN_START",
  WIPE_EXECUTION_STATE = "WIPE_EXECUTION_STATE",
  DEPLOYMENT_EXECUTION_STATE_INITIALIZE = "DEPLOYMENT_EXECUTION_STATE_INITIALIZE",
  DEPLOYMENT_EXECUTION_STATE_COMPLETE = "DEPLOYMENT_EXECUTION_STATE_COMPLETE",
  CALL_EXECUTION_STATE_INITIALIZE = "CALL_EXECUTION_STATE_INITIALIZE",
  CALL_EXECUTION_STATE_COMPLETE = "CALL_EXECUTION_STATE_COMPLETE",
  STATIC_CALL_EXECUTION_STATE_INITIALIZE = "STATIC_CALL_EXECUTION_STATE_INITIALIZE",
  STATIC_CALL_EXECUTION_STATE_COMPLETE = "STATIC_CALL_EXECUTION_STATE_COMPLETE",
  SEND_DATA_EXECUTION_STATE_INITIALIZE = "SEND_DATA_EXECUTION_STATE_INITIALIZE",
  SEND_DATA_EXECUTION_STATE_COMPLETE = "SEND_DATA_EXECUTION_STATE_COMPLETE",
  CONTRACT_AT_EXECUTION_STATE_INITIALIZE = "CONTRACT_AT_EXECUTION_STATE_INITIALIZE",
  READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE = "READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE",
  NETWORK_INTERACTION_REQUEST = "NETWORK_INTERACTION_REQUEST",
  TRANSACTION_SEND = "TRANSACTION_SEND",
  TRANSACTION_CONFIRM = "TRANSACTION_CONFIRM",
  STATIC_CALL_COMPLETE = "STATIC_CALL_COMPLETE",
  ONCHAIN_INTERACTION_BUMP_FEES = "ONCHAIN_INTERACTION_BUMP_FEES",
  ONCHAIN_INTERACTION_DROPPED = "ONCHAIN_INTERACTION_DROPPED",
  ONCHAIN_INTERACTION_REPLACED_BY_USER = "ONCHAIN_INTERACTION_REPLACED_BY_USER",
  ONCHAIN_INTERACTION_TIMEOUT = "ONCHAIN_INTERACTION_TIMEOUT",
  BATCH_INITIALIZE = "BATCH_INITIALIZE",
}

export interface RunStartEvent {
  type: ExecutionEventType.RUN_START;
  chainId: number;
}

export interface DeploymentExecutionStateInitializeEvent {
  type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface DeploymentExecutionStateCompleteEvent {
  type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: ExecutionEventResult;
}

export interface CallExecutionStateInitializeEvent {
  type: ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface CallExecutionStateCompleteEvent {
  type: ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: ExecutionEventResult;
}

export interface StaticCallExecutionStateInitializeEvent {
  type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface StaticCallExecutionStateCompleteEvent {
  type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: ExecutionEventResult;
}

export interface SendDataExecutionStateInitializeEvent {
  type: ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface SendDataExecutionStateCompleteEvent {
  type: ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: ExecutionEventResult;
}

export interface ContractAtExecutionStateInitializeEvent {
  type: ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface ReadEventArgExecutionStateInitializeEvent {
  type: ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE;
  futureId: string;
  result: ExecutionEventSuccess;
}

export interface WipeExecutionStateEvent {
  type: ExecutionEventType.WIPE_EXECUTION_STATE;
  futureId: string;
}

export interface BatchInitializeEvent {
  type: ExecutionEventType.BATCH_INITIALIZE;
  batches: string[][];
}

export interface NetworkInteractionRequestEvent {
  type: ExecutionEventType.NETWORK_INTERACTION_REQUEST;
  networkInteractionType: ExecutionEventNetworkInteractionType;
  futureId: string;
}

export interface TransactionSendEvent {
  type: ExecutionEventType.TRANSACTION_SEND;
  futureId: string;
  hash: string;
}

export interface TransactionConfirmEvent {
  type: ExecutionEventType.TRANSACTION_CONFIRM;
  futureId: string;
  hash: string;
}

export interface StaticCallCompleteEvent {
  type: ExecutionEventType.STATIC_CALL_COMPLETE;
  futureId: string;
}

export interface OnchainInteractionBumpFeesEvent {
  type: ExecutionEventType.ONCHAIN_INTERACTION_BUMP_FEES;
  futureId: string;
}

export interface OnchainInteractionDroppedEvent {
  type: ExecutionEventType.ONCHAIN_INTERACTION_DROPPED;
  futureId: string;
}

export interface OnchainInteractionReplacedByUserEvent {
  type: ExecutionEventType.ONCHAIN_INTERACTION_REPLACED_BY_USER;
  futureId: string;
}

export interface OnchainInteractionTimeoutEvent {
  type: ExecutionEventType.ONCHAIN_INTERACTION_TIMEOUT;
  futureId: string;
}

export enum ExecutionEventNetworkInteractionType {
  ONCHAIN_INTERACTION = "ONCHAIN_INTERACTION",
  STATIC_CALL = "STATIC_CALL",
}

export enum ExecutionEventResultType {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export type ExecutionEventResult = ExecutionEventSuccess | ExecutionEventError;

export interface ExecutionEventSuccess {
  type: ExecutionEventResultType.SUCCESS;
  result?: string;
}

export interface ExecutionEventError {
  type: ExecutionEventResultType.ERROR;
  error: string;
}

export interface ExecutionEventTypeMap {
  [ExecutionEventType.RUN_START]: RunStartEvent;
  [ExecutionEventType.WIPE_EXECUTION_STATE]: WipeExecutionStateEvent;
  [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE]: DeploymentExecutionStateInitializeEvent;
  [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE]: DeploymentExecutionStateCompleteEvent;
  [ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE]: CallExecutionStateInitializeEvent;
  [ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE]: CallExecutionStateCompleteEvent;
  [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE]: StaticCallExecutionStateInitializeEvent;
  [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]: StaticCallExecutionStateCompleteEvent;
  [ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]: SendDataExecutionStateInitializeEvent;
  [ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE]: SendDataExecutionStateCompleteEvent;
  [ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE]: ContractAtExecutionStateInitializeEvent;
  [ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE]: ReadEventArgExecutionStateInitializeEvent;
  [ExecutionEventType.NETWORK_INTERACTION_REQUEST]: NetworkInteractionRequestEvent;
  [ExecutionEventType.TRANSACTION_SEND]: TransactionSendEvent;
  [ExecutionEventType.TRANSACTION_CONFIRM]: TransactionConfirmEvent;
  [ExecutionEventType.STATIC_CALL_COMPLETE]: StaticCallCompleteEvent;
  [ExecutionEventType.ONCHAIN_INTERACTION_BUMP_FEES]: OnchainInteractionBumpFeesEvent;
  [ExecutionEventType.ONCHAIN_INTERACTION_DROPPED]: OnchainInteractionDroppedEvent;
  [ExecutionEventType.ONCHAIN_INTERACTION_REPLACED_BY_USER]: OnchainInteractionReplacedByUserEvent;
  [ExecutionEventType.ONCHAIN_INTERACTION_TIMEOUT]: OnchainInteractionTimeoutEvent;
  [ExecutionEventType.BATCH_INITIALIZE]: BatchInitializeEvent;
}

export type ExecutionEventListener = {
  [eventType in ExecutionEventType]: (
    event: ExecutionEventTypeMap[eventType]
  ) => void;
};
