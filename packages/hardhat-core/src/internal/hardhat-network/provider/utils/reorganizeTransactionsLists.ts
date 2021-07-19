import { BN } from "ethereumjs-util";

import { InternalError } from "../../../core/providers/errors";
import { SenderTransactions, SerializedTransaction } from "../PoolState";

/* eslint-disable @nomiclabs/only-hardhat-error */

/**
 * Move as many transactions as possible from the queued list
 * to the pending list.
 *
 * Returns the new lists and the new executable nonce of the sender.
 */
export function reorganizeTransactionsLists(
  pending: SenderTransactions,
  queued: SenderTransactions,
  retrieveNonce: (serializedTx: SerializedTransaction) => BN
) {
  let newPending = pending;
  let newQueued = queued.sortBy(retrieveNonce, (l, r) => l.cmp(r));

  if (pending.last() === undefined) {
    throw new InternalError("Pending list cannot be empty");
  }

  const nextPendingNonce = retrieveNonce(pending.last()).addn(1);

  let movedCount = 0;
  for (const queuedTx of newQueued) {
    const queuedTxNonce = retrieveNonce(queuedTx);

    if (nextPendingNonce.eq(queuedTxNonce)) {
      newPending = newPending.push(queuedTx);
      nextPendingNonce.iaddn(1);
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
