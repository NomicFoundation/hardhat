import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
} from "../types/messages";
import { assertUnknownAction } from "./utils";

export function deploymentExecutionStateReducer(
  state: DeploymentExecutionState,
  action:
    | DeploymentExecutionStateInitializeMessage
    | NetworkInteractionRequestMessage
): DeploymentExecutionState {
  switch (action.type) {
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
      return initialiseDeploymentExecutionStateFrom(action);
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
      return {
        ...state,
        networkInteractions: [action.networkInteraction],
      };
    default:
      return assertUnknownAction(action);
  }
}

function initialiseDeploymentExecutionStateFrom(
  action: DeploymentExecutionStateInitializeMessage
): DeploymentExecutionState {
  const deploymentExecutionInitialState: DeploymentExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: action.futureType,
    strategy: action.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactFutureId: action.artifactFutureId,
    contractName: action.contractName,
    constructorArgs: action.constructorArgs,
    libraries: action.libraries,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return deploymentExecutionInitialState;
}
