import { Common } from "@nomicfoundation/ethereumjs-common";
import { StateManager } from "@nomicfoundation/ethereumjs-statemanager";
import {
  TransactionFactory,
  TypedTransaction,
} from "@nomicfoundation/ethereumjs-tx";
import {
  Account,
  Address,
  bufferToHex,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { List as ImmutableList, Record as ImmutableRecord } from "immutable";
import { InvalidInputError } from "../../../core/providers/errors";
import * as BigIntUtils from "../../../util/bigint";
import { FakeSenderAccessListEIP2930Transaction } from "../transactions/FakeSenderAccessListEIP2930Transaction";
import { FakeSenderEIP1559Transaction } from "../transactions/FakeSenderEIP1559Transaction";
import { FakeSenderTransaction } from "../transactions/FakeSenderTransaction";
import { MemPoolAdapter } from "../mem-pool";
import {
  AddressToTransactions,
  OrderedTransaction,
  PoolState,
  SenderTransactions,
  SerializedTransaction,
  makePoolState,
  makeSerializedTransaction,
} from "../PoolState";
import { reorganizeTransactionsLists } from "../utils/reorganizeTransactionsLists";
import { txMapToArray } from "../utils/txMapToArray";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class HardhatMemPool implements MemPoolAdapter {
  private _state: ImmutableRecord<PoolState>;
  private _snapshotIdToState = new Map<number, ImmutableRecord<PoolState>>();
  private _nextSnapshotId = 0;
  private _nextOrderId = 0;

  private readonly _deserializeTransaction: (
    tx: SerializedTransaction
  ) => OrderedTransaction;

  constructor(
    blockGasLimit: bigint,
    common: Common,
    private readonly _stateManager: StateManager
  ) {
    this._state = makePoolState({
      blockGasLimit: BigIntUtils.toHex(blockGasLimit),
    });
    this._deserializeTransaction = (tx) => _deserializeTransaction(tx, common);
  }

  public async getBlockGasLimit(): Promise<bigint> {
    return BigInt(this._state.get("blockGasLimit"));
  }

  public async setBlockGasLimit(blockGasLimit: bigint): Promise<void> {
    this._state = this._state.set(
      "blockGasLimit",
      BigIntUtils.toHex(blockGasLimit)
    );
  }

  public async addTransaction(tx: TypedTransaction): Promise<void> {
    const senderAddress = _getSenderAddress(tx);
    const sender = await this._stateManager.getAccount(senderAddress);

    const nextConfirmedNonce = sender.nonce;
    const nextPendingNonce =
      (await this.getNextPendingNonce(senderAddress)) ?? nextConfirmedNonce;

    await this._validateTransaction(tx, sender);

    const txNonce = tx.nonce;

    if (txNonce > nextPendingNonce) {
      this._addQueuedTransaction(tx);
    } else {
      this._addPendingTransaction(tx);
    }
  }

  public async removeTransaction(hash: Buffer): Promise<boolean> {
    const tx = this.getOrderedTransactionByHash(hash);

    if (tx === undefined) {
      // transaction doesn't exist in the mempool
      return true;
    }

    this._deleteTransactionByHash(hash);

    const serializedTx = _serializeTransaction(tx);
    const senderAddress = _getSenderAddress(tx.data).toString();

    const pendingForAddress =
      this._getPending().get(senderAddress) ??
      ImmutableList<SerializedTransaction>();
    const queuedForAddress =
      this._getQueued().get(senderAddress) ??
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

  public async update(): Promise<void> {
    let newPending = this._getPending();

    // update pending transactions
    for (const [address, txs] of newPending) {
      const senderAccount = await this._stateManager.getAccount(
        Address.fromString(address)
      );
      const senderNonce = senderAccount.nonce;
      const senderBalance = senderAccount.balance;

      let moveToQueued = false;
      for (const tx of txs) {
        const deserializedTx = this._deserializeTransaction(tx);

        if (moveToQueued) {
          newPending = this._removeTx(newPending, address, deserializedTx);

          const queued = this._getQueued().get(address) ?? ImmutableList();
          this._setQueuedForAddress(address, queued.push(tx));
          continue;
        }

        const txNonce = deserializedTx.data.nonce;

        if (
          !(await this._isTxValid(
            deserializedTx,
            txNonce,
            senderNonce,
            senderBalance
          ))
        ) {
          newPending = this._removeTx(newPending, address, deserializedTx);

          // if we are dropping a pending transaction with a valid nonce,
          // then we move all the following txs to the queued list
          if (txNonce >= senderNonce) {
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
      const senderNonce = senderAccount.nonce;
      const senderBalance = senderAccount.balance;

      for (const tx of txs) {
        const deserializedTx = this._deserializeTransaction(tx);
        const txNonce = deserializedTx.data.nonce;

        if (
          !(await this._isTxValid(
            deserializedTx,
            txNonce,
            senderNonce,
            senderBalance
          ))
        ) {
          newQueued = this._removeTx(newQueued, address, deserializedTx);
        }
      }
    }
    this._setQueued(newQueued);
  }

  public async getTransactions(): Promise<TypedTransaction[]> {
    const txPoolPending = txMapToArray(this.getOrderedPendingTransactions());
    const txPoolQueued = txMapToArray(this.getOrderedQueuedTransactions());
    return txPoolPending.concat(txPoolQueued);
  }

  public async getFutureTransactions(): Promise<TypedTransaction[]> {
    return txMapToArray(this.getOrderedQueuedTransactions());
  }

  public async getPendingTransactions(): Promise<TypedTransaction[]> {
    return txMapToArray(this.getOrderedPendingTransactions());
  }

  public async hasFutureTransactions(): Promise<boolean> {
    const queuedMap = this._getQueued();
    return queuedMap.some((senderQueuedTxs) => !senderQueuedTxs.isEmpty());
  }

  public async hasPendingTransactions(): Promise<boolean> {
    const pendingMap = this._getPending();
    return pendingMap.some((senderPendingTxs) => !senderPendingTxs.isEmpty());
  }

  public async makeSnapshot(): Promise<number> {
    const id = this._nextSnapshotId++;
    this._snapshotIdToState.set(id, this._state);
    return id;
  }

  public async revertToSnapshot(snapshotId: number): Promise<void> {
    const state = this._snapshotIdToState.get(snapshotId);
    if (state === undefined) {
      throw new Error("There's no snapshot with such ID");
    }
    this._state = state;

    this._removeSnapshotsAfter(snapshotId);
  }

  public getOrderedPendingTransactions(): Map<string, OrderedTransaction[]> {
    const deserializedImmutableMap = this._getPending()
      .filter((txs) => txs.size > 0)
      .map(
        (txs) =>
          txs.map(this._deserializeTransaction).toJS() as OrderedTransaction[]
      );

    return new Map(deserializedImmutableMap.entries());
  }

  public getOrderedQueuedTransactions(): Map<string, OrderedTransaction[]> {
    const deserializedImmutableMap = this._getQueued()
      .filter((txs) => txs.size > 0)
      .map(
        (txs) =>
          txs.map(this._deserializeTransaction).toJS() as OrderedTransaction[]
      );

    return new Map(deserializedImmutableMap.entries());
  }

  public async getTransactionByHash(
    hash: Buffer
  ): Promise<TypedTransaction | undefined> {
    return this.getOrderedTransactionByHash(hash)?.data;
  }

  public getOrderedTransactionByHash(
    hash: Buffer
  ): OrderedTransaction | undefined {
    const tx = this._getTransactionsByHash().get(bufferToHex(hash));
    if (tx !== undefined) {
      return this._deserializeTransaction(tx);
    }

    return undefined;
  }

  public async getNextPendingNonce(accountAddress: Address): Promise<bigint> {
    const pendingTxs = this._getPending().get(accountAddress.toString());
    const lastPendingTx = pendingTxs?.last(undefined);

    if (lastPendingTx === undefined) {
      return (await this._stateManager.getAccount(accountAddress)).nonce;
    }

    const lastPendingTxNonce =
      this._deserializeTransaction(lastPendingTx).data.nonce;
    return lastPendingTxNonce + 1n;
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

    const indexOfTx = accountTxs.indexOf(_serializeTransaction(deserializedTX));
    return map.set(address, accountTxs.remove(indexOfTx));
  }

  private _addPendingTransaction(tx: TypedTransaction) {
    const orderedTx = {
      orderId: this._nextOrderId++,
      data: tx,
    };
    const serializedTx = _serializeTransaction(orderedTx);

    const hexSenderAddress = tx.getSenderAddress().toString();
    const accountTransactions: SenderTransactions =
      this._getPending().get(hexSenderAddress) ?? ImmutableList();

    const replaced = this._replacePendingTx(hexSenderAddress, orderedTx);
    if (!replaced) {
      const { newPending, newQueued } = reorganizeTransactionsLists(
        accountTransactions.push(serializedTx),
        this._getQueued().get(hexSenderAddress) ?? ImmutableList(),
        (stx) => this._deserializeTransaction(stx).data.nonce
      );

      this._setPendingForAddress(hexSenderAddress, newPending);
      this._setQueuedForAddress(hexSenderAddress, newQueued);
    }

    this._setTransactionByHash(bufferToHex(tx.hash()), serializedTx);
  }

  private _addQueuedTransaction(tx: TypedTransaction) {
    const orderedTx = {
      orderId: this._nextOrderId++,
      data: tx,
    };
    const serializedTx = _serializeTransaction(orderedTx);

    const hexSenderAddress = tx.getSenderAddress().toString();
    const accountTransactions: SenderTransactions =
      this._getQueued().get(hexSenderAddress) ?? ImmutableList();

    const replaced = this._replaceQueuedTx(hexSenderAddress, orderedTx);
    if (!replaced) {
      this._setQueuedForAddress(
        hexSenderAddress,
        accountTransactions.push(serializedTx)
      );
    }

    this._setTransactionByHash(bufferToHex(tx.hash()), serializedTx);
  }

  private async _validateTransaction(tx: TypedTransaction, sender: Account) {
    if (this._knownTransaction(tx)) {
      throw new InvalidInputError(
        `Known transaction: ${bufferToHex(tx.hash())}`
      );
    }

    const txNonce = tx.nonce;

    // Geth returns this error if trying to create a contract and no data is provided
    if (tx.to === undefined && tx.data.length === 0) {
      throw new InvalidInputError(
        "contract creation without any data provided"
      );
    }

    const maxFee = "gasPrice" in tx ? tx.gasPrice : tx.maxFeePerGas;
    const txMaxUpfrontCost = tx.gasLimit * maxFee + tx.value;

    if (txMaxUpfrontCost > sender.balance) {
      throw new InvalidInputError(
        `sender doesn't have enough funds to send tx. The max upfront cost is: ${txMaxUpfrontCost.toString()}` +
          ` and the sender's account only has: ${sender.balance.toString()}`
      );
    }

    if (txNonce < sender.nonce) {
      throw new InvalidInputError(
        `Nonce too low. Expected nonce to be at least ${sender.nonce.toString()} but got ${txNonce.toString()}.`
      );
    }

    const gasLimit = tx.gasLimit;
    const baseFee = tx.getBaseFee();

    if (gasLimit < baseFee) {
      throw new InvalidInputError(
        `Transaction requires at least ${baseFee.toString()} gas but got ${gasLimit.toString()}`
      );
    }

    const blockGasLimit = await this.getBlockGasLimit();

    if (gasLimit > blockGasLimit) {
      throw new InvalidInputError(
        `Transaction gas limit is ${gasLimit.toString()} and exceeds block gas limit of ${blockGasLimit.toString()}`
      );
    }
  }

  private _knownTransaction(tx: TypedTransaction): boolean {
    const senderAddress = tx.getSenderAddress().toString();
    return (
      this._transactionExists(tx, this._getPending().get(senderAddress)) ||
      this._transactionExists(tx, this._getQueued().get(senderAddress))
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

  private _getTransactionsByHash() {
    return this._state.get("hashToTransaction");
  }

  private _getPending() {
    return this._state.get("pendingTransactions");
  }

  private _getQueued() {
    return this._state.get("queuedTransactions");
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

  private _deleteTransactionByHash(hash: Buffer) {
    this._state = this._state.set(
      "hashToTransaction",
      this._getTransactionsByHash().delete(bufferToHex(hash))
    );
  }

  private async _isTxValid(
    tx: OrderedTransaction,
    txNonce: bigint,
    senderNonce: bigint,
    senderBalance: bigint
  ): Promise<boolean> {
    const txGasLimit = tx.data.gasLimit;

    return (
      txGasLimit <= (await this.getBlockGasLimit()) &&
      txNonce >= senderNonce &&
      tx.data.getUpfrontCost() <= senderBalance
    );
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
    const pendingTxs = this._getPending().get(accountAddress);
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
    const queuedTxs = this._getQueued().get(accountAddress);
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

    const existingTxEntry = txs.findEntry(
      (tx) => this._deserializeTransaction(tx).data.nonce === newTx.data.nonce
    );

    if (existingTxEntry === undefined) {
      return;
    }

    const [existingTxIndex, existingTx] = existingTxEntry;

    const deserializedExistingTx = this._deserializeTransaction(existingTx);

    const currentMaxFeePerGas =
      "gasPrice" in deserializedExistingTx.data
        ? deserializedExistingTx.data.gasPrice
        : deserializedExistingTx.data.maxFeePerGas;

    const currentPriorityFeePerGas =
      "gasPrice" in deserializedExistingTx.data
        ? deserializedExistingTx.data.gasPrice
        : deserializedExistingTx.data.maxPriorityFeePerGas;

    const newMaxFeePerGas =
      "gasPrice" in newTx.data ? newTx.data.gasPrice : newTx.data.maxFeePerGas;

    const newPriorityFeePerGas =
      "gasPrice" in newTx.data
        ? newTx.data.gasPrice
        : newTx.data.maxPriorityFeePerGas;

    const minNewMaxFeePerGas = _getMinNewFeePrice(currentMaxFeePerGas);

    const minNewPriorityFeePerGas = _getMinNewFeePrice(
      currentPriorityFeePerGas
    );

    if (newMaxFeePerGas < minNewMaxFeePerGas) {
      throw new InvalidInputError(
        `Replacement transaction underpriced. A gasPrice/maxFeePerGas of at least ${minNewMaxFeePerGas.toString()} is necessary to replace the existing transaction with nonce ${newTx.data.nonce.toString()}.`
      );
    }

    if (newPriorityFeePerGas < minNewPriorityFeePerGas) {
      throw new InvalidInputError(
        `Replacement transaction underpriced. A gasPrice/maxPriorityFeePerGas of at least ${minNewPriorityFeePerGas.toString()} is necessary to replace the existing transaction with nonce ${newTx.data.nonce.toString()}.`
      );
    }

    const newTxs = txs.set(existingTxIndex, _serializeTransaction(newTx));

    this._deleteTransactionByHash(deserializedExistingTx.data.hash());

    return newTxs;
  }
}

function _getSenderAddress(tx: TypedTransaction): Address {
  try {
    return tx.getSenderAddress(); // verifies signature
  } catch (e: any) {
    if (!tx.isSigned()) {
      throw new InvalidInputError("Invalid Signature");
    }

    throw new InvalidInputError(e.message);
  }
}

export function _serializeTransaction(
  tx: OrderedTransaction
): SerializedTransaction {
  const rlpSerialization = bufferToHex(tx.data.serialize());
  const isFake =
    tx.data instanceof FakeSenderTransaction ||
    tx.data instanceof FakeSenderAccessListEIP2930Transaction ||
    tx.data instanceof FakeSenderEIP1559Transaction;

  return makeSerializedTransaction({
    orderId: tx.orderId,
    fakeFrom: isFake ? tx.data.getSenderAddress().toString() : undefined,
    data: rlpSerialization,
    txType: tx.data.type,
  });
}

function _deserializeTransaction(
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
      data =
        FakeSenderAccessListEIP2930Transaction.fromSenderAndRlpSerializedTx(
          sender,
          serialization,
          { common }
        );
    } else if (tx.get("txType") === 2) {
      data = FakeSenderEIP1559Transaction.fromSenderAndRlpSerializedTx(
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
      disableMaxInitCodeSizeCheck: true,
    });
  }

  return {
    orderId: tx.get("orderId"),
    data,
  };
}

function _getMinNewFeePrice(feePrice: bigint): bigint {
  let minNewPriorityFee = feePrice * 110n;

  if (minNewPriorityFee % 100n === 0n) {
    minNewPriorityFee = minNewPriorityFee / 100n;
  } else {
    minNewPriorityFee = minNewPriorityFee / 100n + 1n;
  }

  return minNewPriorityFee;
}
