import { ExecutionResultMessage } from "./execution-result-message";
import { FutureStartMessage } from "./future-start-message";

export * from "./execution-result-message";
export * from "./future-start-message";

/**
 * Journal messages at the future execution level.
 *
 * @beta
 */
export type FutureLevelJournalMessage =
  | FutureStartMessage
  | ExecutionResultMessage;
