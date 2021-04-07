import Common from "@ethereumjs/common";
import { TransactionFactory, TypedTransaction } from "@ethereumjs/tx";
import { StateManager } from "@ethereumjs/vm/dist/state";
import { Address, BN, bufferToHex, toBuffer } from "ethereumjs-util";
import { List as ImmutableList, Record as ImmutableRecord } from "immutable";

import { InvalidInputError } from "../../core/providers/errors";

import {
  AddressToTransactions,
  makePoolState,
  makeSerializedTransaction,
  OrderedTransaction,
  PoolState,
  SenderTransactions,
  SerializedTransaction,
} from "./PoolState";
import { FakeSenderAccessListEIP2930Transaction } from "./transactions/FakeSenderAccessListEIP2930Transaction";
import { FakeSenderTransaction } from "./transactions/FakeSenderTransaction";
import { bnToHex } from "./utils/bnToHex";
import { reorganizeTransactionsLists } from "./utils/reorganizeTransactionsLists";

// tslint:disable only-hardhat-error

export function serializeTransaction(
  tx: OrderedTransaction
): SerializedTransaction {
  const rlpSerialization = bufferToHex(tx.data.serialize());
  const isFake =
    tx.data instanceof FakeSenderTransaction ||
    tx.data instanceof FakeSenderAccessListEIP2930Transaction;
  return makeSerializedTransaction({
    orderId: tx.orderId,
    fakeFrom: isFake ? tx.data.getSenderAddress().toString() : undefined,
    data: rlpSerialization,
    txType: tx.data.transactionType,
  });
}

export function deserializeTransaction(
  tx: SerializedTransaction,
  common: Common
): OrderedTransaction {
  const rlpSerialization = tx.get("data");
  const fakeFrom = tx.get("fakeFrom");

  let data;
  if (fakeFrom !== undefined) {
    const sender = Address.fromString(fakeFrom);
    const serialization = toBuffer(rlpSerialization);

    if (tx.get("txType") === 1) {
      data = FakeSenderAccessListEIP2930Transaction.fromSenderAndRlpSerializedTx(
        sender,
        serialization,
        { common }
      );
    } else {
      data = FakeSenderTransaction.fromSenderAndRlpSerializedTx(
        sender,
        serialization,
        { common }
      );
    }
  } else {
    data = TransactionFactory.fromSerializedData(toBuffer(rlpSerialization), {
      common,
    });
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
    private readonly _stateManager: StateManager,
    blockGasLimit: BN,
    common: Common
  ) {
    this._state = makePoolState({
      blockGasLimit: bnToHex(blockGasLimit),
    });
    this._deserializeTransaction = (tx) => deserializeTransaction(tx, common);
  }

  public async addTransaction(tx: TypedTransaction) {
    const senderAddress = this._getSenderAddress(tx);
    const senderNonce = await this.getExecutableNonce(senderAddress);

    await this._validateTransaction(tx, senderAddress, senderNonce);

    const txNonce = new BN(tx.nonce);

    if (txNonce.eq(senderNonce)) {
      this._addPendingTransaction(tx);
    } else {
      this._addQueuedTransaction(tx);
    }
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

  public async getExecutableNonce(accountAddress: Address): Promise<BN> {
    const pendingTxs = this._getPendingForAddress(accountAddress.toString());
    const lastPendingTx = pendingTxs?.last(undefined);

    if (lastPendingTx === undefined) {
      const account = await this._stateManager.getAccount(accountAddress);
      return account.nonce;
    }

    const lastPendingTxNonce = this._deserializeTransaction(lastPendingTx).data
      .nonce;
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
   * Updates the pending and queued list of all addresses, along with their
   * executable nonces.
   */
  public async updatePendingAndQueued() {
    let newPending = this._getPending();

    // update pending transactions
    for (const [address, txs] of newPending) {
      const senderAccount = await this._stateManager.getAccount(
        Address.fromString(address)
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
        const txGasLimit = new BN(deserializedTx.data.gasLimit);

        if (
          txGasLimit.gt(this.getBlockGasLimit()) ||
          txNonce.lt(senderNonce) ||
          deserializedTx.data.getUpfrontCost().gt(senderBalance)
        ) {
          newPending = this._removeTx(newPending, address, deserializedTx);

          // if we are dropping a pending transaction, then we move
          // all the following txs to the queued
          if (txNonce.gt(senderNonce)) {
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
        Address.fromString(address)
      );
      const senderNonce = new BN(senderAccount.nonce);
      const senderBalance = new BN(senderAccount.balance);

      for (const tx of txs) {
        const deserializedTx = this._deserializeTransaction(tx);
        const txNonce = new BN(deserializedTx.data.nonce);
        const txGasLimit = new BN(deserializedTx.data.gasLimit);

        if (
          txGasLimit.gt(this.getBlockGasLimit()) ||
          txNonce.lt(senderNonce) ||
          deserializedTx.data.getUpfrontCost().gt(senderBalance)
        ) {
          newQueued = this._removeTx(newQueued, address, deserializedTx);
        }
      }
    }
    this._setQueued(newQueued);
  }

  private _getSenderAddress(tx: TypedTransaction): Address {
    try {
      return tx.getSenderAddress(); // verifies signature
    } catch (e) {
      if (!tx.isSigned()) {
        throw new InvalidInputError("Invalid Signature");
      }

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

    this._deleteTransactionByHash(deserializedTX.data.hash());

    const indexOfTx = accountTxs.indexOf(serializeTransaction(deserializedTX));
    return map.set(address, accountTxs.remove(indexOfTx));
  }

  private _addPendingTransaction(tx: TypedTransaction) {
    const orderedTx = serializeTransaction({
      orderId: this._nextOrderId++,
      data: tx,
    });

    const hexSenderAddress = tx.getSenderAddress().toString();
    const accountTransactions: SenderTransactions =
      this._getPendingForAddress(hexSenderAddress) ?? ImmutableList();

    const { newPending, newQueued } = reorganizeTransactionsLists(
      accountTransactions.push(orderedTx),
      this._getQueuedForAddress(hexSenderAddress) ?? ImmutableList(),
      (stx) => this._deserializeTransaction(stx).data.nonce
    );

    this._setPendingForAddress(hexSenderAddress, newPending);
    this._setQueuedForAddress(hexSenderAddress, newQueued);
    this._setTransactionByHash(bufferToHex(tx.hash()), orderedTx);
  }

  private _addQueuedTransaction(tx: TypedTransaction) {
    const orderedTx = serializeTransaction({
      orderId: this._nextOrderId++,
      data: tx,
    });

    const hexSenderAddress = tx.getSenderAddress().toString();
    const accountTransactions: SenderTransactions =
      this._getQueuedForAddress(hexSenderAddress) ?? ImmutableList();
    this._setQueuedForAddress(
      hexSenderAddress,
      accountTransactions.push(orderedTx)
    );
    this._setTransactionByHash(bufferToHex(tx.hash()), orderedTx);
  }

  private async _validateTransaction(
    tx: TypedTransaction,
    senderAddress: Address,
    senderNonce: BN
  ) {
    if (this._knownTransaction(tx)) {
      throw new InvalidInputError(
        `Known transaction: ${bufferToHex(tx.hash())}`
      );
    }

    // Temporary check that should be removed when transaction replacement is added
    if (this._txWithNonceExists(tx)) {
      throw new InvalidInputError(
        `Transaction with nonce ${tx.nonce.toNumber()} already exists in transaction pool`
      );
    }

    const txNonce = new BN(tx.nonce);

    // Geth returns this error if trying to create a contract and no data is provided
    if (tx.to === undefined && tx.data.length === 0) {
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

  private _knownTransaction(tx: TypedTransaction): boolean {
    const senderAddress = tx.getSenderAddress().toString();
    return (
      this._transactionExists(tx, this._getPendingForAddress(senderAddress)) ||
      this._transactionExists(tx, this._getQueuedForAddress(senderAddress))
    );
  }

  private _transactionExists(
    tx: TypedTransaction,
    txList: SenderTransactions | undefined
  ) {
    const existingTx = txList?.find((etx) =>
      this._deserializeTransaction(etx).data.hash().equals(tx.hash())
    );
    return existingTx !== undefined;
  }

  private _txWithNonceExists(tx: TypedTransaction): boolean {
    const senderAddress = tx.getSenderAddress().toString();
    const queuedTxs: SenderTransactions =
      this._getQueuedForAddress(senderAddress) ?? ImmutableList();

    const queuedTx = queuedTxs.find((ftx) =>
      this._deserializeTransaction(ftx).data.nonce.eq(tx.nonce)
    );
    return queuedTx !== undefined;
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
}
