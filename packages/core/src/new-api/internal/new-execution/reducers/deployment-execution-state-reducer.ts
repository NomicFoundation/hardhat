import { produce } from "immer";

import {
  DeploymentExecutionResult,
  ExecutionResultType,
} from "../types/execution-result";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";
import {
  DeploymentExecutionStateCompleteMessage,
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
  StaticCallCompleteMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../types/messages";

import {
  appendNetworkInteraction,
  appendTransactionToOnchainInteraction,
  completeStaticCall,
  confirmTransaction,
} from "./network-interaction-helpers";

export function deploymentExecutionStateReducer(
  state: DeploymentExecutionState,
  action:
    | DeploymentExecutionStateInitializeMessage
    | DeploymentExecutionStateCompleteMessage
    | NetworkInteractionRequestMessage
    | TransactionSendMessage
    | TransactionConfirmMessage
    | StaticCallCompleteMessage
): DeploymentExecutionState {
  switch (action.type) {
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
      return initialiseDeploymentExecutionStateFrom(action);
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE:
      return completeDeploymentExecutionState(state, action.result);
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
      return appendNetworkInteraction(state, action);
    case JournalMessageType.TRANSACTION_SEND:
      return appendTransactionToOnchainInteraction(state, action);
    case JournalMessageType.TRANSACTION_CONFIRM:
      return confirmTransaction(state, action);
    case JournalMessageType.STATIC_CALL_COMPLETE:
      return completeStaticCall(state, action);
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

function completeDeploymentExecutionState(
  state: DeploymentExecutionState,
  result: DeploymentExecutionResult
): DeploymentExecutionState {
  return produce(state, (draft: DeploymentExecutionState): void => {
    draft.status = _mapExecutionResultTypeToExecutionStatus(result);
    draft.result = result;
  });
}

function _mapExecutionResultTypeToExecutionStatus(
  result: DeploymentExecutionResult
) {
  switch (result.type) {
    case ExecutionResultType.SUCCESS: {
      return ExecutionStatus.SUCCESS;
    }
    case ExecutionResultType.REVERTED_TRANSACTION: {
      return ExecutionStatus.FAILED;
    }
    case ExecutionResultType.STATIC_CALL_ERROR: {
      return ExecutionStatus.FAILED;
    }
    case ExecutionResultType.STRATEGY_ERROR: {
      return ExecutionStatus.FAILED;
    }
    case ExecutionResultType.SIMULATION_ERROR: {
      return ExecutionStatus.FAILED;
    }
  }
}
