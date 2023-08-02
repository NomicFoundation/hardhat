import {
  JournalableMessage,
  RunLevelJournalMessage,
  StartRunMessage,
  WipeMessage,
} from "../types";

export function isRunLevelJournalMessage(
  potential: JournalableMessage
): potential is RunLevelJournalMessage {
  return isStartRunMessage(potential) || isWipeMessage(potential);
}

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
