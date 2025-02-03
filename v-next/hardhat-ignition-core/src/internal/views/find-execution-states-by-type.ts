import type { MapExStateTypeToExState } from "../execution/type-helpers.js";
import type { DeploymentState } from "../execution/types/deployment-state.js";
import type { ExecutionSateType } from "../execution/types/execution-state.js";

export function findExecutionStatesByType<ExStateT extends ExecutionSateType>(
  exStateType: ExStateT,
  deployment: DeploymentState,
): Array<MapExStateTypeToExState<ExStateT>> {
  const exStates = Object.values(deployment.executionStates).filter(
    (exs) => exs.type === exStateType,
  );

  return exStates as Array<MapExStateTypeToExState<ExStateT>>;
}
