import {
  ExecutionSateType,
  ExecutionState,
} from "../../execution/types/execution-state";

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
  exState: ExecutionState,
): { nonce: number; sender: string } | undefined {
  if (
    exState.type === ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.ENCODE_FUNCTION_CALL_EXECUTION_STATE
  ) {
    return undefined;
  }

  const interaction = getPendingOnchainInteraction(exState);

  if (interaction === undefined || interaction.nonce === undefined) {
    return undefined;
  }

  return { nonce: interaction.nonce, sender: exState.from };
}
