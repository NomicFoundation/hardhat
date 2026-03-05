import type { ExecutionState } from "../../execution/types/execution-state.js";
import type { OnchainInteraction } from "../../execution/types/network-interaction.js";

import { ExecutionSateType } from "../../execution/types/execution-state.js";
import { NetworkInteractionType } from "../../execution/types/network-interaction.js";
import { assertIgnitionInvariant } from "../../utils/assertions.js";

/**
 * Returns the last NetworkInteraction if there's one and it's an
 * OnchainInteraction without a confirmed transaction.
 *
 * @param exState The execution state to check.
 * @returns Returns the pending nonce and sender if the last network interaction
 *  was a transaction, and it hasn't been been confirmed yet.
 */
export function getPendingOnchainInteraction(
  exState: ExecutionState,
): OnchainInteraction | undefined {
  if (
    exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE ||
    exState.type === ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.ENCODE_FUNCTION_CALL_EXECUTION_STATE
  ) {
    return undefined;
  }

  const interaction = exState.networkInteractions.at(-1);

  assertIgnitionInvariant(
    interaction !== undefined,
    `Unable to find network interaction for ${exState.id} when trying to get pending onchain interaction`,
  );

  if (
    interaction.type === NetworkInteractionType.STATIC_CALL ||
    interaction.transactions.some((tx) => tx.receipt !== undefined)
  ) {
    return undefined;
  }

  return interaction;
}
