import { MapExStateTypeToExState } from "../execution/type-helpers";
import { DeploymentState } from "../execution/types/deployment-state";
import { ExecutionSateType } from "../execution/types/execution-state";

export function findExecutionStatesByType<ExStateT extends ExecutionSateType>(
  exStateType: ExStateT,
  deployment: DeploymentState,
): Array<MapExStateTypeToExState<ExStateT>> {
  const exStates = Object.values(deployment.executionStates).filter(
    (exs) => exs.type === exStateType,
  );

  return exStates as Array<MapExStateTypeToExState<ExStateT>>;
}
