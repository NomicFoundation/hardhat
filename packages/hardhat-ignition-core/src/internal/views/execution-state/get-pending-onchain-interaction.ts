import {
  ExecutionStateType,
  ExecutionState,
} from "../../execution/types/execution-state";
import {
  NetworkInteractionType,
  OnchainInteraction,
} from "../../execution/types/network-interaction";
import { assertIgnitionInvariant } from "../../utils/assertions";

/**
 * Returns the last NetworkInteraction if there's one and it's an
 * OnchainInteraction without a confirmed transaction.
 *
 * @param exState The execution state to check.
 * @returns Returns the pending nonce and sender if the last network interaction
 *  was a transaction, and it hasn't been confirmed yet.
 */
export function getPendingOnchainInteraction(
  exState: ExecutionState
): OnchainInteraction | undefined {
  if (
    exState.type === ExecutionStateType.STATIC_CALL_EXECUTION_STATE ||
    exState.type === ExecutionStateType.READ_EVENT_ARGUMENT_EXECUTION_STATE ||
    exState.type === ExecutionStateType.CONTRACT_AT_EXECUTION_STATE ||
    exState.type === ExecutionStateType.ENCODE_FUNCTION_CALL_EXECUTION_STATE
  ) {
    return undefined;
  }

  const interaction = exState.networkInteractions.at(-1);

  assertIgnitionInvariant(
    interaction !== undefined,
    `Unable to find network interaction for ${exState.id} when trying to get pending onchain interaction`
  );

  if (
    interaction.type === NetworkInteractionType.STATIC_CALL ||
    interaction.transactions.some((tx) => tx.receipt !== undefined)
  ) {
    return undefined;
  }

  return interaction;
}
