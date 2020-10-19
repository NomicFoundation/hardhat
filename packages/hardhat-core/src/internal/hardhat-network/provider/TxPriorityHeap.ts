import { Transaction } from "ethereumjs-tx";
import { BN } from "ethereumjs-util";
import { MaxHeap } from "mnemonist/heap";

export interface OrderedTransaction {
  orderId: number;
  body: Transaction;
}

function compareTransactions(
  left: OrderedTransaction,
  right: OrderedTransaction
) {
  const cmp = new BN(left.body.gasPrice).cmp(new BN(right.body.gasPrice));
  return cmp === 0 ? right.orderId - left.orderId : cmp;
}

export class TxPriorityHeap {
  private _heap = new MaxHeap<OrderedTransaction>(compareTransactions);

  constructor(
    private readonly _pendingTransactions: Map<string, OrderedTransaction[]>
  ) {
    for (const [address, txList] of _pendingTransactions) {
      this._heap.push(txList[0]);
    }
  }

  public peek() {
    return this._heap.peek();
  }
}
