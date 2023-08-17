import { DeploymentState } from "../types/deployment-state";
import { ExecutionStatus } from "../types/execution-state";

/**
 * Determine if an execution state has reached completion, either
 * completing successfully or failing or timing out.
 *
 * @param deploymentState - the root deployment state
 * @param futureId - the id of the future to check
 * @returns true if the execution state is complete, false if it does
 * not exist or is not complete
 */
export function isExecutionStateComplete(
  deploymentState: DeploymentState,
  futureId: string
) {
  const exState = deploymentState.executionStates[futureId];

  return exState !== undefined && exState.status !== ExecutionStatus.STARTED;
}
