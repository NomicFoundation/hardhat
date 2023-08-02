import { JournalMessageType } from "../journal";

import { OnchainInteractionMessage } from "./onchain-interaction-message";
import { OnchainResultMessage } from "./onchain-result-message";

export * from "./onchain-interaction-message";
export * from "./onchain-result-message";

/**
 * The journal message relating to transaction service state.
 *
 * @beta
 */
export type TransactionLevelJournalMessage =
  | OnchainInteractionMessage
  | OnchainTransactionRequest
  | OnchainTransactionAccept
  | OnchainTransactionReset
  | OnchainResultMessage;

/**
 * Records a transaction submission to the chain.
 *
 * @beta
 */
export interface OnchainTransactionRequest {
  type: JournalMessageType.ONCHAIN_TRANSACTION_REQUEST;
  futureId: string;
  executionId: number;
  from: string;
  nonce: number;
  tx: any;
}

/**
 * Records a transaction submission being accepted in the mempool.
 *
 * @beta
 */
export interface OnchainTransactionAccept {
  type: JournalMessageType.ONCHAIN_TRANSACTION_ACCEPT;
  futureId: string;
  executionId: number;
  txHash: string;
}

/**
 * Records a transaction submission being reset, so it can be resent.
 *
 * @beta
 */
export interface OnchainTransactionReset {
  type: JournalMessageType.ONCHAIN_TRANSACTION_RESET;
  futureId: string;
  executionId: number;
}
