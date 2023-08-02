import { JournalMessageType } from "../journal";

import { OnchainResultSuccessMessage } from "./onchain-result-success-message";

export * from "./onchain-result-success-message";

/**
 * A journal message indicating a transaction service transaction result.
 *
 * @beta
 */
export type OnchainResultMessage =
  | OnchainResultSuccessMessage
  | OnchainFailureMessage;

/**
 * A failed on-chain transaction result.
 *
 * @beta
 */
export interface OnchainFailureMessage {
  type: JournalMessageType.ONCHAIN_RESULT;
  subtype: "failure";
  futureId: string;
  executionId: number;
  error: Error;
}
