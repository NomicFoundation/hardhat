import { FutureLevelJournalMessage, JournalableMessage } from "../../types";

import { isExecutionResultMessage } from "./execution-result-message";
import { isFutureStartMessage } from "./future-start-message";

/* eslint-disable import/no-unused-modules */
export * from "./execution-result-message";
export * from "./execution-success";
export * from "./future-start-message";

/**
 * Returns true if potential is an future start message.
 *
 * @beta
 */
export function isFutureLevelJournalMessage(
  potential: JournalableMessage
): potential is FutureLevelJournalMessage {
  return isFutureStartMessage(potential) || isExecutionResultMessage(potential);
}
