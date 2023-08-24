import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function callExecutionStateInitializeListener(
  data: UiEventTypeMap[UiEventType.CALL_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
