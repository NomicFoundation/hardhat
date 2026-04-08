import type { DeploymentState } from "../execution/types/deployment-state.js";

import { ExecutionStatus } from "../execution/types/execution-state.js";

/**
 * Have the futures making up a batch finished executing, as defined by
 * no longer being `STARTED`, so they have succeeded, failed, or timed out.
 *
 * @param deploymentState - the deployment state
 * @param batch - the list of future ids of the futures in the batch
 * @returns true if all futures in the batch have finished executing
 */
export function isBatchFinished(
  deploymentState: DeploymentState,
  batch: string[],
): boolean {
  return batch
    .map((futureId) => deploymentState.executionStates[futureId])
    .every(
      (exState) =>
        exState !== undefined && exState.status !== ExecutionStatus.STARTED,
    );
}
