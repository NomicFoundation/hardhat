import { BN } from "ethereumjs-util";

import { InternalError } from "../../../core/providers/errors";
import { SenderTransactions, SerializedTransaction } from "../PoolState";

// tslint:disable only-hardhat-error

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

  let executableNonce: BN;

  if (pending.last() === undefined) {
    throw new InternalError("Pending list cannot be empty");
  }

  executableNonce = retrieveNonce(pending.last()).addn(1);

  let movedCount = 0;
  for (const queuedTx of newQueued) {
    const queuedTxNonce = retrieveNonce(queuedTx);

    if (executableNonce.eq(queuedTxNonce)) {
      newPending = newPending.push(queuedTx);
      executableNonce.iaddn(1);
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
