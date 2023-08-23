import { DeployState } from "@ignored/ignition-core/soon-to-be-removed";

/**
 * Determine whether any on-chain executions happened in this
 * run. An execution that requires on-chain updates in this
 * run will have batches, a lack of batches indicates nothing
 * to execute or execution happened on a previous run.
 * @param deployState the deploy state
 * @returns whether on-chain executions happened in this run
 */
export function viewEverthingExecutedAlready(deployState: DeployState) {
  return (
    deployState.execution.batch === null &&
    deployState.execution.previousBatches.length === 0
  );
}
