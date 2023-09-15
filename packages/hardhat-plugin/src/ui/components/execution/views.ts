import { UiState, UiStateDeploymentStatus } from "../../types";

/**
 * Determine whether any on-chain executions happened in this
 * run. An execution that requires on-chain updates in this
 * run will have batches, a lack of batches indicates nothing
 * to execute or execution happened on a previous run.
 * @param state the deploy state
 * @returns whether on-chain executions happened in this run
 */
export function viewEverythingExecutedAlready(state: UiState): boolean {
  return (
    state.status !== UiStateDeploymentStatus.UNSTARTED &&
    state.batches.length === 0
  );
}
