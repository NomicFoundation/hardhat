import {
  ExecutionEventType,
  ExecutionEventTypeMap,
} from "@ignored/ignition-core";

export function runStartListener(
  data: ExecutionEventTypeMap[ExecutionEventType.RUN_START]
): void {
  // todo, render to UI
  console.log(data);
}
