import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";
import { MempoolOrder } from "./node-types";
import { OrderedTransaction } from "./PoolState";
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
export declare class TransactionQueue {
    private readonly _queuedTransactions;
    private readonly _heap;
    private _lastTransactionSender?;
    /**
     * Creates a TransactionQueue.
     *
     * @param pendingTransactions A map of sender to a list of their transactions,
     *  sorted by nonce and without nonce gaps.
     * @param baseFee The base fee of the next block, if it's going to use EIP-1559
     */
    constructor(pendingTransactions: Map<string, OrderedTransaction[]>, mempoolOrder: MempoolOrder, baseFee?: BN);
    getNextTransaction(): TypedTransaction | undefined;
    removeLastSenderTransactions(): void;
    private _moveFirstEnqueuedTransactionToHeap;
}
//# sourceMappingURL=TransactionQueue.d.ts.map