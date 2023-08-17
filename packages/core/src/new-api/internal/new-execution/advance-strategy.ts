import { assertIgnitionInvariant } from "../utils/assertions";

import { DeploymentExecutionResult } from "./types/execution-result";
import { DeploymentExecutionState } from "./types/execution-state";
import {
  ExecutionStrategy,
  LoadArtifactFunction,
  OnchainInteractionRequest,
  OnchainInteractionResponseType,
  StaticCallRequest,
} from "./types/execution-strategy";
import { TransactionReceiptStatus } from "./types/jsonrpc";
import { NetworkInteractionType } from "./types/network-interaction";

/**
 * This function takes a DeploymentExecutionState, an execution strategy and its params,
 * and returns either the result of the execution strategy, or a new NetworkInteraction
 * request that the strategy has made.
 *
 * This function is only meant to be run in three situations:
 *  - When the execution begins.
 *  - When a StaticCall request was completed and its result was set in the corresponding
 *    StaticCall's result field.
 *  - When an OnchainInteraction request was successfully completed. That means that a
 *    transaction was confirmed, with enough confiramtions, it hasn't reverted, and the
 *    transaction's blockHash, blockNumber and receipt were set.
 */
export async function advanceDeploymentStrategy(
  executionState: DeploymentExecutionState,
  strategy: ExecutionStrategy,
  fallbackSender: string,
  loadArtifact: LoadArtifactFunction
): Promise<
  DeploymentExecutionResult | StaticCallRequest | OnchainInteractionRequest
> {
  const generator = strategy.executeDeployment(
    executionState,
    fallbackSender,
    loadArtifact
  );

  let next = await generator.next();

  let i = 0;
  while (next.done !== true) {
    assertIgnitionInvariant(
      next.value.type !== "SIMULATION_SUCCESS_SIGNAL",
      `Received SIMULATION_SUCCESS_SIGNAL while replaying the strategy of ${executionState.id}`
    );

    const networkInteraction = executionState.networkInteractions[i];

    // If we don't find a network interaction this is a new request, and we return it
    if (networkInteraction === undefined) {
      return next.value;
    }

    if (networkInteraction.type === NetworkInteractionType.STATIC_CALL) {
      assertIgnitionInvariant(
        networkInteraction.result !== undefined,
        `Tried to continue the strategy of ${executionState.id} before setting the result of its StatiCall ${networkInteraction.id}`
      );

      next = await generator.next(networkInteraction.result);

      i += 1;
    } else {
      const confirmedTransaction = networkInteraction.transactions.find(
        (tx) => tx.receipt !== undefined
      );

      assertIgnitionInvariant(
        confirmedTransaction !== undefined &&
          confirmedTransaction.receipt !== undefined &&
          confirmedTransaction.blockHash !== undefined &&
          confirmedTransaction.blockNumber !== undefined,
        `Tried to continue the strategy of ${executionState.id} before setting a transaction as confirmed for its OnchainInteraction ${networkInteraction.id}`
      );

      assertIgnitionInvariant(
        confirmedTransaction.receipt.status ===
          TransactionReceiptStatus.SUCCESS,
        `Tried to continue the strategy of ${executionState.id} with reverted transaction ${confirmedTransaction.hash} for OnchainInteraction ${networkInteraction.id}`
      );

      i += 1;
      next = await generator.next({
        type: OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION,
        transaction: {
          ...confirmedTransaction,
          blockHash: confirmedTransaction.blockHash,
          blockNumber: confirmedTransaction.blockNumber,
          receipt: {
            ...confirmedTransaction.receipt,
            status: TransactionReceiptStatus.SUCCESS,
          },
        },
      });
    }
  }

  return next.value;
}
