import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function callExecutionStateCompleteListener(
  data: ExecutionEventTypeMap[ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE]
): void {
  // todo, render to UI
  console.log(data);
}
