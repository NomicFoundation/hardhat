import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function staticCallExecutionStateInitializeListener(
  data: UiEventTypeMap[UiEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
