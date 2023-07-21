import { Address } from "@nomicfoundation/ethereumjs-util";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { MemPool, PendingTransaction, StateManager } from "rethnet-evm";
import { MemPoolAdapter } from "../mem-pool";
import {
  ethereumjsTransactionToRethnetSignedTransaction,
  ethereumsjsHardforkToRethnetSpecId,
  rethnetSignedTransactionToEthereumJSTypedTransaction,
} from "../utils/convertToRethnet";
import { HardforkName } from "../../../util/hardforks";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class RethnetMemPool implements MemPoolAdapter {
  private _memPool;
  private _snapshotIdToMemPool = new Map<number, MemPool>();
  private _nextSnapshotId = 0;

  constructor(
    blockGasLimit: bigint,
    private readonly _stateManager: StateManager,
    private readonly _hardfork: HardforkName
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
    return this._memPool.setBlockGasLimit(blockGasLimit);
  }

  public async getNextPendingNonce(accountAddress: Address): Promise<bigint> {
    const lastNonce =
      (await this._memPool.lastPendingNonce(accountAddress.buf)) ??
      (await this._stateManager.getAccountByAddress(accountAddress.buf))
        ?.nonce ??
      0n;

    return BigInt(lastNonce) + 1n;
  }

  public async addTransaction(transaction: TypedTransaction): Promise<void> {
    const caller = transaction.getSenderAddress().toBuffer();
    const rethnetTx =
      ethereumjsTransactionToRethnetSignedTransaction(transaction);

    const specId = ethereumsjsHardforkToRethnetSpecId(this._hardfork);

    const pendingTransaction = await PendingTransaction.create(
      this._stateManager,
      specId,
      rethnetTx,
      caller
    );

    return this._memPool.addTransaction(this._stateManager, pendingTransaction);
  }

  public async removeTransaction(hash: Buffer): Promise<boolean> {
    return this._memPool.removeTransaction(hash);
  }

  public async update(): Promise<void> {
    return this._memPool.update(this._stateManager);
  }

  public async getTransactions(): Promise<TypedTransaction[]> {
    const transactions = await this._memPool.transactions();

    return Array.from(
      transactions.map((tx) =>
        rethnetSignedTransactionToEthereumJSTypedTransaction(
          tx.transaction(),
          new Address(tx.caller())
        )
      )
    );
  }

  public async getFutureTransactions(): Promise<TypedTransaction[]> {
    const transactions = await this._memPool.futureTransactions();

    return Array.from(
      transactions.map((tx) =>
        rethnetSignedTransactionToEthereumJSTypedTransaction(
          tx.transaction(),
          new Address(tx.caller())
        )
      )
    );
  }

  public async getPendingTransactions(): Promise<TypedTransaction[]> {
    const transactions = await this._memPool.pendingTransactions();

    return Array.from(
      transactions.map((tx) =>
        rethnetSignedTransactionToEthereumJSTypedTransaction(
          tx.transaction(),
          new Address(tx.caller())
        )
      )
    );
  }

  public async getTransactionByHash(
    hash: Buffer
  ): Promise<TypedTransaction | undefined> {
    const transaction = await this._memPool.transactionByHash(hash);
    if (transaction !== null) {
      return rethnetSignedTransactionToEthereumJSTypedTransaction(
        transaction.transaction(),
        new Address(transaction.caller())
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
