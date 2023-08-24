import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function deploymentExecutionStateInitializeListener(
  data: ExecutionEventTypeMap[ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE]
): void {
  // todo, render to UI
  console.log(data);
}
