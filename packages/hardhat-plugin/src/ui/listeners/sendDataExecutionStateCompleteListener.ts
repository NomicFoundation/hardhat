import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function sendDataExecutionStateCompleteListener(
  data: ExecutionEventTypeMap[ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE]
): void {
  // todo, render to UI
  console.log(data);
}
