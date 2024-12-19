import { assertIgnitionInvariant } from "../../../utils/assertions";
import { JsonRpcClient } from "../../jsonrpc-client";
import { NonceManager } from "../../nonce-management/json-rpc-nonce-manager";
import { TransactionTrackingTimer } from "../../transaction-tracking-timer";
import { ExecutionResultType } from "../../types/execution-result";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
} from "../../types/execution-state";
import {
  CallStrategyGenerator,
  DeploymentStrategyGenerator,
  ExecutionStrategy,
} from "../../types/execution-strategy";
import {
  CallExecutionStateCompleteMessage,
  DeploymentExecutionStateCompleteMessage,
  JournalMessageType,
  SendDataExecutionStateCompleteMessage,
  TransactionSendMessage,
} from "../../types/messages";
import { NetworkInteractionType } from "../../types/network-interaction";
import { decodeSimulationResult } from "../helpers/decode-simulation-result";
import { createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions } from "../helpers/messages-helpers";
import {
  TRANSACTION_SENT_TYPE,
  sendTransactionForOnchainInteraction,
} from "../helpers/network-interaction-execution";
import { replayStrategy } from "../helpers/replay-strategy";

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
  const lastNetworkInteraction = exState.networkInteractions.at(-1);

  assertIgnitionInvariant(
    lastNetworkInteraction !== undefined,
    `No network interaction found for ExecutionState ${exState.id} when trying to send a transaction`
  );

  assertIgnitionInvariant(
    lastNetworkInteraction.type === NetworkInteractionType.ONCHAIN_INTERACTION,
    `StaticCall found as last network interaction of ExecutionState ${exState.id} when trying to send a transaction`
  );

  const generator = await replayStrategy(exState, executionStrategy);

  // This cast is safe because the execution state is of static call type.
  const strategyGenerator = generator as
    | DeploymentStrategyGenerator
    | CallStrategyGenerator;

  const result = await sendTransactionForOnchainInteraction(
    jsonRpcClient,
    exState.from,
    lastNetworkInteraction,
    nonceManager,
    decodeSimulationResult(strategyGenerator, exState)
  );

  // If the transaction failed during simulation, we need to revert the nonce allocation
  if (
    result.type === ExecutionResultType.STRATEGY_SIMULATION_ERROR ||
    result.type === ExecutionResultType.SIMULATION_ERROR
  ) {
    nonceManager.revertNonce(exState.from);
  }

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
