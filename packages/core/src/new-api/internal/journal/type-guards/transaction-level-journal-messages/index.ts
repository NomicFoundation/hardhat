import {
  JournalableMessage,
  OnchainTransactionAccept,
  OnchainTransactionRequest,
  OnchainTransactionReset,
  TransactionLevelJournalMessage,
} from "../../types";

import { isOnchainInteractionMessage } from "./onchain-interaction-message";
import { isOnChainResultMessage } from "./onchain-result-message";

export * from "./onchain-interaction-message";
export * from "./onchain-result-message";

export function isTransactionMessage(
  message: JournalableMessage
): message is TransactionLevelJournalMessage {
  return (
    isOnchainInteractionMessage(message) ||
    isOnchainTransactionRequest(message) ||
    isOnchainTransactionAccept(message) ||
    isOnchainTransactionReset(message) ||
    isOnChainResultMessage(message)
  );
}

export function isOnchainTransactionRequest(
  message: JournalableMessage
): message is OnchainTransactionRequest {
  return message.type === "onchain-transaction-request";
}

export function isOnchainTransactionAccept(
  message: JournalableMessage
): message is OnchainTransactionAccept {
  return message.type === "onchain-transaction-accept";
}

export function isOnchainTransactionReset(
  message: JournalableMessage
): message is OnchainTransactionReset {
  return message.type === "onchain-transaction-reset";
}
