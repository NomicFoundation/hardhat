import { ExecutionState } from "../../types/execution-state";

import { getPendingOnchainInteraction } from "./get-pending-onchain-interaction";

/**
 * Returns the nonce and sender of a pending transaction of the execution state,
 * if any.
 *
 * @param exState The execution state to check.
 * @returns Returns the nonce and sender of the last (and only) pending tx
 *  of the execution state, if any.
 */
export function getPendingNonceAndSender(
  exState: ExecutionState
): { nonce: number; sender: string } | undefined {
  const interaction = getPendingOnchainInteraction(exState);

  if (interaction === undefined || interaction.nonce === undefined) {
    return undefined;
  }

  return { nonce: interaction.nonce, sender: interaction.from };
}
