import setupDebug from "debug";

import { IgnitionError } from "../../../../errors";
import { ERRORS } from "../../../errors-list";
import { assertIgnitionInvariant } from "../../../utils/assertions";
import { JsonRpcClient } from "../../jsonrpc-client";
import { TransactionTrackingTimer } from "../../transaction-tracking-timer";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
} from "../../types/execution-state";
import { Transaction } from "../../types/jsonrpc";
import {
  JournalMessageType,
  OnchainInteractionBumpFeesMessage,
  OnchainInteractionTimeoutMessage,
  TransactionConfirmMessage,
} from "../../types/messages";
import {
  NetworkInteractionType,
  OnchainInteraction,
} from "../../types/network-interaction";

const debug = setupDebug("hardhat-ignition:onchain-interaction-monitor");

export interface GetTransactionRetryConfig {
  maxRetries: number;
  retryInterval: number;
}

/**
 * Checks the transactions of the latest network interaction of the execution state,
 * and returns a message, or undefined if we need to wait for more confirmations.
 *
 * This method can return messages indicating that a transaction has enough confirmations,
 * that we need to bump the fees, or that the execution of this onchain interaction has
 * timed out.
 *
 * If all of the transactions of the latest network interaction have been dropped, this
 * method throws an IgnitionError.
 *
 * SIDE EFFECTS: This function doesn't have any side effects.
 *
 * @param exState The execution state that requires the transactions to be checked.
 * @param jsonRpcClient The JSON RPC client to use for accessing the network.
 * @param transactionTrackingTimer The TransactionTrackingTimer to use for checking the
 *  if a transaction has been pending for too long.
 * @param requiredConfirmations The number of confirmations required for a transaction
 *  to be considered confirmed.
 * @param millisecondBeforeBumpingFees The number of milliseconds before bumping the fees
 *  of a transaction.
 * @param maxFeeBumps The maximum number of times we can bump the fees of a transaction
 *  before considering the onchain interaction timed out.
 * @param getTransactionRetryConfig This is really only a parameter to help with testing this function
 * @param disableFeeBumping Disables fee bumping for all transactions.
 * @returns A message indicating the result of checking the transactions of the latest
 *  network interaction.
 */
export async function monitorOnchainInteraction(
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState,
  jsonRpcClient: JsonRpcClient,
  transactionTrackingTimer: TransactionTrackingTimer,
  requiredConfirmations: number,
  millisecondBeforeBumpingFees: number,
  maxFeeBumps: number,
  getTransactionRetryConfig: GetTransactionRetryConfig = {
    maxRetries: 10,
    retryInterval: 1000,
  },
  disableFeeBumping: boolean
): Promise<
  | TransactionConfirmMessage
  | OnchainInteractionBumpFeesMessage
  | OnchainInteractionTimeoutMessage
  | undefined
> {
  const lastNetworkInteraction = exState.networkInteractions.at(-1);

  assertIgnitionInvariant(
    lastNetworkInteraction !== undefined,
    `No network interaction for ExecutionState ${exState.id} when trying to check its transactions`
  );

  assertIgnitionInvariant(
    lastNetworkInteraction.type === NetworkInteractionType.ONCHAIN_INTERACTION,
    `StaticCall found as last network interaction of ExecutionState ${exState.id} when trying to check its transactions`
  );

  assertIgnitionInvariant(
    lastNetworkInteraction.transactions.length > 0,
    `No transaction found in OnchainInteraction ${exState.id}/${lastNetworkInteraction.id} when trying to check its transactions`
  );

  const transaction = await _getTransactionWithRetry(
    jsonRpcClient,
    lastNetworkInteraction,
    getTransactionRetryConfig,
    exState.id
  );

  // We do not try to recover from dropped transactions mid-execution
  if (transaction === undefined) {
    throw new IgnitionError(ERRORS.EXECUTION.DROPPED_TRANSACTION, {
      futureId: exState.id,
      networkInteractionId: lastNetworkInteraction.id,
    });
  }

  const [block, receipt] = await Promise.all([
    jsonRpcClient.getLatestBlock(),
    jsonRpcClient.getTransactionReceipt(transaction.hash),
  ]);

  if (receipt !== undefined) {
    // There's a slight race condition here that we won't check.
    //
    // We should be checking that the receipt's block hash is still part
    // of the chain, as it could have been reorged out.
    //
    // As we intend to use this with requiredConfirmations with
    // values that are high enough to avoid reorgs, we don't do it.
    const confirmations = block.number - receipt.blockNumber + 1;

    if (confirmations >= requiredConfirmations) {
      return {
        type: JournalMessageType.TRANSACTION_CONFIRM,
        futureId: exState.id,
        networkInteractionId: lastNetworkInteraction.id,
        hash: transaction.hash,
        receipt,
      };
    }

    return undefined;
  }

  const timeTrackingTx = transactionTrackingTimer.getTransactionTrackingTime(
    transaction.hash
  );

  if (timeTrackingTx < millisecondBeforeBumpingFees) {
    return undefined;
  }

  if (
    disableFeeBumping ||
    lastNetworkInteraction.transactions.length > maxFeeBumps
  ) {
    return {
      type: JournalMessageType.ONCHAIN_INTERACTION_TIMEOUT,
      futureId: exState.id,
      networkInteractionId: lastNetworkInteraction.id,
    };
  }

  return {
    type: JournalMessageType.ONCHAIN_INTERACTION_BUMP_FEES,
    futureId: exState.id,
    networkInteractionId: lastNetworkInteraction.id,
  };
}

async function _getTransactionWithRetry(
  jsonRpcClient: JsonRpcClient,
  onchainInteraction: OnchainInteraction,
  retryConfig: GetTransactionRetryConfig,
  futureId: string
): Promise<Transaction | undefined> {
  let transaction: Transaction | undefined;

  // Small retry loop for up to X seconds to handle blockchain nodes
  // that are slow to propagate transactions.
  // See https://github.com/NomicFoundation/hardhat-ignition/issues/665
  for (let i = 0; i < retryConfig.maxRetries; i++) {
    debug(
      `Retrieving transaction for interaction ${futureId}/${
        onchainInteraction.id
      } from mempool (attempt ${i + 1}/${retryConfig.maxRetries})`
    );

    const transactions = await Promise.all(
      onchainInteraction.transactions.map((tx) =>
        jsonRpcClient.getTransaction(tx.hash)
      )
    );

    transaction = transactions.find((tx) => tx !== undefined);

    if (transaction !== undefined) {
      break;
    }

    debug(
      `Transaction lookup for ${futureId}/${onchainInteraction.id} not found in mempool, waiting ${retryConfig.retryInterval} seconds before retrying`
    );

    await new Promise((resolve) =>
      setTimeout(resolve, retryConfig.retryInterval)
    );
  }

  return transaction;
}
