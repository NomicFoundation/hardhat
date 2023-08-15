import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import {
  CallExecutionState,
  ExecutionSateType,
} from "../types/execution-state";

export function findCallExecutionStateBy(
  deployment: DeploymentState,
  futureId: string
): CallExecutionState {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    exState.type === ExecutionSateType.CALL_EXECUTION_STATE,
    `Expected execution state for ${futureId} to be a call execution state, but instead it was ${exState.type}`
  );

  return exState;
}
