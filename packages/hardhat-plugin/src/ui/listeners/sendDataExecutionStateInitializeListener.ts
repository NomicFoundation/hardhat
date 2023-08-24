import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function sendDataExecutionStateInitializeListener(
  data: UiEventTypeMap[UiEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
