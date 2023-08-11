import { IgnitionError } from "../../../../errors";

export function assertUnknownAction<T>(actionType: never): T {
  throw new IgnitionError(
    "Unknown message as action: " + JSON.stringify(actionType)
  );
}
