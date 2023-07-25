import {
  CallFunctionInteractionMessage,
  CalledFunctionExecutionSuccess,
  ContractAtExecutionSuccess,
  ContractAtInteractionMessage,
  DeployContractInteractionMessage,
  DeployedContractExecutionSuccess,
  ExecutionFailure,
  ExecutionHold,
  ExecutionResultMessage,
  ExecutionSuccess,
  ExecutionTimeout,
  JournalableMessage,
  OnchainInteractionMessage,
  ReadEventArgumentExecutionSuccess,
  ReadEventArgumentInteractionMessage,
  SendDataExecutionSuccess,
  SendDataInteractionMessage,
  StaticCallExecutionSuccess,
  StaticCallInteractionMessage,
} from "../types/journal";

export function isExecutionResultMessage(
  potential: JournalableMessage
): potential is ExecutionResultMessage {
  return (
    isExecutionSuccess(potential) ||
    isExecutionTimeout(potential) ||
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

export function isExecutionTimeout(
  potential: JournalableMessage
): potential is ExecutionTimeout {
  return potential.type === "execution-timeout";
}

export function isExecutionHold(
  potential: JournalableMessage
): potential is ExecutionHold {
  return potential.type === "execution-hold";
}

function isOnChainAction(
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
    isStaticCallInteraction(potential) ||
    isReadEventArgumentInteraction(potential) ||
    isSendDataInteraction(potential) ||
    isContractAtInteraction(potential)
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

export function isSendDataInteraction(
  potential: JournalableMessage
): potential is SendDataInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "send-data";
}

export function isContractAtInteraction(
  potential: JournalableMessage
): potential is ContractAtInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "contract-at";
}

export function isDeployedContractExecutionSuccess(
  potential: JournalableMessage
): potential is DeployedContractExecutionSuccess {
  return (
    isExecutionSuccess(potential) && potential.subtype === "deploy-contract"
  );
}

export function isCalledFunctionExecutionSuccess(
  potential: JournalableMessage
): potential is CalledFunctionExecutionSuccess {
  return isExecutionSuccess(potential) && potential.subtype === "call-function";
}

export function isStaticCallExecutionSuccess(
  potential: JournalableMessage
): potential is StaticCallExecutionSuccess {
  return isExecutionSuccess(potential) && potential.subtype === "static-call";
}

export function isReadEventArgumentExecutionSuccess(
  potential: JournalableMessage
): potential is ReadEventArgumentExecutionSuccess {
  return (
    isExecutionSuccess(potential) && potential.subtype === "read-event-arg"
  );
}

export function isSendDataExecutionSuccess(
  potential: JournalableMessage
): potential is SendDataExecutionSuccess {
  return isExecutionSuccess(potential) && potential.subtype === "send-data";
}

export function isContractAtExecutionSuccess(
  potential: JournalableMessage
): potential is ContractAtExecutionSuccess {
  return isExecutionSuccess(potential) && potential.subtype === "contract-at";
}
