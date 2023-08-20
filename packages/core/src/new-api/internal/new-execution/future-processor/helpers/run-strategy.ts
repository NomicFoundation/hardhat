import { assertIgnitionInvariant } from "../../../utils/assertions";
import {
  RevertedTransactionExecutionResult,
  ExecutionResultType,
} from "../../types/execution-result";
import {
  DeploymentExecutionState,
  CallExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
  ExecutionSateType,
} from "../../types/execution-state";
import {
  DeploymentStrategyGenerator,
  CallStrategyGenerator,
  SendDataStrategyGenerator,
  OnchainInteractionResponseType,
  SIMULATION_SUCCESS_SIGNAL_TYPE,
  ExecutionStrategy,
} from "../../types/execution-strategy";
import { TransactionReceiptStatus } from "../../types/jsonrpc";
import {
  NetworkInteractionRequestMessage,
  DeploymentExecutionStateCompleteMessage,
  CallExecutionStateCompleteMessage,
  SendDataExecutionStateCompleteMessage,
  StaticCallExecutionStateCompleteMessage,
  JournalMessageType,
} from "../../types/messages";
import { NetworkInteractionType } from "../../types/network-interaction";

import {
  createExecutionStateCompleteMessage,
  createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions,
} from "./messages-helpers";
import { replayStrategy } from "./replay-strategy";

/**
 * Runs the strategy for the execution state, and returns a message that can be
 * a network interaction request, or an execution state complete message.
 *
 * Execution state complete messages can be a result of running the strategy,
 * or of the transaction executing the latest network interaction having reverted.
 *
 * SIDE EFFECTS: This function doesn't have any side effects.
 *
 * @param exState The execution state that requires the strategy to be run.
 * @param executionStrategy The execution strategy to use.
 * @returns A message indicating the result of running the strategy or a reverted tx.
 */
export async function runStrategy(
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
    | StaticCallExecutionState,
  executionStrategy: ExecutionStrategy
): Promise<
  | NetworkInteractionRequestMessage
  | DeploymentExecutionStateCompleteMessage
  | CallExecutionStateCompleteMessage
  | SendDataExecutionStateCompleteMessage
  | StaticCallExecutionStateCompleteMessage
> {
  const strategyGenerator = await replayStrategy(exState, executionStrategy);

  const lastNetworkInteraction =
    exState.networkInteractions[exState.networkInteractions.length];

  let response;
  if (
    lastNetworkInteraction.type === NetworkInteractionType.ONCHAIN_INTERACTION
  ) {
    assertIgnitionInvariant(
      exState.type !== ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
      `Unexpected StaticCallExecutionState ${exState.id} with onchain interaction ${lastNetworkInteraction.id} when trying to run a strategy`
    );

    // We know this is safe because StaticCallExecutionState's can't generate
    // OnchainInteractions.
    const typedGenerator = strategyGenerator as
      | DeploymentStrategyGenerator
      | CallStrategyGenerator
      | SendDataStrategyGenerator;

    const confirmedTx = lastNetworkInteraction.transactions.find(
      (tx) => tx.receipt !== undefined
    );

    assertIgnitionInvariant(
      confirmedTx !== undefined && confirmedTx.receipt !== undefined,
      "Trying to advance strategy without confirmed tx in the last network interaction"
    );

    if (confirmedTx.receipt.status === TransactionReceiptStatus.FAILURE) {
      const result: RevertedTransactionExecutionResult = {
        type: ExecutionResultType.REVERTED_TRANSACTION,
      };

      return createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions(
        exState,
        result
      );
    }

    response = await typedGenerator.next({
      type: OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION,
      transaction: confirmedTx as any,
    });
  } else {
    assertIgnitionInvariant(
      lastNetworkInteraction.result !== undefined,
      "Trying to advance strategy without result in the last network interaction"
    );

    response = await strategyGenerator.next(lastNetworkInteraction.result);
  }

  if (response.done !== true) {
    assertIgnitionInvariant(
      response.value.type !== SIMULATION_SUCCESS_SIGNAL_TYPE,
      "Invalid SIMULATION_SUCCESS_SIGNAL received"
    );

    return {
      type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
      futureId: exState.id,
      networkInteraction: response.value,
    };
  }

  return createExecutionStateCompleteMessage(exState, response.value);
}
