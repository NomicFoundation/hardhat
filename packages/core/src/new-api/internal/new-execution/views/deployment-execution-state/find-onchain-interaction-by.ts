import { assertIgnitionInvariant } from "../../../utils/assertions";
import {
  CallExecutionState,
  DeploymentExecutionState,
} from "../../types/execution-state";
import { OnchainInteraction } from "../../types/network-interaction";

export function findOnchainInteractionBy(
  executionState: DeploymentExecutionState | CallExecutionState,
  networkInteractionId: number
): OnchainInteraction {
  const onchainInteraction = executionState.networkInteractions.find(
    (interaction) => interaction.id === networkInteractionId
  );

  assertIgnitionInvariant(
    onchainInteraction !== undefined,
    `Expected network interaction ${executionState.id}/${networkInteractionId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    onchainInteraction.type === "ONCHAIN_INTERACTION",
    `Expected network interaction ${executionState.id}/${networkInteractionId} to be an onchain interaction, but instead it was ${onchainInteraction.type}`
  );

  return onchainInteraction;
}
