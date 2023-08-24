import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function staticCallExecutionStateCompleteListener(
  data: UiEventTypeMap[UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]
): void {
  // todo, render to UI
  console.log(data);
}
