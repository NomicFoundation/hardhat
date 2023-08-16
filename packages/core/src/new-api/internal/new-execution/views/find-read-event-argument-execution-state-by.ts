import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import {
  ExecutionSateType,
  ReadEventArgumentExecutionState,
} from "../types/execution-state";

export function findReadEventArgumentExecutionStateBy(
  deployment: DeploymentState,
  futureId: string
): ReadEventArgumentExecutionState {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    exState.type === ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
    `Expected execution state for ${futureId} to be a read event argument execution state, but instead it was ${exState.type}`
  );

  return exState;
}
