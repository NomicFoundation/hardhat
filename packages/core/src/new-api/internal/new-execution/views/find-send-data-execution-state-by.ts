import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import {
  ExecutionSateType,
  SendDataExecutionState,
} from "../types/execution-state";

export function findSendDataExecutionStateBy(
  deployment: DeploymentState,
  futureId: string
): SendDataExecutionState {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    exState.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE,
    `Expected execution state for ${futureId} to be a send data execution state, but instead it was ${exState.type}`
  );

  return exState;
}
