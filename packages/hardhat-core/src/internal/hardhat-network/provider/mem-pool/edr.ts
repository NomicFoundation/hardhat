import { Address } from "@nomicfoundation/ethereumjs-util";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { MemPool, PendingTransaction, SpecId } from "@ignored/edr";
import { MemPoolAdapter } from "../mem-pool";
import {
  ethereumjsTransactionToEdrSignedTransaction,
  edrSignedTransactionToEthereumJSTypedTransaction,
} from "../utils/convertToEdr";
import { EdrStateManager } from "../EdrState";
import { InvalidInputError } from "../../../core/providers/errors";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class EdrMemPool implements MemPoolAdapter {
  private _memPool;
  private _snapshotIdToMemPool = new Map<number, MemPool>();
  private _nextSnapshotId = 0;

  constructor(
    blockGasLimit: bigint,
    private readonly _stateManager: EdrStateManager,
    private readonly _specId: SpecId
  ) {
    this._memPool = new MemPool(blockGasLimit);
  }

  public asInner(): MemPool {
    return this._memPool;
  }

  public async getBlockGasLimit(): Promise<bigint> {
    return this._memPool.blockGasLimit();
  }

  public async setBlockGasLimit(blockGasLimit: bigint): Promise<void> {
    return this._memPool.setBlockGasLimit(
      this._stateManager.asInner(),
      blockGasLimit
    );
  }

  public async getNextPendingNonce(accountAddress: Address): Promise<bigint> {
    const lastPendingNonce = await this._memPool.lastPendingNonce(
      accountAddress.buf
    );
    return lastPendingNonce !== null
      ? lastPendingNonce + 1n
      : (await this._stateManager.getAccount(accountAddress))?.nonce ?? 0n;
  }

  public async addTransaction(transaction: TypedTransaction): Promise<void> {
    const caller = transaction.getSenderAddress().toBuffer();
    const edrTx = ethereumjsTransactionToEdrSignedTransaction(transaction);

    try {
      const pendingTransaction = await PendingTransaction.create(
        this._specId,
        edrTx,
        caller
      );

      await this._memPool.addTransaction(
        this._stateManager.asInner(),
        pendingTransaction
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidInputError(error.message);
      }

      throw error;
    }
  }

  public async removeTransaction(hash: Buffer): Promise<boolean> {
    return this._memPool.removeTransaction(hash);
  }

  public async update(): Promise<void> {
    return this._memPool.update(this._stateManager.asInner());
  }

  public async getTransactions(): Promise<TypedTransaction[]> {
    const transactions = await this._memPool.transactions();

    return Array.from(
      transactions.map((tx) =>
        edrSignedTransactionToEthereumJSTypedTransaction(
          tx.transaction,
          new Address(tx.caller)
        )
      )
    );
  }

  public async getTransactionByHash(
    hash: Buffer
  ): Promise<TypedTransaction | undefined> {
    const transaction = await this._memPool.transactionByHash(hash);
    if (transaction !== null) {
      return edrSignedTransactionToEthereumJSTypedTransaction(
        transaction.transaction.transaction,
        new Address(transaction.transaction.caller)
      );
    }

    return undefined;
  }

  public async hasFutureTransactions(): Promise<boolean> {
    return this._memPool.hasFutureTransactions();
  }

  public async hasPendingTransactions(): Promise<boolean> {
    return this._memPool.hasPendingTransactions();
  }

  public async makeSnapshot(): Promise<number> {
    const id = this._nextSnapshotId++;
    this._snapshotIdToMemPool.set(id, await this._memPool.deepClone());
    return id;
  }

  public async revertToSnapshot(snapshotId: number): Promise<void> {
    const memPool = this._snapshotIdToMemPool.get(snapshotId);
    if (memPool === undefined) {
      throw new Error("There's no snapshot with such ID");
    }
    this._memPool = memPool;

    this._removeSnapshotsAfter(snapshotId);
  }

  private _removeSnapshotsAfter(snapshotId: number): void {
    const snapshotIds = [...this._snapshotIdToMemPool.keys()].filter(
      (x) => x >= snapshotId
    );

    for (const id of snapshotIds) {
      this._snapshotIdToMemPool.delete(id);
    }
  }
}
