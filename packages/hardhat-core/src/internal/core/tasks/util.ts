import { TaskIdentifier } from "../../../types";

export function parseTaskIdentifier(taskIdentifier: TaskIdentifier): {
  scope: string | undefined;
  name: string;
} {
  let scope: string | undefined;
  let name: string;
  if (typeof taskIdentifier === "string") {
    name = taskIdentifier;
    scope = undefined;
  } else {
    name = taskIdentifier.name;
    scope = taskIdentifier.scope;
  }
  return { scope, name };
}
