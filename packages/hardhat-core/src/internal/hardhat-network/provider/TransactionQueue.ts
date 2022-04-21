import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";
import Heap from "mnemonist/heap";

import { InternalError, InvalidInputError } from "../../core/providers/errors";
import { MempoolOrder } from "./node-types";
import { OrderedTransaction } from "./PoolState";

function getEffectiveMinerFee(tx: OrderedTransaction, baseFee?: BN): BN {
  // This mimics the EIP-1559 normalize_transaction function
  const maxFeePerGas =
    "gasPrice" in tx.data ? tx.data.gasPrice : tx.data.maxFeePerGas;

  const maxPriorityFeePerGas =
    "gasPrice" in tx.data ? tx.data.gasPrice : tx.data.maxPriorityFeePerGas;

  if (baseFee === undefined) {
    return maxFeePerGas;
  }

  return BN.min(maxPriorityFeePerGas, maxFeePerGas.sub(baseFee));
}

function decreasingOrderEffectiveMinerFeeComparator(
  left: OrderedTransaction,
  right: OrderedTransaction,
  baseFee?: BN
) {
  const leftEffectiveMinerFee = getEffectiveMinerFee(left, baseFee);
  const rightEffectiveMinerFee = getEffectiveMinerFee(right, baseFee);

  const cmp = rightEffectiveMinerFee.cmp(leftEffectiveMinerFee);

  if (cmp !== 0) {
    return cmp;
  }

  // If two txs have the same effective miner fee we want to sort them
  // in increasing order by orderId.
  return left.orderId - right.orderId;
}

function decreasingOrderComparator(
  left: OrderedTransaction,
  right: OrderedTransaction
) {
  return left.orderId - right.orderId;
}

function getOrderedTransactionHeap(
  mempoolOrder: MempoolOrder,
  baseFee?: BN
): Heap<OrderedTransaction> {
  switch (mempoolOrder) {
    case "priority":
      return new Heap<OrderedTransaction>((a, b) =>
        decreasingOrderEffectiveMinerFeeComparator(a, b, baseFee)
      );
    case "fifo":
      return new Heap<OrderedTransaction>((a, b) =>
        decreasingOrderComparator(a, b)
      );
    default:
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new InvalidInputError(
        `Invalid mempool order: ${mempoolOrder as any}`
      );
  }
}

/**
 * A queue of transactions in the order that they could be mined in the next
 * block.
 *
 * A transaction being part of this queue doesn't mean that it will be mined in
 * the next block, as it may not meet the required criteria to be included or
 * may not fit within the block.
 *
 * If after getting the next transaction in the queue you decided not to mine
 * it, the other transactions that belong to that sender MUST be removed from
 * the queue by calling the #removeLastSenderTransactions() method.
 **/
export class TransactionQueue {
  private readonly _queuedTransactions: Map<string, OrderedTransaction[]> =
    new Map();

  private readonly _heap: Heap<OrderedTransaction>;

  private _lastTransactionSender?: string;

  /**
   * Creates a TransactionQueue.
   *
   * @param pendingTransactions A map of sender to a list of their transactions,
   *  sorted by nonce and without nonce gaps.
   * @param baseFee The base fee of the next block, if it's going to use EIP-1559
   */
  constructor(
    pendingTransactions: Map<string, OrderedTransaction[]>,
    mempoolOrder: MempoolOrder,
    baseFee?: BN
  ) {
    this._heap = getOrderedTransactionHeap(mempoolOrder, baseFee);

    for (const [address, txList] of pendingTransactions) {
      if (baseFee === undefined && txList.some((tx) => tx.data.type === 2)) {
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw new InternalError(
          "Trying to initialize and sort a mempool with an EIP-1559 tx but no base fee"
        );
      }

      const [firstTx, ...remainingTxs] = txList;
      this._heap.push(firstTx);
      this._queuedTransactions.set(address, remainingTxs);
    }
  }

  public getNextTransaction(): TypedTransaction | undefined {
    if (this._lastTransactionSender !== undefined) {
      this._moveFirstEnqueuedTransactionToHeap(this._lastTransactionSender);
    }

    const nextTx = this._heap.pop();
    if (nextTx === undefined) {
      return undefined;
    }

    this._lastTransactionSender = nextTx.data.getSenderAddress().toString();
    return nextTx.data;
  }

  public removeLastSenderTransactions() {
    if (this._lastTransactionSender === undefined) {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new InternalError(
        "TransactionQueue#removeLastSenderTransactions called before TransactionQueue#getNextTransaction"
      );
    }

    this._queuedTransactions.delete(this._lastTransactionSender);
    this._lastTransactionSender = undefined;
  }

  private _moveFirstEnqueuedTransactionToHeap(sender: string) {
    const queue = this._queuedTransactions.get(sender);
    if (queue === undefined || queue.length === 0) {
      return;
    }

    const [first, ...rest] = queue;
    this._heap.push(first);
    this._queuedTransactions.set(sender, rest);
  }
}
