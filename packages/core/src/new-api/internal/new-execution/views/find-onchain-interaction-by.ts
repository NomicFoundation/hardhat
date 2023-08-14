import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import { OnchainInteraction } from "../types/network-interaction";

import { findDeploymentExecutionStateBy } from "./find-deployment-execution-state-by";

export function findOnchainInteractionBy(
  deploymentState: DeploymentState,
  futureId: string,
  networkInteractionId: number
): OnchainInteraction {
  const deploymentExecutionState = findDeploymentExecutionStateBy(
    deploymentState,
    futureId
  );

  const onchainInteraction = deploymentExecutionState.networkInteractions.find(
    (interaction) => interaction.id === networkInteractionId
  );

  assertIgnitionInvariant(
    onchainInteraction !== undefined,
    `Expected network interaction ${futureId}/${networkInteractionId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    onchainInteraction.type === "ONCHAIN_INTERACTION",
    `Expected network interaction ${futureId}/${networkInteractionId} to be an onchain interaction, but instead it was ${onchainInteraction.type}`
  );

  return onchainInteraction;
}
