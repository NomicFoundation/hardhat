import { produce } from "immer";

import { assertIgnitionInvariant } from "../../../utils/assertions";
import { findOnchainInteractionBy } from "../../../views/execution-state/find-onchain-interaction-by";
import { findStaticCallBy } from "../../../views/execution-state/find-static-call-by";
import { findTransactionBy } from "../../../views/execution-state/find-transaction-by";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../types/execution-state";
import {
  NetworkInteractionRequestMessage,
  OnchainInteractionBumpFeesMessage,
  OnchainInteractionDroppedMessage,
  OnchainInteractionReplacedByUserMessage,
  OnchainInteractionTimeoutMessage,
  StaticCallCompleteMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../../types/messages";
import { NetworkInteractionType } from "../../types/network-interaction";

/**
 * Add a new network interaction to the execution state.
 *
 * @param state - the execution state that will be added to
 * @param action - the request message that contains the network interaction
 * @returns a copy of the execution state with the addition network interaction
 */
export function appendNetworkInteraction<
  ExState extends
    | DeploymentExecutionState
    | CallExecutionState
    | StaticCallExecutionState
    | SendDataExecutionState
>(state: ExState, action: NetworkInteractionRequestMessage): ExState {
  return produce(state, (draft: ExState): void => {
    if (draft.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE) {
      assertIgnitionInvariant(
        action.networkInteraction.type === NetworkInteractionType.STATIC_CALL,
        `Static call execution states like ${draft.id} cannot have onchain interactions`
      );

      draft.networkInteractions.push(action.networkInteraction);

      return;
    }

    draft.networkInteractions.push(
      action.networkInteraction.type ===
        NetworkInteractionType.ONCHAIN_INTERACTION
        ? {
            ...action.networkInteraction,
            transactions: [],
            nonce: undefined,
            shouldBeResent: false,
          }
        : action.networkInteraction
    );
  });
}

/**
 * Add a transaction to an onchain interaction within an execution state.
 *
 * If the onchain interaction didn't have a nonce yet, it will be set to
 * the nonce of the transaction.
 *
 * This function also sets the onchain interaction's `shouldBeResent` flag
 * to `false`.
 *
 * @param state - the execution state that will be added to
 * @param action - the request message that contains the transaction
 * @returns a copy of the execution state with the additional transaction
 */
export function appendTransactionToOnchainInteraction<
  ExState extends
    | DeploymentExecutionState
    | CallExecutionState
    | StaticCallExecutionState
    | SendDataExecutionState
>(state: ExState, action: TransactionSendMessage): ExState {
  return produce(state, (draft: ExState): void => {
    const onchainInteraction = findOnchainInteractionBy(
      draft,
      action.networkInteractionId
    );

    if (onchainInteraction.nonce === undefined) {
      onchainInteraction.nonce = action.nonce;
    } else {
      assertIgnitionInvariant(
        onchainInteraction.nonce === action.nonce,
        `New transaction sent for ${state.id}/${onchainInteraction.id} with nonce ${action.nonce} but expected ${onchainInteraction.nonce}`
      );
    }

    onchainInteraction.shouldBeResent = false;
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
  ExState extends
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
>(state: ExState, action: TransactionConfirmMessage): ExState {
  return produce(state, (draft: ExState): void => {
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

/**
 * Complete the static call network interaction within an execution state.
 *
 * @param state - the execution state that will be updated
 * @param action - the request message that contains the static call result details
 * @returns a copy of the execution state with the static call confirmed
 */
export function completeStaticCall<
  ExState extends
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
    | StaticCallExecutionState
>(state: ExState, action: StaticCallCompleteMessage) {
  return produce(state, (draft: ExState): void => {
    const onchainInteraction = findStaticCallBy(
      draft,
      action.networkInteractionId
    );

    onchainInteraction.result = action.result;
  });
}

/**
 * Sets the state `shouldBeResent` of an OnchainInteraction to `true`
 * so that a new transaction with higher fees is sent.
 *
 * @param state - the execution state that will be updated within
 * @param action - the request message that contains the onchain interaction details
 * @returns a copy of the execution state with transaction confirmed
 */
export function bumpOnchainInteractionFees<
  ExState extends
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
>(state: ExState, action: OnchainInteractionBumpFeesMessage): ExState {
  return produce(state, (draft: ExState): void => {
    const onchainInteraction = findOnchainInteractionBy(
      draft,
      action.networkInteractionId
    );

    onchainInteraction.shouldBeResent = true;
  });
}

/**
 * Sets the state `shouldBeResent` of a dropped OnchainInteraction to `true`
 * so that a new transaction is sent.
 *
 * @param state - the execution state that will be updated within
 * @param action - the request message that contains the onchain interaction details
 * @returns a copy of the execution state with transaction confirmed
 */
export function resendDroppedOnchainInteraction<
  ExState extends
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
>(state: ExState, action: OnchainInteractionDroppedMessage): ExState {
  return produce(state, (draft: ExState): void => {
    const onchainInteraction = findOnchainInteractionBy(
      draft,
      action.networkInteractionId
    );

    onchainInteraction.shouldBeResent = true;
  });
}

/**
 * Resets an OnchainInteraction's nonce, transactions and shouldBeResent
 * due to the user having invalidated the nonce that has been used.
 *
 * @param state - the execution state that will be updated within
 * @param action - the request message that contains the onchain interaction details
 * @returns a copy of the execution state with transaction confirmed
 */
export function resetOnchainInteractionReplacedByUser<
  ExState extends
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
>(state: ExState, action: OnchainInteractionReplacedByUserMessage): ExState {
  return produce(state, (draft: ExState): void => {
    const onchainInteraction = findOnchainInteractionBy(
      draft,
      action.networkInteractionId
    );

    onchainInteraction.transactions = [];
    onchainInteraction.nonce = undefined;
    onchainInteraction.shouldBeResent = false;
  });
}

/**
 * Sets an execution state to `TIMEOUT` due to an onchain interaction
 * not being confirmed within the timeout period.
 */
export function onchainInteractionTimedOut<
  ExState extends
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
>(state: ExState, _action: OnchainInteractionTimeoutMessage): ExState {
  return produce(state, (draft: ExState): void => {
    draft.status = ExecutionStatus.TIMEOUT;
  });
}
