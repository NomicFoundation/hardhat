import type {
  CallFunctionInteractionMessage,
  ContractAtInteractionMessage,
  DeployContractInteractionMessage,
  JournalableMessage,
  OnchainInteractionMessage,
  ReadEventArgumentInteractionMessage,
  SendDataInteractionMessage,
  StaticCallInteractionMessage,
} from "../../types";

export function isOnchainInteractionMessage(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  return (
    isDeployContractInteraction(potential) ||
    isCallFunctionInteraction(potential) ||
    isStaticCallInteraction(potential) ||
    isReadEventArgumentInteraction(potential) ||
    isSendDataInteraction(potential) ||
    isContractAtInteraction(potential)
  );
}

export function isDeployContractInteraction(
  potential: JournalableMessage
): potential is DeployContractInteractionMessage {
  return (
    _isTypeOnchainAction(potential) && potential.subtype === "deploy-contract"
  );
}

export function isCallFunctionInteraction(
  potential: JournalableMessage
): potential is CallFunctionInteractionMessage {
  return (
    _isTypeOnchainAction(potential) && potential.subtype === "call-function"
  );
}

export function isStaticCallInteraction(
  potential: JournalableMessage
): potential is StaticCallInteractionMessage {
  return _isTypeOnchainAction(potential) && potential.subtype === "static-call";
}

export function isReadEventArgumentInteraction(
  potential: JournalableMessage
): potential is ReadEventArgumentInteractionMessage {
  return (
    _isTypeOnchainAction(potential) && potential.subtype === "read-event-arg"
  );
}

export function isSendDataInteraction(
  potential: JournalableMessage
): potential is SendDataInteractionMessage {
  return _isTypeOnchainAction(potential) && potential.subtype === "send-data";
}

export function isContractAtInteraction(
  potential: JournalableMessage
): potential is ContractAtInteractionMessage {
  return _isTypeOnchainAction(potential) && potential.subtype === "contract-at";
}

function _isTypeOnchainAction(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  return potential.type === "onchain-action";
}
