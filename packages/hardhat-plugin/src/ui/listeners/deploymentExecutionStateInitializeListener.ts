import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function deploymentExecutionStateInitializeListener(
  data: UiEventTypeMap[UiEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
