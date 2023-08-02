import { IgnitionError } from "../../../../errors";

export function assertUnknownMessageType(message: never): any {
  throw new IgnitionError(`Unknown message type ${JSON.stringify(message)}`);
}
