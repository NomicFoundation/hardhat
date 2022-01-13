"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionQueue = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const heap_1 = __importDefault(require("mnemonist/heap"));
const errors_1 = require("../../core/providers/errors");
function getEffectiveMinerFee(tx, baseFee) {
    // This mimics the EIP-1559 normalize_transaction function
    const maxFeePerGas = "gasPrice" in tx.data ? tx.data.gasPrice : tx.data.maxFeePerGas;
    const maxPriorityFeePerGas = "gasPrice" in tx.data ? tx.data.gasPrice : tx.data.maxPriorityFeePerGas;
    if (baseFee === undefined) {
        return maxFeePerGas;
    }
    return ethereumjs_util_1.BN.min(maxPriorityFeePerGas, maxFeePerGas.sub(baseFee));
}
function decreasingOrderEffectiveMinerFeeComparator(left, right, baseFee) {
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
function decreasingOrderComparator(left, right) {
    return left.orderId - right.orderId;
}
function getOrderedTransactionHeap(mempoolOrder, baseFee) {
    switch (mempoolOrder) {
        case "priority":
            return new heap_1.default((a, b) => decreasingOrderEffectiveMinerFeeComparator(a, b, baseFee));
        case "fifo":
            return new heap_1.default((a, b) => decreasingOrderComparator(a, b));
        default:
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw new errors_1.InvalidInputError(`Invalid mempool order: ${mempoolOrder}`);
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
class TransactionQueue {
    /**
     * Creates a TransactionQueue.
     *
     * @param pendingTransactions A map of sender to a list of their transactions,
     *  sorted by nonce and without nonce gaps.
     * @param baseFee The base fee of the next block, if it's going to use EIP-1559
     */
    constructor(pendingTransactions, mempoolOrder, baseFee) {
        this._queuedTransactions = new Map();
        this._heap = getOrderedTransactionHeap(mempoolOrder, baseFee);
        for (const [address, txList] of pendingTransactions) {
            if (baseFee === undefined && txList.some((tx) => tx.data.type === 2)) {
                // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
                throw new errors_1.InternalError("Trying to initialize and sort a mempool with an EIP-1559 tx but no base fee");
            }
            const [firstTx, ...remainingTxs] = txList;
            this._heap.push(firstTx);
            this._queuedTransactions.set(address, remainingTxs);
        }
    }
    getNextTransaction() {
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
    removeLastSenderTransactions() {
        if (this._lastTransactionSender === undefined) {
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw new errors_1.InternalError("TransactionQueue#removeLastSenderTransactions called before TransactionQueue#getNextTransaction");
        }
        this._queuedTransactions.delete(this._lastTransactionSender);
        this._lastTransactionSender = undefined;
    }
    _moveFirstEnqueuedTransactionToHeap(sender) {
        const queue = this._queuedTransactions.get(sender);
        if (queue === undefined || queue.length === 0) {
            return;
        }
        const [first, ...rest] = queue;
        this._heap.push(first);
        this._queuedTransactions.set(sender, rest);
    }
}
exports.TransactionQueue = TransactionQueue;
//# sourceMappingURL=TransactionQueue.js.map