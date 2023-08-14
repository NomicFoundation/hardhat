import { assertIgnitionInvariant } from "../../../utils/assertions";
import { DeploymentExecutionState } from "../../types/execution-state";
import { OnchainInteraction } from "../../types/network-interaction";

export function findOnchainInteractionBy(
  deploymentExecutionState: DeploymentExecutionState,
  networkInteractionId: number
): OnchainInteraction {
  const onchainInteraction = deploymentExecutionState.networkInteractions.find(
    (interaction) => interaction.id === networkInteractionId
  );

  assertIgnitionInvariant(
    onchainInteraction !== undefined,
    `Expected network interaction ${deploymentExecutionState.id}/${networkInteractionId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    onchainInteraction.type === "ONCHAIN_INTERACTION",
    `Expected network interaction ${deploymentExecutionState.id}/${networkInteractionId} to be an onchain interaction, but instead it was ${onchainInteraction.type}`
  );

  return onchainInteraction;
}
