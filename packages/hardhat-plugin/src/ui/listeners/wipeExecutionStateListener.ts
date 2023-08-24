import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function wipeExecutionStateListener(
  data: ExecutionEventTypeMap[ExecutionEventType.WIPE_EXECUTION_STATE]
): void {
  // todo, render to UI
  console.log(data);
}
