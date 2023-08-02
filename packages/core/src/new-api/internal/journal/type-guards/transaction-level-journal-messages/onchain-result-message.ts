import {
  JournalMessageType,
  JournalableMessage,
  OnchainFailureMessage,
  OnchainResultMessage,
} from "../../types";

import { isOnchainResultSuccessMessage } from "./onchain-result-success-message";

export * from "./onchain-result-success-message";

export function isOnChainResultMessage(
  potential: JournalableMessage
): potential is OnchainResultMessage {
  return (
    isOnchainResultSuccessMessage(potential) ||
    isOnchainFailureMessage(potential)
  );
}

export function isOnchainFailureMessage(
  potential: JournalableMessage
): potential is OnchainFailureMessage {
  return (
    potential.type === JournalMessageType.ONCHAIN_RESULT &&
    potential.subtype === "failure"
  );
}
