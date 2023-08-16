import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import {
  ExecutionSateType,
  StaticCallExecutionState,
} from "../types/execution-state";

export function findStaticCallExecutionStateBy(
  deployment: DeploymentState,
  futureId: string
): StaticCallExecutionState {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
    `Expected execution state for ${futureId} to be a static call execution state, but instead it was ${exState.type}`
  );

  return exState;
}
