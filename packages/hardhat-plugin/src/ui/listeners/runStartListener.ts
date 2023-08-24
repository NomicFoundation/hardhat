import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function runStartListener(
  data: UiEventTypeMap[UiEventType.RUN_START]
): void {
  // todo, render to UI
  console.log(data);
}
