import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import { DeploymentExecutionState } from "../types/execution-state";

export function findDeploymentExecutionStateBy(
  deployment: DeploymentState,
  futureId: string
): DeploymentExecutionState | undefined {
  const exState = deployment.executionStates[futureId];

  if (exState === undefined) {
    return undefined;
  }

  assertIgnitionInvariant(
    exState.type === "DEPLOYMENT_EXECUTION_STATE",
    `Expected execution state for ${futureId} to be a deployment execution state, but instead it was ${exState.type}`
  );

  return exState;
}
