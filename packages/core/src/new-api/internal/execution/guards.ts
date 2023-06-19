import {
  DeployContractInteractionMessage,
  ExecutionResultMessage,
  ExecutionResultTypes,
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

export function isExecutionMessage(
  potential: JournalableMessage
): potential is ExecutionResultMessage {
  return isExecutionResult(potential);
}

export function isOnChainAction(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  const resultTypes = ["onchain-action"];

  return resultTypes.includes(potential.type);
}

export function isOnchainResult(
  potential: JournalableMessage
): potential is OnchainResultMessage {
  const resultTypes = ["onchain-result"];

  return resultTypes.includes(potential.type);
}

export function isDeployContractInteraction(
  potential: JournalableMessage
): potential is DeployContractInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "deploy-contract";
}
