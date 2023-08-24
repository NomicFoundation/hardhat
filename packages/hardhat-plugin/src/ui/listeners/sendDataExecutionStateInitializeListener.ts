import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function sendDataExecutionStateInitializeListener(
  data: ExecutionEventTypeMap[ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
