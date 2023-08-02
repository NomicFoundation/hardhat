import { JournalMessageType } from "./journal";

export type RunLevelJournalMessage = StartRunMessage | WipeMessage;

/**
 * A message indicating the start of a new run.
 *
 * @beta
 */
export interface StartRunMessage {
  // TODO: we should add chain id, so we can reconcile on previous chain id
  type: JournalMessageType.RUN_START;
}

/**
 * A journal message indicating the user has instructed Ignition to clear
 * the futures state so it can be rerun.
 *
 * @beta
 */
export interface WipeMessage {
  type: JournalMessageType.WIPE;
  futureId: string;
}
