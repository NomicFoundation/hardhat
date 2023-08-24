import { UiEventType, UiEventTypeMap } from "@ignored/ignition-core";

export function deploymentExecutionStateCompleteListener(
  data: UiEventTypeMap[UiEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE]
): void {
  // todo, render to UI
  console.log(data);
}
