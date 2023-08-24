import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function staticCallExecutionStateInitializeListener(
  data: ExecutionEventTypeMap[ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
