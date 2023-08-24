import {
  ExecutionEventListener,
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export class UiEventHandler implements ExecutionEventListener {
  public [ExecutionEventType.RUN_START](
    event: ExecutionEventTypeMap[ExecutionEventType.RUN_START]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.WIPE_EXECUTION_STATE](
    event: ExecutionEventTypeMap[ExecutionEventType.WIPE_EXECUTION_STATE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE](
    event: ExecutionEventTypeMap[ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE](
    event: ExecutionEventTypeMap[ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE](
    event: ExecutionEventTypeMap[ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE](
    event: ExecutionEventTypeMap[ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE](
    event: ExecutionEventTypeMap[ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE](
    event: ExecutionEventTypeMap[ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE](
    event: ExecutionEventTypeMap[ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE](
    event: ExecutionEventTypeMap[ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE](
    event: ExecutionEventTypeMap[ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE]
  ): void {
    console.log(event);
  }

  public [ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE](
    event: ExecutionEventTypeMap[ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE]
  ): void {
    console.log(event);
  }
}
