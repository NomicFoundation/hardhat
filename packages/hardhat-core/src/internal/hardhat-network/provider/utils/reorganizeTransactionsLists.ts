import { BN } from "ethereumjs-util";

import { SenderTransactions } from "../TransactionPool";

import { retrieveNonce } from "./retrieveNonce";

export function reorganizeTransactionsLists(
  pending: SenderTransactions,
  queued: SenderTransactions
) {
  let newPending = pending;
  let newQueued = queued.sortBy(retrieveNonce, (l, r) => l.cmp(r));

  let executableNonce: BN;

  if (pending.last() === undefined) {
    executableNonce = new BN(0);
  } else {
    executableNonce = retrieveNonce(pending.last()).addn(1);
  }

  let i = 0;
  for (; i < newQueued.size; i++) {
    const queuedTx = newQueued.get(i)!;
    const txNonce = retrieveNonce(queuedTx);
    if (executableNonce.eq(txNonce)) {
      newPending = newPending.push(queuedTx);
      executableNonce.iaddn(1);
    } else {
      break;
    }
  }
  newQueued = newQueued.slice(i);

  return {
    executableNonce,
    newPending,
    newQueued,
  };
}
