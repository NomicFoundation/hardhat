import Common from "ethereumjs-common";
import { FakeTransaction, Transaction } from "ethereumjs-tx";
import { BN, bufferToHex, bufferToInt, toBuffer } from "ethereumjs-util";
import { List as ImmutableList, Record as ImmutableRecord } from "immutable";

import { InvalidInputError } from "./errors";
import {
  AddressToTransactions,
  makePoolState,
  makeSerializedTransaction,
  OrderedTransaction,
  PoolState,
  retrieveNonce,
  SenderTransactions,
  SerializedTransaction,
} from "./PoolState";
import { PStateManager } from "./types/PStateManager";
import { bnToHex } from "./utils/bnToHex";
import { reorganizeTransactionsLists } from "./utils/reorganizeTransactionsLists";

// tslint:disable only-hardhat-error

function hashTx(tx: Transaction | FakeTransaction) {
  return tx instanceof FakeTransaction ? tx.hash(false) : tx.hash(true);
}

export function serializeTransaction(
  tx: OrderedTransaction
): SerializedTransaction {
  const fields = tx.data.raw.map((field) => bufferToHex(field));
  const immutableFields = ImmutableList(fields);
  const isFake = tx.data instanceof FakeTransaction;
  return makeSerializedTransaction({
    orderId: tx.orderId,
    fakeFrom: isFake ? bufferToHex(tx.data.getSenderAddress()) : undefined,
    data: immutableFields,
  });
}

type ArrayWithFrom<T> = T[] & { from?: string };

export function deserializeTransaction(
  tx: SerializedTransaction,
  common: Common
): OrderedTransaction {
  const fields: ArrayWithFrom<Buffer> = tx
    .get("data")
    .map((field) => toBuffer(field))
    .toArray();

  const fakeFrom = tx.get("fakeFrom");
  let data;
  if (fakeFrom !== undefined) {
    fields.from = fakeFrom;
    data = new FakeTransaction(fields, { common });
  } else {
    data = new Transaction(fields, { common });
  }
  return {
    orderId: tx.get("orderId"),
    data,
  };
}

export class TxPool {
  private _state: ImmutableRecord<PoolState>;
  private _snapshotIdToState = new Map<number, ImmutableRecord<PoolState>>();
  private _nextSnapshotId = 0;
  private _nextOrderId = 0;

  private readonly _deserializeTransaction: (
    tx: SerializedTransaction
  ) => OrderedTransaction;

  constructor(
    private readonly _stateManager: PStateManager,
    blockGasLimit: BN,
    common: Common
  ) {
    this._state = makePoolState({
      blockGasLimit: bnToHex(blockGasLimit),
    });
    this._deserializeTransaction = (tx) => deserializeTransaction(tx, common);
  }

  public async addTransaction(tx: Transaction) {
    const senderAddress = this._getSenderAddress(tx);
    const accountNonce = await this._getAccountNonce(senderAddress);
    const nextNonce = await this.getNextNonce(senderAddress);

    await this._validateTransaction(tx, senderAddress, accountNonce);

    const txNonce = new BN(tx.nonce);

    if (txNonce.lte(nextNonce)) {
      this._addPendingTransaction(tx);
    } else {
      this._addQueuedTransaction(tx);
    }
  }

  /**
   * Remove transaction with the given hash from the mempool. Returns true
   * if a transaction was removed, false otherwise.
   */
  public removeTransaction(txHash: Buffer): boolean {
    const tx = this.getTransactionByHash(txHash);

    if (tx === undefined) {
      // transaction doesn't exist in the mempool
      return false;
    }

    this._deleteTransactionByHash(txHash);

    const serializedTx = serializeTransaction(tx);
    const senderAddress = bufferToHex(this._getSenderAddress(tx.data));

    const pendingForAddress =
      this._getPendingForAddress(senderAddress) ??
      ImmutableList<SerializedTransaction>();
    const queuedForAddress =
      this._getQueuedForAddress(senderAddress) ??
      ImmutableList<SerializedTransaction>();

    // if the tx to remove is in the pending state, remove it
    // and move the following transactions to the queued list
    const indexOfPendingTx = pendingForAddress.indexOf(serializedTx);
    if (indexOfPendingTx !== -1) {
      const newPendingForAddress = pendingForAddress.splice(
        indexOfPendingTx,
        pendingForAddress.size
      );
      const newQueuedForAddress = queuedForAddress.concat(
        pendingForAddress.slice(indexOfPendingTx + 1)
      );

      this._setPendingForAddress(senderAddress, newPendingForAddress);
      this._setQueuedForAddress(senderAddress, newQueuedForAddress);
      return true;
    }

    // if the tx is in the queued state, we just remove it
    const indexOfQueuedTx = queuedForAddress.indexOf(serializedTx);
    if (indexOfQueuedTx !== -1) {
      const newQueuedForAddress = queuedForAddress.splice(indexOfQueuedTx, 1);
      this._setQueuedForAddress(senderAddress, newQueuedForAddress);

      return true;
    }

    throw new Error("Tx should have existed in the pending or queued lists");
  }

  public snapshot(): number {
    const id = this._nextSnapshotId++;
    this._snapshotIdToState.set(id, this._state);
    return id;
  }

  public revert(snapshotId: number) {
    const state = this._snapshotIdToState.get(snapshotId);
    if (state === undefined) {
      throw new Error("There's no snapshot with such ID");
    }
    this._state = state;

    this._removeSnapshotsAfter(snapshotId);
  }

  public getTransactionByHash(hash: Buffer): OrderedTransaction | undefined {
    const tx = this._getTransactionsByHash().get(bufferToHex(hash));
    if (tx !== undefined) {
      return this._deserializeTransaction(tx);
    }

    return undefined;
  }

  public hasPendingTransactions(): boolean {
    const pendingMap = this._getPending();
    return pendingMap.some((senderPendingTxs) => !senderPendingTxs.isEmpty());
  }

  public hasQueuedTransactions(): boolean {
    const queuedMap = this._getQueued();
    return queuedMap.some((senderQueuedTxs) => !senderQueuedTxs.isEmpty());
  }

  public getPendingTransactions(): Map<string, OrderedTransaction[]> {
    const deserializedImmutableMap = this._getPending()
      .filter((txs) => txs.size > 0)
      .map((txs) => txs.map(this._deserializeTransaction).toJS());
    return new Map(deserializedImmutableMap.entries());
  }

  public getQueuedTransactions(): Map<string, OrderedTransaction[]> {
    const deserializedImmutableMap = this._getQueued()
      .filter((txs) => txs.size > 0)
      .map((txs) => txs.map(this._deserializeTransaction).toJS());
    return new Map(deserializedImmutableMap.entries());
  }

  /**
   * Returns the next available nonce for an address, taking into account
   * its pending transactions.
   */
  public async getNextNonce(accountAddress: Buffer): Promise<BN> {
    const pendingTxs = this._getPendingForAddress(bufferToHex(accountAddress));
    const lastPendingTx = pendingTxs?.last(undefined);

    if (lastPendingTx === undefined) {
      return this._getAccountNonce(accountAddress);
    }

    const lastPendingTxNonce = retrieveNonce(lastPendingTx);
    return lastPendingTxNonce.addn(1);
  }

  public getBlockGasLimit(): BN {
    return new BN(toBuffer(this._state.get("blockGasLimit")));
  }

  public setBlockGasLimit(newLimit: BN | number) {
    if (typeof newLimit === "number") {
      newLimit = new BN(newLimit);
    }

    this._setBlockGasLimit(newLimit);
  }

  /**
   * Updates the pending and queued list of all addresses
   */
  public async updatePendingAndQueued() {
    let newPending = this._getPending();

    // update pending transactions
    for (const [address, txs] of newPending) {
      const senderAccount = await this._stateManager.getAccount(
        toBuffer(address)
      );
      const senderNonce = new BN(senderAccount.nonce);
      const senderBalance = new BN(senderAccount.balance);

      let moveToQueued = false;
      for (const tx of txs) {
        const deserializedTx = this._deserializeTransaction(tx);

        if (moveToQueued) {
          newPending = this._removeTx(newPending, address, deserializedTx);

          const queued = this._getQueuedForAddress(address) ?? ImmutableList();
          this._setQueuedForAddress(address, queued.push(tx));
          continue;
        }

        const txNonce = new BN(deserializedTx.data.nonce);

        if (
          !this._isTxValid(deserializedTx, txNonce, senderNonce, senderBalance)
        ) {
          newPending = this._removeTx(newPending, address, deserializedTx);

          // if we are dropping a pending transaction with a valid nonce,
          // then we move all the following txs to the queued list
          if (txNonce.gte(senderNonce)) {
            moveToQueued = true;
          }
        }
      }
    }
    this._setPending(newPending);

    // update queued addresses
    let newQueued = this._getQueued();
    for (const [address, txs] of newQueued) {
      const senderAccount = await this._stateManager.getAccount(
        toBuffer(address)
      );
      const senderNonce = new BN(senderAccount.nonce);
      const senderBalance = new BN(senderAccount.balance);

      for (const tx of txs) {
        const deserializedTx = this._deserializeTransaction(tx);
        const txNonce = new BN(deserializedTx.data.nonce);

        if (
          !this._isTxValid(deserializedTx, txNonce, senderNonce, senderBalance)
        ) {
          newQueued = this._removeTx(newQueued, address, deserializedTx);
        }
      }
    }
    this._setQueued(newQueued);
  }

  private _getSenderAddress(tx: Transaction): Buffer {
    try {
      return tx.getSenderAddress(); // verifies signature
    } catch (e) {
      throw new InvalidInputError(e.message);
    }
  }

  private _removeSnapshotsAfter(snapshotId: number): void {
    const snapshotIds = [...this._snapshotIdToState.keys()].filter(
      (x) => x >= snapshotId
    );

    for (const id of snapshotIds) {
      this._snapshotIdToState.delete(id);
    }
  }

  private _removeTx(
    map: AddressToTransactions,
    address: string,
    deserializedTX: OrderedTransaction
  ) {
    const accountTxs = map.get(address);
    if (accountTxs === undefined) {
      throw new Error(
        "Trying to remove a transaction from list that doesn't exist, this should never happen"
      );
    }

    this._deleteTransactionByHash(hashTx(deserializedTX.data));

    const indexOfTx = accountTxs.indexOf(serializeTransaction(deserializedTX));
    return map.set(address, accountTxs.remove(indexOfTx));
  }

  private _addPendingTransaction(tx: Transaction) {
    const orderedTx = {
      orderId: this._nextOrderId++,
      data: tx,
    };
    const serializedTx = serializeTransaction(orderedTx);

    const hexSenderAddress = bufferToHex(tx.getSenderAddress());
    const accountTransactions: SenderTransactions =
      this._getPendingForAddress(hexSenderAddress) ?? ImmutableList();

    const replaced = this._replacePendingTx(hexSenderAddress, orderedTx);
    if (!replaced) {
      const { newPending, newQueued } = reorganizeTransactionsLists(
        accountTransactions.push(serializedTx),
        this._getQueuedForAddress(hexSenderAddress) ?? ImmutableList()
      );

      this._setPendingForAddress(hexSenderAddress, newPending);
      this._setQueuedForAddress(hexSenderAddress, newQueued);
    }

    this._setTransactionByHash(bufferToHex(hashTx(tx)), serializedTx);
  }

  private _addQueuedTransaction(tx: Transaction) {
    const orderedTx = {
      orderId: this._nextOrderId++,
      data: tx,
    };
    const serializedTx = serializeTransaction(orderedTx);

    const hexSenderAddress = bufferToHex(tx.getSenderAddress());
    const accountTransactions: SenderTransactions =
      this._getQueuedForAddress(hexSenderAddress) ?? ImmutableList();

    const replaced = this._replaceQueuedTx(hexSenderAddress, orderedTx);
    if (!replaced) {
      this._setQueuedForAddress(
        hexSenderAddress,
        accountTransactions.push(serializedTx)
      );
    }

    this._setTransactionByHash(bufferToHex(hashTx(tx)), serializedTx);
  }

  private async _validateTransaction(
    tx: Transaction,
    senderAddress: Buffer,
    senderNonce: BN
  ) {
    if (this._knownTransaction(tx)) {
      throw new InvalidInputError(
        `Known transaction: ${bufferToHex(tx.hash())}`
      );
    }

    const txNonce = new BN(tx.nonce);

    // Geth returns this error if trying to create a contract and no data is provided
    if (tx.to.length === 0 && tx.data.length === 0) {
      throw new InvalidInputError(
        "contract creation without any data provided"
      );
    }

    const senderAccount = await this._stateManager.getAccount(senderAddress);
    const senderBalance = new BN(senderAccount.balance);

    if (tx.getUpfrontCost().gt(senderBalance)) {
      throw new InvalidInputError(
        `sender doesn't have enough funds to send tx. The upfront cost is: ${tx
          .getUpfrontCost()
          .toString()}` +
          ` and the sender's account only has: ${senderBalance.toString()}`
      );
    }

    if (txNonce.lt(senderNonce)) {
      throw new InvalidInputError(
        `Nonce too low. Expected nonce to be at least ${senderNonce.toString()} but got ${txNonce.toString()}.`
      );
    }

    const gasLimit = new BN(tx.gasLimit);
    const gasPrice = new BN(tx.gasPrice);
    const baseFee = tx.getBaseFee();

    if (gasLimit.lt(baseFee)) {
      throw new InvalidInputError(
        `Transaction requires at least ${baseFee} gas but got ${gasLimit}`
      );
    }

    const blockGasLimit = this.getBlockGasLimit();

    if (gasLimit.gt(blockGasLimit)) {
      throw new InvalidInputError(
        `Transaction gas limit is ${gasLimit} and exceeds block gas limit of ${blockGasLimit}`
      );
    }
  }

  private _knownTransaction(tx: Transaction): boolean {
    const senderAddress = bufferToHex(tx.getSenderAddress());
    return (
      this._transactionExists(tx, this._getPendingForAddress(senderAddress)) ||
      this._transactionExists(tx, this._getQueuedForAddress(senderAddress))
    );
  }

  private _transactionExists(
    tx: Transaction,
    txList: SenderTransactions | undefined
  ) {
    const existingTx = txList?.find((etx) =>
      this._deserializeTransaction(etx).data.hash().equals(tx.hash())
    );
    return existingTx !== undefined;
  }

  private _getTransactionsByHash() {
    return this._state.get("hashToTransaction");
  }

  private _getPending() {
    return this._state.get("pendingTransactions");
  }

  private _getQueued() {
    return this._state.get("queuedTransactions");
  }

  private _getPendingForAddress(address: string) {
    return this._getPending().get(address);
  }

  private _getQueuedForAddress(address: string) {
    return this._getQueued().get(address);
  }

  private _setTransactionByHash(
    hash: string,
    transaction: SerializedTransaction
  ) {
    this._state = this._state.set(
      "hashToTransaction",
      this._getTransactionsByHash().set(hash, transaction)
    );
  }

  private _setPending(transactions: AddressToTransactions) {
    this._state = this._state.set("pendingTransactions", transactions);
  }

  private _setQueued(transactions: AddressToTransactions) {
    this._state = this._state.set("queuedTransactions", transactions);
  }

  private _setPendingForAddress(
    address: string,
    transactions: SenderTransactions
  ) {
    this._state = this._state.set(
      "pendingTransactions",
      this._getPending().set(address, transactions)
    );
  }

  private _setQueuedForAddress(
    address: string,
    transactions: SenderTransactions
  ) {
    this._state = this._state.set(
      "queuedTransactions",
      this._getQueued().set(address, transactions)
    );
  }

  private _setBlockGasLimit(newLimit: BN) {
    this._state = this._state.set("blockGasLimit", bnToHex(newLimit));
  }

  private _deleteTransactionByHash(hash: Buffer) {
    this._state = this._state.set(
      "hashToTransaction",
      this._getTransactionsByHash().delete(bufferToHex(hash))
    );
  }

  private _isTxValid(
    tx: OrderedTransaction,
    txNonce: BN,
    senderNonce: BN,
    senderBalance: BN
  ): boolean {
    const txGasLimit = new BN(tx.data.gasLimit);

    return (
      txGasLimit.lte(this.getBlockGasLimit()) &&
      txNonce.gte(senderNonce) &&
      tx.data.getUpfrontCost().lte(senderBalance)
    );
  }

  /**
   * Returns the next available nonce for an address, ignoring its
   * pending transactions.
   */
  private async _getAccountNonce(accountAddress: Buffer): Promise<BN> {
    const account = await this._stateManager.getAccount(accountAddress);
    return new BN(account.nonce);
  }

  /**
   * Checks if some pending tx with the same nonce as `newTx` exists.
   * If it exists, it replaces it with `newTx` and returns true.
   * Otherwise returns false.
   */
  private _replacePendingTx(
    accountAddress: string,
    newTx: OrderedTransaction
  ): boolean {
    const pendingTxs = this._getPendingForAddress(accountAddress);
    const newPendingTxs = this._replaceTx(pendingTxs, newTx);

    if (newPendingTxs !== undefined) {
      this._setPendingForAddress(accountAddress, newPendingTxs);
      return true;
    }

    return false;
  }

  /**
   * Checks if some queued tx with the same nonce as `newTx` exists.
   * If it exists, it replaces it with `newTx` and returns true.
   * Otherwise returns false.
   */
  private _replaceQueuedTx(
    accountAddress: string,
    newTx: OrderedTransaction
  ): boolean {
    const queuedTxs = this._getQueuedForAddress(accountAddress);
    const newQueuedTxs = this._replaceTx(queuedTxs, newTx);

    if (newQueuedTxs !== undefined) {
      this._setQueuedForAddress(accountAddress, newQueuedTxs);
      return true;
    }

    return false;
  }

  private _replaceTx(
    txs: SenderTransactions | undefined,
    newTx: OrderedTransaction
  ): SenderTransactions | undefined {
    if (txs === undefined) {
      return;
    }

    const existingTxEntry = txs.findEntry((tx) =>
      retrieveNonce(tx).eq(new BN(newTx.data.nonce))
    );

    if (existingTxEntry === undefined) {
      return;
    }

    const [existingTxIndex, existingTx] = existingTxEntry;

    const deserializedExistingTx = this._deserializeTransaction(existingTx);

    const currentGasPrice = new BN(deserializedExistingTx.data.gasPrice);
    const newGasPrice = new BN(newTx.data.gasPrice);

    const minNewGasPrice = this._getMinNewGasPrice(currentGasPrice);

    if (newGasPrice.lt(minNewGasPrice)) {
      throw new InvalidInputError(
        `Replacement transaction underpriced. A gas price of at least ${minNewGasPrice.toString()} is necessary to replace the existing transaction.`
      );
    }

    const newTxs = txs.set(existingTxIndex, serializeTransaction(newTx));

    this._deleteTransactionByHash(deserializedExistingTx.data.hash());

    return newTxs;
  }

  private _getMinNewGasPrice(currentGasPrice: BN): BN {
    let minNewGasPrice = currentGasPrice.muln(110);

    if (minNewGasPrice.modn(100) === 0) {
      minNewGasPrice = minNewGasPrice.divn(100);
    } else {
      minNewGasPrice = minNewGasPrice.divn(100).addn(1);
    }

    return minNewGasPrice;
  }
}
