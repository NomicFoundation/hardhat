import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function callExecutionStateInitializeListener(
  data: ExecutionEventTypeMap[ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
