export type UiEvent =
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
  | ReadEventArgExecutionStateInitializeEvent;

export enum UiEventType {
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
}

export interface RunStartEvent {
  type: UiEventType.RUN_START;
  chainId: number;
}

export interface DeploymentExecutionStateInitializeEvent {
  type: UiEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface DeploymentExecutionStateCompleteEvent {
  type: UiEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: UiDeploymentResult;
}

export interface CallExecutionStateInitializeEvent {
  type: UiEventType.CALL_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface CallExecutionStateCompleteEvent {
  type: UiEventType.CALL_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: UiCallResult;
}

export interface StaticCallExecutionStateInitializeEvent {
  type: UiEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface StaticCallExecutionStateCompleteEvent {
  type: UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: UiStaticCallResult;
}

export interface SendDataExecutionStateInitializeEvent {
  type: UiEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface SendDataExecutionStateCompleteEvent {
  type: UiEventType.SEND_DATA_EXECUTION_STATE_COMPLETE;
  futureId: string;
  result: UiSendDataResult;
}

export interface ContractAtExecutionStateInitializeEvent {
  type: UiEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface ReadEventArgExecutionStateInitializeEvent {
  type: UiEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE;
  futureId: string;
}

export interface WipeExecutionStateEvent {
  type: UiEventType.WIPE_EXECUTION_STATE;
  futureId: string;
}

export enum UiResultType {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export type UiDeploymentResult = UiDeploymentSuccess | UiDeploymentError;

export interface UiDeploymentSuccess {
  type: UiResultType.SUCCESS;
  address: string;
}

export interface UiDeploymentError {
  type: UiResultType.ERROR;
  error: string;
}

export type UiCallResult = UiCallSuccess | UiCallError;

export interface UiCallSuccess {
  type: UiResultType.SUCCESS;
}

export interface UiCallError {
  type: UiResultType.ERROR;
  error: string;
}

export type UiStaticCallResult = UiStaticCallSuccess | UiStaticCallError;

export interface UiStaticCallSuccess {
  type: UiResultType.SUCCESS;
}

export interface UiStaticCallError {
  type: UiResultType.ERROR;
  error: string;
}

export type UiSendDataResult = UiSendDataSuccess | UiSendDataError;

export interface UiSendDataSuccess {
  type: UiResultType.SUCCESS;
}

export interface UiSendDataError {
  type: UiResultType.ERROR;
  error: string;
}

export interface UiEventTypeMap {
  [UiEventType.RUN_START]: RunStartEvent;
  [UiEventType.WIPE_EXECUTION_STATE]: WipeExecutionStateEvent;
  [UiEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE]: DeploymentExecutionStateInitializeEvent;
  [UiEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE]: DeploymentExecutionStateCompleteEvent;
  [UiEventType.CALL_EXECUTION_STATE_INITIALIZE]: CallExecutionStateInitializeEvent;
  [UiEventType.CALL_EXECUTION_STATE_COMPLETE]: CallExecutionStateCompleteEvent;
  [UiEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE]: StaticCallExecutionStateInitializeEvent;
  [UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]: StaticCallExecutionStateCompleteEvent;
  [UiEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]: SendDataExecutionStateInitializeEvent;
  [UiEventType.SEND_DATA_EXECUTION_STATE_COMPLETE]: SendDataExecutionStateCompleteEvent;
  [UiEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE]: ContractAtExecutionStateInitializeEvent;
  [UiEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE]: ReadEventArgExecutionStateInitializeEvent;
}

export type UiEventListener = {
  [eventType in UiEventType]: (event: UiEventTypeMap[eventType]) => void;
};
