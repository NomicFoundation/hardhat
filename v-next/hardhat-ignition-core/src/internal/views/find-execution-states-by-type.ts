import type { MapExStateTypeToExState } from "../execution/type-helpers";
import type { DeploymentState } from "../execution/types/deployment-state";
import type { ExecutionSateType } from "../execution/types/execution-state";

export function findExecutionStatesByType<ExStateT extends ExecutionSateType>(
  exStateType: ExStateT,
  deployment: DeploymentState,
): Array<MapExStateTypeToExState<ExStateT>> {
  const exStates = Object.values(deployment.executionStates).filter(
    (exs) => exs.type === exStateType,
  );

  return exStates as Array<MapExStateTypeToExState<ExStateT>>;
}
