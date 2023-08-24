import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function wipeExecutionStateListener(
  data: UiEventTypeMap[UiEventType.WIPE_EXECUTION_STATE]
): void {
  // todo, render to UI
  console.log(data);
}
