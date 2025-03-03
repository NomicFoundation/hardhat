import { DeploymentState } from "../../execution/types/deployment-state.js";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state.js";

export function getNetworkExecutionStates(
  deploymentState: DeploymentState,
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
      exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
      exState.type === ExecutionSateType.CALL_EXECUTION_STATE ||
      exState.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE ||
      exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE
    ) {
      exStates.push(exState);
    }
  }

  return exStates;
}
