import {
  DeployContractInteraction,
  ExecutionResult,
  ExecutionResultTypes,
  JournalableMessage,
  OnchainInteraction,
  OnchainResult,
} from "../../types/journal";

export function isExecutionResult(
  potential: JournalableMessage
): potential is ExecutionResult {
  const resultTypes: ExecutionResultTypes = [
    "execution-success",
    "execution-failure",
    "execution-hold",
  ];

  return (resultTypes as string[]).includes(potential.type);
}

export function isExecutionMessage(
  potential: JournalableMessage
): potential is ExecutionResult {
  return isExecutionResult(potential);
}

export function isOnChainAction(
  potential: JournalableMessage
): potential is OnchainInteraction {
  const resultTypes = ["onchain-action"];

  return resultTypes.includes(potential.type);
}

export function isOnchainResult(
  potential: JournalableMessage
): potential is OnchainResult {
  const resultTypes = ["onchain-result"];

  return resultTypes.includes(potential.type);
}

export function isDeployContractInteraction(
  potential: JournalableMessage
): potential is DeployContractInteraction {
  return isOnChainAction(potential) && potential.subtype === "deploy-contract";
}
