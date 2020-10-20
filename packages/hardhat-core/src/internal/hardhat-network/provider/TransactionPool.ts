import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";
import {
  List as ImmutableList,
  Map as ImmutableMap,
  Record as ImmutableRecord,
} from "immutable";

import { PStateManager } from "./types/PStateManager";
import { reorganizeTransactionsLists } from "./utils/reorganizeTransactionsLists";

// tslint:disable only-hardhat-error

export type SerializedTransaction = ImmutableList<string>;
export type SenderTransactions = ImmutableList<SerializedTransaction>;
type AddressToTransactions = ImmutableMap<string, SenderTransactions>;

export function serializeTransaction(tx: Transaction): SerializedTransaction {
  const serializedFields = tx.raw.map((field) => bufferToHex(field));
  return ImmutableList(serializedFields);
}

export function deserializeTransaction(tx: SerializedTransaction): Transaction {
  const fields = tx.toArray().map((field) => toBuffer(field));
  return new Transaction(fields);
}

export interface OrderedTransaction {
  orderId: number;
  data: Transaction;
}

export interface PoolState {
  pendingTransactions: AddressToTransactions; // address => list of serialized pending Transactions
  queuedTransactions: AddressToTransactions; // address => list of serialized queued Transactions
  executableNonces: ImmutableMap<string, string>; // address => nonce (hex)
  blockGasLimit: BN;
}

const makePoolState = ImmutableRecord<PoolState>({
  pendingTransactions: ImmutableMap(),
  queuedTransactions: ImmutableMap(),
  executableNonces: ImmutableMap(),
  blockGasLimit: new BN(9500000),
});

export class TransactionPool {
  private _state: ImmutableRecord<PoolState>;
  private _snapshotIdToState = new Map<number, ImmutableRecord<PoolState>>();
  private _currentSnapshotId = -1;
  private _nextSnapshotId = 0;

  constructor(
    private readonly _stateManager: PStateManager,
    private _blockGasLimit: BN
  ) {
    this._state = makePoolState({ blockGasLimit: this._blockGasLimit });
  }

  public async addTransaction(tx: Transaction) {
    const senderNonce = await this._validateTransaction(tx);
    const txNonce = new BN(tx.nonce);

    if (txNonce.eq(senderNonce)) {
      this._addPendingTransaction(tx);
    } else {
      this._addQueuedTransaction(tx);
    }
  }

  public snapshot(): number {
    if (this._snapshotIdToState.get(this._currentSnapshotId) !== this._state) {
      this._currentSnapshotId = this._nextSnapshotId++;
      this._snapshotIdToState.set(this._currentSnapshotId, this._state);
    }
    return this._currentSnapshotId;
  }

  public revert(snapshotId: number) {
    const state = this._snapshotIdToState.get(snapshotId);
    if (state === undefined) {
      throw new Error("There's no snapshot with such ID");
    }
    this._currentSnapshotId = snapshotId;
    this._state = state;
  }

  public getPendingTransactions(): Map<string, OrderedTransaction[]> {
    const deserializedImmutableMap = this._getPending().map((txs) =>
      txs
        .map((tx, index) => ({
          orderId: index,
          data: deserializeTransaction(tx),
        }))
        .toJS()
    );
    return new Map(deserializedImmutableMap.entries());
  }

  public getQueuedTransactions(): Map<string, OrderedTransaction[]> {
    const deserializedImmutableMap = this._getQueued().map((txs) =>
      txs
        .map((tx, index) => ({
          orderId: index,
          data: deserializeTransaction(tx),
        }))
        .toJS()
    );
    return new Map(deserializedImmutableMap.entries());
  }

  public async getExecutableNonce(accountAddress: Buffer): Promise<BN> {
    const nonce = this._getExecutableNonces().get(bufferToHex(accountAddress));
    if (nonce === undefined) {
      const account = await this._stateManager.getAccount(accountAddress);
      return new BN(account.nonce);
    }
    return new BN(toBuffer(nonce));
  }

  public getBlockGasLimit() {
    return this._getBlockGasLimit();
  }

  public setBlockGasLimit(newLimit: BN | number) {
    if (typeof newLimit === "number") {
      newLimit = new BN(newLimit);
    }

    this._setBlockGasLimit(newLimit);
  }

  public async clean() {
    this._setPending(await this._cleanMap(this._getPending()));
    this._setQueued(await this._cleanMap(this._getQueued()));
  }

  private async _cleanMap(map: AddressToTransactions) {
    let newMap = map;
    for (const [address, txs] of map) {
      for (const tx of txs) {
        const deserializedTx = deserializeTransaction(tx);
        const txNonce = new BN(deserializedTx.nonce);
        const txGasLimit = new BN(deserializedTx.gasLimit);
        const senderAccount = await this._stateManager.getAccount(
          toBuffer(address)
        );
        const senderNonce = new BN(senderAccount.nonce);
        const senderBalance = new BN(senderAccount.balance);

        if (
          txGasLimit.gt(this._getBlockGasLimit()) ||
          txNonce.lt(senderNonce) ||
          deserializedTx.getUpfrontCost().gt(senderBalance)
        ) {
          newMap = this._removeTx(newMap, address, deserializedTx);
        }
      }
    }
    return newMap;
  }

  private _removeTx(
    map: AddressToTransactions,
    address: string,
    tx: Transaction
  ) {
    const addressTxs = map.get(address);
    if (addressTxs === undefined) {
      throw new Error(
        "Trying to remove a transaction from list that doesn't exist, this should never happen"
      );
    }
    const indexOfTx = addressTxs.indexOf(serializeTransaction(tx));

    return map.set(address, addressTxs.remove(indexOfTx));
  }

  private _addPendingTransaction(tx: Transaction) {
    const hexSenderAddress = bufferToHex(tx.getSenderAddress());
    let accountTransactions =
      this._getPendingForAddress(hexSenderAddress) ?? ImmutableList();
    accountTransactions = accountTransactions.push(serializeTransaction(tx));

    const {
      executableNonce,
      newPending,
      newQueued,
    } = reorganizeTransactionsLists(
      accountTransactions,
      this._getQueuedForAddress(hexSenderAddress) ?? ImmutableList()
    );

    this._setExecutableNonce(hexSenderAddress, executableNonce);
    this._setPendingForAddress(hexSenderAddress, newPending);
    this._setQueuedForAddress(hexSenderAddress, newQueued);
  }

  private _addQueuedTransaction(tx: Transaction) {
    const hexSenderAddress = bufferToHex(tx.getSenderAddress());
    const accountTransactions =
      this._getQueuedForAddress(hexSenderAddress) ?? ImmutableList();
    this._setQueuedForAddress(
      hexSenderAddress,
      accountTransactions.push(serializeTransaction(tx))
    );
  }

  private async _validateTransaction(tx: Transaction): Promise<BN> {
    const txNonce = new BN(tx.nonce);
    const senderAddress = tx.getSenderAddress(); // verifies signature so no need to check it again
    const senderNonce = await this.getExecutableNonce(senderAddress);

    // Geth returns this error if trying to create a contract and no data is provided
    if (tx.to.length === 0 && tx.data.length === 0) {
      throw new Error("contract creation without any data provided");
    }

    const senderAccount = await this._stateManager.getAccount(
      tx.getSenderAddress()
    );
    const senderBalance = new BN(senderAccount.balance);

    if (tx.getUpfrontCost().gt(senderBalance)) {
      throw new Error(
        `sender doesn't have enough funds to send tx. The upfront cost is: ${tx
          .getUpfrontCost()
          .toString()}` +
          ` and the sender's account only has: ${senderBalance.toString()}`
      );
    }

    if (txNonce.lt(senderNonce)) {
      throw new Error("Nonce too low");
    }

    const baseFee = tx.getBaseFee();
    const gasLimit = new BN(tx.gasLimit);

    if (baseFee.gt(gasLimit)) {
      throw new Error(
        `Transaction requires at least ${baseFee} gas but got ${gasLimit}`
      );
    }

    if (gasLimit.gt(this._blockGasLimit)) {
      throw new Error(
        `Transaction gas limit is ${gasLimit} and exceeds block gas limit of ${this._blockGasLimit}`
      );
    }

    return senderNonce;
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

  private _getExecutableNonces() {
    return this._state.get("executableNonces");
  }

  private _getBlockGasLimit() {
    return this._state.get("blockGasLimit");
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

  private _setExecutableNonce(accountAddress: string, nonce: BN): void {
    this._state = this._state.set(
      "executableNonces",
      this._getExecutableNonces().set(
        accountAddress,
        bufferToHex(toBuffer(nonce))
      )
    );
  }

  private _setBlockGasLimit(newLimit: BN) {
    this._state = this._state.set("blockGasLimit", newLimit);
  }
}
