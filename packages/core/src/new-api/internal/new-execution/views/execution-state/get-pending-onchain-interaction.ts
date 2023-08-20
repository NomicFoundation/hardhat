import { ExecutionSateType, ExecutionState } from "../../types/execution-state";
import {
  NetworkInteractionType,
  OnchainInteraction,
} from "../../types/network-interaction";

/**
 * Returns the last NetworkInteraction if there's one and it's an
 * OnchainInteraction without a confirmed transaction.
 *
 * @param exState The execution state to check.
 * @returns Returns the pending nonce and sender if the last network interaction
 *  was a transaction, and it hasn't been been confirmed yet.
 */
export function getPendingOnchainInteraction(
  exState: ExecutionState
): OnchainInteraction | undefined {
  if (
    exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE ||
    exState.type === ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE
  ) {
    return undefined;
  }

  const interaction =
    exState.networkInteractions[exState.networkInteractions.length - 1];

  if (
    interaction.type === NetworkInteractionType.STATIC_CALL ||
    interaction.transactions.some((tx) => tx.receipt !== undefined)
  ) {
    return undefined;
  }

  return interaction;
}
