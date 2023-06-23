import {
  CallFunctionInteractionMessage,
  DeployContractInteractionMessage,
  DeployedContractExecutionSuccess,
  ExecutionResultMessage,
  ExecutionResultTypes,
  ExecutionSuccess,
  JournalableMessage,
  OnchainInteractionMessage,
  OnchainResultMessage,
} from "../../types/journal";

export function isExecutionResult(
  potential: JournalableMessage
): potential is ExecutionResultMessage {
  const resultTypes: ExecutionResultTypes = [
    "execution-success",
    "execution-failure",
    "execution-hold",
  ];

  return (resultTypes as string[]).includes(potential.type);
}

export function isExecutionSuccess(
  potential: JournalableMessage
): potential is ExecutionSuccess {
  return potential.type === "execution-success";
}

export function isExecutionMessage(
  potential: JournalableMessage
): potential is ExecutionResultMessage {
  return isExecutionResult(potential);
}

export function isOnChainAction(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  return potential.type === "onchain-action";
}

export function isOnchainResult(
  potential: JournalableMessage
): potential is OnchainResultMessage {
  const resultTypes = ["onchain-result"];

  return resultTypes.includes(potential.type);
}

export function isOnchainInteractionMessage(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  return (
    isDeployContractInteraction(potential) ||
    isCallFunctionInteraction(potential)
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

export function isDeployedContractExecutionSuccess(
  potential: JournalableMessage
): potential is DeployedContractExecutionSuccess {
  return (
    isExecutionSuccess(potential) && potential.subtype === "deploy-contract"
  );
}
