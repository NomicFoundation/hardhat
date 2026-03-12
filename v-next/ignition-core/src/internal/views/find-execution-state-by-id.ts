import type { MapExStateTypeToExState } from "../execution/type-helpers.js";
import type { DeploymentState } from "../execution/types/deployment-state.js";
import type { ExecutionSateType } from "../execution/types/execution-state.js";

import { assertIgnitionInvariant } from "../utils/assertions.js";

export function findExecutionStateById<ExStateT extends ExecutionSateType>(
  exStateType: ExStateT,
  deployment: DeploymentState,
  futureId: string,
): MapExStateTypeToExState<ExStateT> {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`,
  );

  assertIgnitionInvariant(
    exState.type === exStateType,
    `Expected execution state for ${futureId} to be a ${exStateType}, but instead it was ${exState.type}`,
  );

  return exState as MapExStateTypeToExState<ExStateT>;
}
