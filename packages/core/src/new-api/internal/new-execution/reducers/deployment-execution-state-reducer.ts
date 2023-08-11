import { assertIgnitionInvariant } from "../../utils/assertions";
import { isOnchainInteraction } from "../type-guards/network-interaction";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";
import { Transaction } from "../types/jsonrpc";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
  SendTransactionMessage,
} from "../types/messages";
import {
  NetworkInteraction,
  OnchainInteraction,
} from "../types/network-interaction";

import { assertUnknownAction } from "./utils";

export function deploymentExecutionStateReducer(
  state: DeploymentExecutionState,
  action:
    | DeploymentExecutionStateInitializeMessage
    | NetworkInteractionRequestMessage
    | SendTransactionMessage
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

function appendNetworkInteraction(
  state: DeploymentExecutionState,
  networkInteraction: NetworkInteraction
) {
  return {
    ...state,
    networkInteractions: [...state.networkInteractions, networkInteraction],
  };
}

function updateOnchainInteraction(
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

function appendTransaction(
  state: DeploymentExecutionState,
  networkInteractionId: number,
  transaction: Transaction
): DeploymentExecutionState {
  return updateOnchainInteraction(
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
