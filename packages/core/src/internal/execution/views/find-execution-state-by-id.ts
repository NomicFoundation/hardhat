import { assertIgnitionInvariant } from "../../utils/assertions";
import { MapExStateTypeToExState } from "../type-helpers";
import { DeploymentState } from "../types/deployment-state";
import { ExecutionSateType } from "../types/execution-state";

export function findExecutionStateById<ExStateT extends ExecutionSateType>(
  exStateType: ExStateT,
  deployment: DeploymentState,
  futureId: string
): MapExStateTypeToExState<ExStateT> {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    exState.type === exStateType,
    `Expected execution state for ${futureId} to be a ${exStateType}, but instead it was ${exState.type}`
  );

  return exState as MapExStateTypeToExState<ExStateT>;
}
