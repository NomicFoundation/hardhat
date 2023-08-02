import { FutureLevelJournalMessage } from "./future-level-journal-message";
import { RunLevelJournalMessage } from "./run-level-journal-message";
import { TransactionLevelJournalMessage } from "./transaction-level-journal-message";

/**
 * Store a deployments execution state as a transaction log.
 *
 * @beta
 */
export interface Journal {
  record(message: JournalableMessage): void;

  read(): AsyncGenerator<JournalableMessage>;
}

/**
 * A message recordable in the journal's transaction log.
 *
 * @beta
 */
export type JournalableMessage =
  | RunLevelJournalMessage
  | FutureLevelJournalMessage
  | TransactionLevelJournalMessage;

/**
 * The types of journal messages.
 *
 * @beta
 */
export enum JournalMessageType {
  RUN_START = "run-start",
  WIPE = "wipe",
  EXECUTION_START = "execution-start",
  EXECUTION_SUCCESS = "execution-success",
  EXECUTION_FAILURE = "execution-failure",
  EXECUTION_TIMEOUT = "execution-timeout",
  EXECUTION_HOLD = "execution-hold",
  ONCHAIN_ACTION = "onchain-action",
  ONCHAIN_TRANSACTION_REQUEST = "onchain-transaction-request",
  ONCHAIN_TRANSACTION_ACCEPT = "onchain-transaction-accept",
  ONCHAIN_TRANSACTION_RESET = "onchain-transaction-reset",
  ONCHAIN_RESULT = "onchain-result",
}
