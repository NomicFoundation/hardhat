import { JournalableMessage, StartRunMessage, WipeMessage } from "../types";

/**
 * Determines if potential is a StartRunMessage.
 *
 * @beta
 */
export function isStartRunMessage(
  potential: JournalableMessage
): potential is StartRunMessage {
  return potential.type === "run-start";
}

/**
 * Determines if potential is a Wipe message
 */
export function isWipeMessage(
  potential: JournalableMessage
): potential is WipeMessage {
  return potential.type === "wipe";
}
