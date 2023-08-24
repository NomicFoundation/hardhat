import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function contractAtExecutionStateInitializeListener(
  data: UiEventTypeMap[UiEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
