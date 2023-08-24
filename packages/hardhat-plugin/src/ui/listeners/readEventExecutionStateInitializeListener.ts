import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function readEventExecutionStateInitializeListener(
  data: ExecutionEventTypeMap[ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
