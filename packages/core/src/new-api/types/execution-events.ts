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
}

export interface WipeExecutionStateEvent {
  type: ExecutionEventType.WIPE_EXECUTION_STATE;
  futureId: string;
}

export interface BatchInitializeEvent {
  type: ExecutionEventType.BATCH_INITIALIZE;
  batches: string[][];
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
  [ExecutionEventType.BATCH_INITIALIZE]: BatchInitializeEvent;
}

export type ExecutionEventListener = {
  [eventType in ExecutionEventType]: (
    event: ExecutionEventTypeMap[eventType]
  ) => void;
};
