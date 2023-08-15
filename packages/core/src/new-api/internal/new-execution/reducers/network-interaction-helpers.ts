import { produce } from "immer";

import {
  CallExecutionState,
  DeploymentExecutionState,
} from "../types/execution-state";
import {
  NetworkInteractionRequestMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../types/messages";
import { findOnchainInteractionBy } from "../views/deployment-execution-state/find-onchain-interaction-by";
import { findTransactionBy } from "../views/deployment-execution-state/find-transaction-by";

/**
 * Add a new network interaction to the execution state.
 *
 * @param state - the execution state that will be added to
 * @param action - the request message that contains the network interaction
 * @returns a copy of the execution state with the addition network interaction
 */
export function appendNetworkInteraction<
  ExState extends DeploymentExecutionState | CallExecutionState
>(state: ExState, action: NetworkInteractionRequestMessage): ExState {
  return produce(state, (draft: DeploymentExecutionState): void => {
    draft.networkInteractions.push(action.networkInteraction);
  });
}

/**
 * Add a transaction to an onchain interaction within an execution state.
 *
 * @param state - the execution state that will be added to
 * @param action - the request message that contains the transaction
 * @returns a copy of the execution state with the additional transaction
 */
export function appendTransactionToOnchainInteraction<
  ExState extends DeploymentExecutionState | CallExecutionState
>(state: ExState, action: TransactionSendMessage): ExState {
  return produce(state, (draft: DeploymentExecutionState): void => {
    const onchainInteraction = findOnchainInteractionBy(
      draft,
      action.networkInteractionId
    );

    onchainInteraction.transactions.push(action.transaction);
  });
}

/**
 * Confirm a transaction for an onchain interaction within an execution state.
 *
 * @param state - the execution state that will be updated within
 * @param action - the request message that contains the transaction details
 * @returns a copy of the execution state with transaction confirmed
 */
export function confirmTransaction<
  ExState extends DeploymentExecutionState | CallExecutionState
>(state: ExState, action: TransactionConfirmMessage): ExState {
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
    // we intentionally clear other transactions
    onchainInteraction.transactions = [transaction];
  });
}
