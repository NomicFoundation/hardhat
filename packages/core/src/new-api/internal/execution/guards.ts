import {
  CallFunctionInteractionMessage,
  DeployContractInteractionMessage,
  DeployedContractExecutionSuccess,
  ExecutionFailure,
  ExecutionHold,
  ExecutionResultMessage,
  ExecutionSuccess,
  JournalableMessage,
  OnchainInteractionMessage,
  ReadEventArgumentInteractionMessage,
  StaticCallInteractionMessage,
} from "../../types/journal";

export function isExecutionResultMessage(
  potential: JournalableMessage
): potential is ExecutionResultMessage {
  return (
    isExecutionSuccess(potential) ||
    isExecutionFailure(potential) ||
    isExecutionHold(potential)
  );
}

export function isExecutionSuccess(
  potential: JournalableMessage
): potential is ExecutionSuccess {
  return potential.type === "execution-success";
}

export function isExecutionFailure(
  potential: JournalableMessage
): potential is ExecutionFailure {
  return potential.type === "execution-failure";
}

export function isExecutionHold(
  potential: JournalableMessage
): potential is ExecutionHold {
  return potential.type === "execution-hold";
}

export function isOnChainAction(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  return potential.type === "onchain-action";
}

export function isOnchainInteractionMessage(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  return (
    isDeployContractInteraction(potential) ||
    isCallFunctionInteraction(potential) ||
    isStaticCallInteraction(potential)
  );
}

export function isDeployContractInteraction(
  potential: JournalableMessage
): potential is DeployContractInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "deploy-contract";
}

export function isCallFunctionInteraction(
  potential: JournalableMessage
): potential is CallFunctionInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "call-function";
}

export function isStaticCallInteraction(
  potential: JournalableMessage
): potential is StaticCallInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "static-call";
}

export function isReadEventArgumentInteraction(
  potential: JournalableMessage
): potential is ReadEventArgumentInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "read-event-arg";
}

export function isDeployedContractExecutionSuccess(
  potential: JournalableMessage
): potential is DeployedContractExecutionSuccess {
  return (
    isExecutionSuccess(potential) && potential.subtype === "deploy-contract"
  );
}
