import { TaskIdentifier } from "../../../types";

export function parseTaskIdentifier(taskIdentifier: TaskIdentifier): {
  scope: string | undefined;
  task: string;
} {
  let scope: string | undefined;
  let task: string;
  if (typeof taskIdentifier === "string") {
    task = taskIdentifier;
  } else {
    scope = taskIdentifier.scope;
    task = taskIdentifier.task;
  }
  return { scope, task };
}
