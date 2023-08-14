import { assertIgnitionInvariant } from "../../utils/assertions";
import { isOnchainInteraction } from "../type-guards/network-interaction";
import {
  DeploymentExecutionResult,
  ExecutionResultType,
} from "../types/execution-result";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";
import { Transaction } from "../types/jsonrpc";
import {
  DeploymentExecutionStateCompleteMessage,
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../types/messages";
import {
  NetworkInteraction,
  OnchainInteraction,
} from "../types/network-interaction";

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
      return appendNetworkInteraction(state, action.networkInteraction);
    case JournalMessageType.TRANSACTION_SEND:
      return appendTransaction(
        state,
        action.networkInteractionId,
        action.transaction
      );
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
  networkInteraction: NetworkInteraction
) {
  return {
    ...state,
    networkInteractions: [...state.networkInteractions, networkInteraction],
  };
}

function appendTransaction(
  state: DeploymentExecutionState,
  networkInteractionId: number,
  transaction: Transaction
): DeploymentExecutionState {
  return _updateOnchainInteraction(
    state,
    networkInteractionId,
    (onchainInteraction) => {
      return {
        ...onchainInteraction,
        transactions: [...onchainInteraction.transactions, transaction],
      };
    }
  );
}

function confirmTransaction(
  state: DeploymentExecutionState,
  action: TransactionConfirmMessage
) {
  return _updateOnchainInteraction(
    state,
    action.networkInteractionId,
    (interaction) => {
      const confirmedTransaction = interaction.transactions.find(
        (tx) => tx.hash === action.hash
      );

      assertIgnitionInvariant(
        confirmedTransaction !== undefined,
        `Unable to find confirmed transaction ${action.hash} in interaction ${action.networkInteractionId}`
      );

      return {
        ...interaction,
        transactions: [
          {
            ...confirmedTransaction,
            receipt: action.receipt,
          },
        ],
      };
    }
  );
}

function completeDeploymentExecutionState(
  state: DeploymentExecutionState,
  result: DeploymentExecutionResult
): DeploymentExecutionState {
  switch (result.type) {
    case ExecutionResultType.SUCCESS: {
      return {
        ...state,
        status: ExecutionStatus.SUCCESS,
        result,
      };
    }
    case ExecutionResultType.REVERTED_TRANSACTION: {
      return {
        ...state,
        status: ExecutionStatus.FAILED,
        result,
      };
    }
    case ExecutionResultType.STATIC_CALL_ERROR: {
      return {
        ...state,
        status: ExecutionStatus.FAILED,
        result,
      };
    }
    case ExecutionResultType.STRATEGY_ERROR: {
      return {
        ...state,
        status: ExecutionStatus.FAILED,
        result,
      };
    }
    case ExecutionResultType.SIMULATION_ERROR: {
      return {
        ...state,
        status: ExecutionStatus.FAILED,
        result,
      };
    }
  }
}

function _updateOnchainInteraction(
  state: DeploymentExecutionState,
  networkInteractionId: number,
  update: (onchainInteraction: OnchainInteraction) => OnchainInteraction
) {
  return {
    ...state,
    networkInteractions: state.networkInteractions.map((interaction) => {
      if (interaction.id === networkInteractionId) {
        assertIgnitionInvariant(
          isOnchainInteraction(interaction),
          "Can only update onchain interactions"
        );

        return update(interaction);
      }

      return interaction;
    }),
  };
}
