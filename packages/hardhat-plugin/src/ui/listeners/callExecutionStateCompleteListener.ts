import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function callExecutionStateCompleteListener(
  data: UiEventTypeMap[UiEventType.CALL_EXECUTION_STATE_COMPLETE]
): void {
  // todo, render to UI
  console.log(data);
}
