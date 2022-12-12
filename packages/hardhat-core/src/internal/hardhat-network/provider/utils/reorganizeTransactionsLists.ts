import { InternalError } from "../../../core/providers/errors";
import * as BigIntUtils from "../../../util/bigint";
import { SenderTransactions, SerializedTransaction } from "../PoolState";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

/**
 * Move as many transactions as possible from the queued list
 * to the pending list.
 *
 * Returns the new lists and the new executable nonce of the sender.
 */
export function reorganizeTransactionsLists(
  pending: SenderTransactions,
  queued: SenderTransactions,
  retrieveNonce: (serializedTx: SerializedTransaction) => bigint
) {
  let newPending = pending;
  let newQueued = queued.sortBy(retrieveNonce, (l, r) => BigIntUtils.cmp(l, r));

  if (pending.last() === undefined) {
    throw new InternalError("Pending list cannot be empty");
  }

  let nextPendingNonce = retrieveNonce(pending.last()) + 1n;

  let movedCount = 0;
  for (const queuedTx of newQueued) {
    const queuedTxNonce = retrieveNonce(queuedTx);

    if (nextPendingNonce === queuedTxNonce) {
      newPending = newPending.push(queuedTx);
      nextPendingNonce++;
      movedCount++;
    } else {
      break;
    }
  }
  newQueued = newQueued.skip(movedCount);

  return {
    newPending,
    newQueued,
  };
}
