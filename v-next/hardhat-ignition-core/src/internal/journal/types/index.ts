import type { JournalMessage } from "../../execution/types/messages.js";

/**
 * Store a deployments execution state as a transaction log.
 *
 * @beta
 */
export interface Journal {
  /**
   * Records a message to the journal synchronously.
   *
   * This function is async only to call an async event emitter, but every
   * implementation MUST ensure that:
   *  - The message is recorded before emitting the event.
   *  - The message recording is synchronous.
   *  - The event is only emitted after any write operation successfully ended.
   */
  record(message: JournalMessage): Promise<void>;

  read(): AsyncGenerator<JournalMessage>;
}
