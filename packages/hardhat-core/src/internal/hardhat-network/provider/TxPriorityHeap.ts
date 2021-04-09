import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";
import { MaxHeap } from "mnemonist/heap";

import { OrderedTransaction } from "./PoolState";

function compareTransactions(
  left: OrderedTransaction,
  right: OrderedTransaction
) {
  const cmp = new BN(left.data.gasPrice).cmp(new BN(right.data.gasPrice));
  return cmp === 0 ? right.orderId - left.orderId : cmp;
}

export class TxPriorityHeap {
  private readonly _queuedTransactions: Map<
    string,
    OrderedTransaction[]
  > = new Map();
  private readonly _heap = new MaxHeap<OrderedTransaction>(compareTransactions);

  /**
   * Creates a structure which allows to retrieve the next processable transaction with
   * the highest gas price and the lowest order id.
   * Assumes that the values of `pendingTransactions` map are arrays of pending transactions
   * sorted by transaction nonces and that there are no gaps in the nonce sequence
   * (i.e. all transactions from the same sender can be executed one by one).
   * @param pendingTransactions map of (sender address) => (pending transactions list)
   */
  constructor(pendingTransactions: Map<string, OrderedTransaction[]>) {
    for (const [address, txList] of pendingTransactions) {
      const [firstTx, ...remainingTxs] = txList;
      this._heap.push(firstTx);
      this._queuedTransactions.set(address, remainingTxs);
    }
  }

  public peek(): TypedTransaction | undefined {
    return this._heap.peek()?.data;
  }

  /**
   * Remove the transaction at the top of the heap, and all the pending transactions
   * from the same sender.
   */
  public pop(): void {
    const bestTx = this._heap.pop();
    if (bestTx !== undefined) {
      const bestTxSender = bestTx.data.getSenderAddress().toString();
      this._queuedTransactions.delete(bestTxSender);
    }
  }

  /**
   * Remove the transaction at the top of the heap.
   */
  public shift(): void {
    const bestTx = this.peek();
    if (bestTx === undefined) {
      return;
    }
    const bestTxSender = bestTx.getSenderAddress().toString();
    const senderQueuedTxs = this._queuedTransactions.get(bestTxSender) ?? [];
    if (senderQueuedTxs.length > 0) {
      const [nextTx, ...remainingTxs] = senderQueuedTxs;
      this._heap.replace(nextTx);
      this._queuedTransactions.set(bestTxSender, remainingTxs);
    } else {
      this._heap.pop();
    }
  }
}
