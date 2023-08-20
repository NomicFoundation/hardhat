import { assertIgnitionInvariant } from "../../../utils/assertions";
import { JsonRpcClient } from "../../jsonrpc-client";
import { NonceManager } from "../../nonce-management";
import { replayStrategy } from "../../replay-strategy";
import { TransactionTrackingTimer } from "../../transaction-tracking-timer";
import { ExecutionResultType } from "../../types/execution-result";
import {
  DeploymentExecutionState,
  CallExecutionState,
  SendDataExecutionState,
} from "../../types/execution-state";
import {
  ExecutionStrategy,
  SIMULATION_SUCCESS_SIGNAL_TYPE,
} from "../../types/execution-strategy";
import {
  TransactionSendMessage,
  DeploymentExecutionStateCompleteMessage,
  CallExecutionStateCompleteMessage,
  SendDataExecutionStateCompleteMessage,
  JournalMessageType,
} from "../../types/messages";
import { NetworkInteractionType } from "../../types/network-interaction";

import { createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions } from "./messages-helpers";
import {
  sendTransactionForOnchainInteraction,
  TRANSACTION_SENT_TYPE,
} from "./network-interaction-execution";

/**
 * Sends a transaction for the execution state's latest NetworkInteraction
 * and returns a TransactionSendMessage, or an execution state complete message
 * in case of an error.
 *
 * This function can send the first transaction of an OnchainInteraction, as well
 * as new transactions to bump fees and recovering from dropped transactions.
 *
 * SIDE EFFECTS: This function has side effects, as it sends a transaction. These
 *  include: sending the transaction to the network, allocating a nonce in the
 *  NonceManager if needed, and adding the transaction to the TransactionTrackingTimer.
 *
 * @param exState The execution state that requires a transaction to be sent.
 * @param executionStrategy The execution strategy to use for simulations.
 * @param jsonRpcClient The JSON RPC client to use for the transaction.
 * @param nonceManager The NonceManager to allocate nonces if needed.
 * @param transactionTrackingTimer The TransactionTrackingTimer to add the transaction to.
 * @returns A message indicating the result of trying to send the transaction.
 */
export async function sendTransaction(
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState,
  executionStrategy: ExecutionStrategy,
  jsonRpcClient: JsonRpcClient,
  nonceManager: NonceManager,
  transactionTrackingTimer: TransactionTrackingTimer
): Promise<
  | TransactionSendMessage
  | DeploymentExecutionStateCompleteMessage
  | CallExecutionStateCompleteMessage
  | SendDataExecutionStateCompleteMessage
> {
  const lastNetworkInteraction =
    exState.networkInteractions[exState.networkInteractions.length];

  assertIgnitionInvariant(
    lastNetworkInteraction.type === NetworkInteractionType.ONCHAIN_INTERACTION,
    `StaticCall found as last network interaction of ExecutionState ${exState.id} when trying to send a transaction`
  );

  const strategyGenerator = await replayStrategy(exState, executionStrategy);

  const result = await sendTransactionForOnchainInteraction(
    jsonRpcClient,
    lastNetworkInteraction,
    async (_sender: string) => nonceManager.getNextNonce(_sender),
    async (simulationResult) => {
      const response = await strategyGenerator.next(simulationResult);

      assertIgnitionInvariant(
        response.value.type === SIMULATION_SUCCESS_SIGNAL_TYPE ||
          response.value.type ===
            ExecutionResultType.STRATEGY_SIMULATION_ERROR ||
          response.value.type === ExecutionResultType.SIMULATION_ERROR,
        `Invalid response received from strategy after a simulation was run before sending a transaction for ExecutionState ${exState.id}`
      );

      if (response.value.type === SIMULATION_SUCCESS_SIGNAL_TYPE) {
        return undefined;
      }

      return response.value;
    }
  );

  if (result.type === TRANSACTION_SENT_TYPE) {
    transactionTrackingTimer.addTransaction(result.transaction.hash);

    return {
      type: JournalMessageType.TRANSACTION_SEND,
      futureId: exState.id,
      networkInteractionId: lastNetworkInteraction.id,
      transaction: result.transaction,
      nonce: result.nonce,
    };
  }

  return createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions(
    exState,
    result
  );
}
