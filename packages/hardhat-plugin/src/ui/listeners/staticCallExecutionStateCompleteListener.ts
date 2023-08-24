import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function staticCallExecutionStateCompleteListener(
  data: ExecutionEventTypeMap[ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]
): void {
  // todo, render to UI
  console.log(data);
}
