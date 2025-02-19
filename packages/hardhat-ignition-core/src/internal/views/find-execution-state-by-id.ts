import { MapExStateTypeToExState } from "../execution/type-helpers";
import { DeploymentState } from "../execution/types/deployment-state";
import { ExecutionStateType } from "../execution/types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";

export function findExecutionStateById<ExStateT extends ExecutionStateType>(
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
