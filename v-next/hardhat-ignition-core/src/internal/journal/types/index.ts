import type { JournalMessage } from "../../execution/types/messages.js";

/**
 * Store a deployments execution state as a transaction log.
 *
 * @beta
 */
export interface Journal {
  record(message: JournalMessage): void;

  read(): AsyncGenerator<JournalMessage>;
}
