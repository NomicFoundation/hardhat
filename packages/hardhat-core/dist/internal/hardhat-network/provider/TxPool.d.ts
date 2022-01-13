/// <reference types="node" />
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { StateManager } from "@ethereumjs/vm/dist/state";
import { Address, BN } from "ethereumjs-util";
import { OrderedTransaction, SerializedTransaction } from "./PoolState";
export declare function serializeTransaction(tx: OrderedTransaction): SerializedTransaction;
export declare function deserializeTransaction(tx: SerializedTransaction, common: Common): OrderedTransaction;
export declare class TxPool {
    private readonly _stateManager;
    private _state;
    private _snapshotIdToState;
    private _nextSnapshotId;
    private _nextOrderId;
    private readonly _deserializeTransaction;
    constructor(_stateManager: StateManager, blockGasLimit: BN, common: Common);
    addTransaction(tx: TypedTransaction): Promise<void>;
    /**
     * Remove transaction with the given hash from the mempool. Returns true
     * if a transaction was removed, false otherwise.
     */
    removeTransaction(txHash: Buffer): boolean;
    snapshot(): number;
    revert(snapshotId: number): void;
    getTransactionByHash(hash: Buffer): OrderedTransaction | undefined;
    hasPendingTransactions(): boolean;
    hasQueuedTransactions(): boolean;
    isEmpty(): boolean;
    getPendingTransactions(): Map<string, OrderedTransaction[]>;
    getQueuedTransactions(): Map<string, OrderedTransaction[]>;
    /**
     * Returns the next available nonce for an address, taking into account
     * its pending transactions.
     */
    getNextPendingNonce(accountAddress: Address): Promise<BN>;
    getBlockGasLimit(): BN;
    setBlockGasLimit(newLimit: BN | number): void;
    /**
     * Updates the pending and queued list of all addresses
     */
    updatePendingAndQueued(): Promise<void>;
    private _getSenderAddress;
    private _removeSnapshotsAfter;
    private _removeTx;
    private _addPendingTransaction;
    private _addQueuedTransaction;
    private _validateTransaction;
    private _knownTransaction;
    private _transactionExists;
    private _getTransactionsByHash;
    private _getPending;
    private _getQueued;
    private _getPendingForAddress;
    private _getQueuedForAddress;
    private _setTransactionByHash;
    private _setPending;
    private _setQueued;
    private _setPendingForAddress;
    private _setQueuedForAddress;
    private _setBlockGasLimit;
    private _deleteTransactionByHash;
    private _isTxValid;
    /**
     * Returns the next available nonce for an address, ignoring its
     * pending transactions.
     */
    private _getNextConfirmedNonce;
    /**
     * Checks if some pending tx with the same nonce as `newTx` exists.
     * If it exists, it replaces it with `newTx` and returns true.
     * Otherwise returns false.
     */
    private _replacePendingTx;
    /**
     * Checks if some queued tx with the same nonce as `newTx` exists.
     * If it exists, it replaces it with `newTx` and returns true.
     * Otherwise returns false.
     */
    private _replaceQueuedTx;
    private _replaceTx;
    private _getMinNewFeePrice;
}
//# sourceMappingURL=TxPool.d.ts.map