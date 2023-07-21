import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";

export interface MemPoolAdapter {
  getBlockGasLimit(): Promise<bigint>;

  setBlockGasLimit(blockGasLimit: bigint): Promise<void>;

  /**
   * Returns the next available nonce for an address, taking into account
   * its pending transactions.
   */
  getNextPendingNonce(accountAddress: Address): Promise<bigint>;

  addTransaction(transaction: TypedTransaction): Promise<void>;

  /**
   * Removes the transaction corresponding to the given hash from the mempool. Returns
   * whether a transaction was removed.
   */
  removeTransaction(hash: Buffer): Promise<boolean>;

  /**
   * Updates the pending and queued list of all addresses
   */
  update(): Promise<void>;

  getTransactions(): Promise<TypedTransaction[]>;

  getFutureTransactions(): Promise<TypedTransaction[]>;

  getPendingTransactions(): Promise<TypedTransaction[]>;

  getTransactionByHash(hash: Buffer): Promise<TypedTransaction | undefined>;

  hasFutureTransactions(): Promise<boolean>;

  hasPendingTransactions(): Promise<boolean>;

  makeSnapshot(): Promise<number>;

  revertToSnapshot(snapshotId: number): Promise<void>;
}

export async function hasTransactions(
  memPool: MemPoolAdapter
): Promise<boolean> {
  const [hasFuture, hasPending] = await Promise.all([
    memPool.hasFutureTransactions(),
    memPool.hasPendingTransactions(),
  ]);

  return hasFuture || hasPending;
}
