import { DeploymentState } from "../../execution/types/deployment-state";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionStateType,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";

export function getNetworkExecutionStates(
  deploymentState: DeploymentState
): Array<
  | DeploymentExecutionState
  | CallExecutionState
  | SendDataExecutionState
  | StaticCallExecutionState
> {
  const exStates: Array<
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
    | StaticCallExecutionState
  > = [];

  for (const exState of Object.values(deploymentState.executionStates)) {
    if (
      exState.type === ExecutionStateType.DEPLOYMENT_EXECUTION_STATE ||
      exState.type === ExecutionStateType.CALL_EXECUTION_STATE ||
      exState.type === ExecutionStateType.SEND_DATA_EXECUTION_STATE ||
      exState.type === ExecutionStateType.STATIC_CALL_EXECUTION_STATE
    ) {
      exStates.push(exState);
    }
  }

  return exStates;
}
