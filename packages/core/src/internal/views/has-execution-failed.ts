import { Future } from "../../types/module";
import { DeploymentState } from "../execution/types/deployment-state";
import { ExecutionStatus } from "../execution/types/execution-state";

/**
 * Returns true if the execution of the given future has failed.
 *
 * @param future The future.
 * @param deploymentState The deployment state to check against.
 * @returns true if it failed.
 */
export function hasExecutionFailed(
  future: Future,
  deploymentState: DeploymentState
): boolean {
  const exState = deploymentState.executionStates[future.id];
  if (exState === undefined) {
    return false;
  }

  return (
    exState.status === ExecutionStatus.FAILED ||
    exState.status === ExecutionStatus.TIMEOUT
  );
}
