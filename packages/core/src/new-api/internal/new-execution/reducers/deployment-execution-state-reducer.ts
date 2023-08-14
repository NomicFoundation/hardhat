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
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../types/messages";
import { findOnchainInteractionBy } from "../views/deployment-execution-state/find-onchain-interaction-by";
import { findTransactionBy } from "../views/deployment-execution-state/find-transaction-by";

export function deploymentExecutionStateReducer(
  state: DeploymentExecutionState,
  action:
    | DeploymentExecutionStateInitializeMessage
    | NetworkInteractionRequestMessage
    | TransactionSendMessage
    | TransactionConfirmMessage
    | DeploymentExecutionStateCompleteMessage
): DeploymentExecutionState {
  switch (action.type) {
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
      return initialiseDeploymentExecutionStateFrom(action);
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
      return appendNetworkInteraction(state, action);
    case JournalMessageType.TRANSACTION_SEND:
      return appendTransactionToOnchainInteraction(state, action);
    case JournalMessageType.TRANSACTION_CONFIRM:
      return confirmTransaction(state, action);
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE:
      return completeDeploymentExecutionState(state, action.result);
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

function appendNetworkInteraction(
  state: DeploymentExecutionState,
  action: NetworkInteractionRequestMessage
) {
  return produce(state, (draft: DeploymentExecutionState): void => {
    draft.networkInteractions.push(action.networkInteraction);
  });
}

function appendTransactionToOnchainInteraction(
  state: DeploymentExecutionState,
  action: TransactionSendMessage
): DeploymentExecutionState {
  return produce(state, (draft: DeploymentExecutionState): void => {
    const onchainInteraction = findOnchainInteractionBy(
      draft,
      action.networkInteractionId
    );

    onchainInteraction.transactions.push(action.transaction);
  });
}

function confirmTransaction(
  state: DeploymentExecutionState,
  action: TransactionConfirmMessage
) {
  return produce(state, (draft: DeploymentExecutionState): void => {
    const onchainInteraction = findOnchainInteractionBy(
      draft,
      action.networkInteractionId
    );

    const transaction = findTransactionBy(
      draft,
      action.networkInteractionId,
      action.hash
    );

    transaction.receipt = action.receipt;
    onchainInteraction.transactions = [transaction];
  });
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
