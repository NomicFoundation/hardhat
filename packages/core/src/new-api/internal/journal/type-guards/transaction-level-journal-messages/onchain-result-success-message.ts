import {
  JournalMessageType,
  JournalableMessage,
  OnchainCallFunctionSuccessMessage,
  OnchainContractAtSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainReadEventArgumentSuccessMessage,
  OnchainResultMessage,
  OnchainResultSuccessMessage,
  OnchainSendDataSuccessMessage,
  OnchainStaticCallSuccessMessage,
} from "../../types";

export function isOnchainResultSuccessMessage(
  potential: JournalableMessage
): potential is OnchainResultSuccessMessage {
  return (
    isOnchainDeployContractSuccessMessage(potential) ||
    isOnchainCallFunctionSuccessMessage(potential) ||
    isOnchainStaticCallSuccessMessage(potential) ||
    isOnchainReadEventArgumentSuccessMessage(potential) ||
    isOnchainSendDataSuccessMessage(potential) ||
    isOnchainContractAtSuccessMessage(potential)
  );
}

export function isOnchainDeployContractSuccessMessage(
  message: JournalableMessage
): message is OnchainDeployContractSuccessMessage {
  return (
    _isTypeOnchainResult(message) &&
    message.subtype === "deploy-contract-success"
  );
}

export function isOnchainCallFunctionSuccessMessage(
  message: JournalableMessage
): message is OnchainCallFunctionSuccessMessage {
  return (
    _isTypeOnchainResult(message) && message.subtype === "call-function-success"
  );
}

export function isOnchainStaticCallSuccessMessage(
  message: JournalableMessage
): message is OnchainStaticCallSuccessMessage {
  return (
    _isTypeOnchainResult(message) && message.subtype === "static-call-success"
  );
}

export function isOnchainReadEventArgumentSuccessMessage(
  message: JournalableMessage
): message is OnchainReadEventArgumentSuccessMessage {
  return (
    _isTypeOnchainResult(message) &&
    message.subtype === "read-event-arg-success"
  );
}

export function isOnchainSendDataSuccessMessage(
  message: JournalableMessage
): message is OnchainSendDataSuccessMessage {
  return (
    _isTypeOnchainResult(message) && message.subtype === "send-data-success"
  );
}

export function isOnchainContractAtSuccessMessage(
  message: JournalableMessage
): message is OnchainContractAtSuccessMessage {
  return (
    _isTypeOnchainResult(message) && message.subtype === "contract-at-success"
  );
}

function _isTypeOnchainResult(
  potential: JournalableMessage
): potential is OnchainResultMessage {
  return potential.type === JournalMessageType.ONCHAIN_RESULT;
}
