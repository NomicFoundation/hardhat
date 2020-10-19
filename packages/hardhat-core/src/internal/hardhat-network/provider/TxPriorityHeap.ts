import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex } from "ethereumjs-util";
import { MaxHeap } from "mnemonist/heap";

export interface OrderedTransaction {
  orderId: number;
  body: Transaction; // TODO rename to data
}

function compareTransactions(
  left: OrderedTransaction,
  right: OrderedTransaction
) {
  const cmp = new BN(left.body.gasPrice).cmp(new BN(right.body.gasPrice));
  return cmp === 0 ? right.orderId - left.orderId : cmp;
}

export class TxPriorityHeap {
  // tslint:disable-next-line:prettier
  private readonly _queuedTransactions: Map<string, OrderedTransaction[]> = new Map();
  private readonly _heap = new MaxHeap<OrderedTransaction>(compareTransactions);

  constructor(pendingTransactions: Map<string, OrderedTransaction[]>) {
    for (const [address, txList] of pendingTransactions) {
      const [firstTx, ...remainingTxs] = txList;
      this._heap.push(firstTx);
      this._queuedTransactions.set(address, remainingTxs);
    }
  }

  public peek() {
    return this._heap.peek();
  }

  public pop() {
    this._heap.pop();
  }

  public shift() {
    const bestTx = this.peek();
    if (bestTx === undefined) {
      return;
    }
    const bestTxSender = bufferToHex(bestTx.body.getSenderAddress());
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
