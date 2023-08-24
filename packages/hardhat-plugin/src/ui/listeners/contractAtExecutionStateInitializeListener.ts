import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function contractAtExecutionStateInitializeListener(
  data: ExecutionEventTypeMap[ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
