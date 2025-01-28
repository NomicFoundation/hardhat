import { produce } from "immer";

import { assertIgnitionInvariant } from "../../../utils/assertions";
import { DeploymentState } from "../../types/deployment-state";
import { WipeExecutionStateMessage } from "../../types/messages";

/**
 * Removes an existing execution state from the deployment state.
 *
 * @param state - The deployment state.
 * @param message - The message containing the info of the execution state to remove.
 * @returns - a copy of the deployment state with the execution state removed.
 */
export function wipeExecutionState(
  deploymentState: DeploymentState,
  message: WipeExecutionStateMessage
): DeploymentState {
  return produce(deploymentState, (draft: DeploymentState): void => {
    assertIgnitionInvariant(
      draft.executionStates[message.futureId] !== undefined,
      `ExecutionState ${message.futureId} must exist to be wiped.`
    );

    delete draft.executionStates[message.futureId];
  });
}
