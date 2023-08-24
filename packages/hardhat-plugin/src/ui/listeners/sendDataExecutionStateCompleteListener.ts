import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function sendDataExecutionStateCompleteListener(
  data: UiEventTypeMap[UiEventType.SEND_DATA_EXECUTION_STATE_COMPLETE]
): void {
  // todo, render to UI
  console.log(data);
}
