import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex, bufferToInt, toBuffer } from "ethereumjs-util";
import { List as ImmutableList, Map as ImmutableMap } from "immutable";

import { PStateManager } from "./types/PStateManager";
import { reorganizeTransactionsLists } from "./utils/reorganizeTransactionsLists";

// tslint:disable only-hardhat-error

export type SerializedTransaction = ImmutableList<string>;
export type SenderTransactions = ImmutableList<SerializedTransaction>;
type AddressToTransactions = ImmutableMap<string, SenderTransactions>;

/* TODO: */
class SortedImmutableList {
  private _data: ImmutableList<Transaction> = ImmutableList();

  public push(element: Transaction) {
    // TODO
  }

  public toArray(): Transaction[] {
    // TODO
    return [];
  }
}

export function serializeTransaction(tx: Transaction): SerializedTransaction {
  const serializedFields = tx.raw.map((field) => bufferToHex(field));
  return ImmutableList(serializedFields);
}

export function deserializeTransaction(tx: SerializedTransaction): Transaction {
  const fields = tx.toArray().map((field) => toBuffer(field));
  return new Transaction(fields);
}

export class TransactionPool {
  private _pendingTransactions: AddressToTransactions = ImmutableMap(); // address => list of serialized pending Transactions
  private _queuedTransactions: AddressToTransactions = ImmutableMap(); // address => list of serialized queued Transactions
  private _executableNonces = ImmutableMap<string, string>(); // address => nonce (hex)

  constructor(
    private readonly _stateManager: PStateManager,
    private _blockGasLimit: BN
  ) {}

  public async addTransaction(tx: Transaction) {
    const senderNonce = await this._validateTransaction(tx);
    const txNonce = new BN(tx.nonce);

    if (txNonce.eq(senderNonce)) {
      this._addPendingTransaction(tx);
    } else {
      this._addQueuedTransaction(tx);
    }
  }

  public async clean() {
    const removeTx = (
      map: AddressToTransactions,
      tx: Transaction,
      address: string
    ) => {
      const addressTxs = map.get(address)!;
      const indexOfTx = addressTxs.indexOf(serializeTransaction(tx));

      return map.set(address, addressTxs.remove(indexOfTx));
    };

    interface CleanMapOptions {
      checkNonce?: boolean;
    }

    const cleanMap = async (
      map: AddressToTransactions,
      options: CleanMapOptions = {}
    ) => {
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
            txGasLimit.gt(this._blockGasLimit) ||
            (options.checkNonce === true ? txNonce.lt(senderNonce) : false) ||
            deserializedTx.getUpfrontCost().gt(senderBalance)
          ) {
            newMap = removeTx(newMap, deserializedTx, address);
          }
        }
      }
      return newMap;
    };

    this._pendingTransactions = await cleanMap(this._pendingTransactions, {
      checkNonce: true,
    });
    this._queuedTransactions = await cleanMap(this._queuedTransactions);
  }

  public getPendingTransactions(): Map<string, Transaction[]> {
    const deserializedImmutableMap = this._pendingTransactions.map((txs) =>
      txs.map((tx) => deserializeTransaction(tx)).toJS()
    );
    return new Map(deserializedImmutableMap.entries());
  }

  public getQueuedTransactions(): Map<string, Transaction[]> {
    const deserializedImmutableMap = this._queuedTransactions.map((txs) =>
      txs.map((tx) => deserializeTransaction(tx)).toJS()
    );
    return new Map(deserializedImmutableMap.entries());
  }

  public async getExecutableNonce(accountAddress: Buffer): Promise<BN> {
    const nonce = this._executableNonces.get(bufferToHex(accountAddress));
    if (nonce === undefined) {
      const account = await this._stateManager.getAccount(accountAddress);
      return new BN(account.nonce);
    }
    return new BN(toBuffer(nonce));
  }

  public getBlockGasLimit() {
    return this._blockGasLimit;
  }

  public setBlockGasLimit(newLimit: BN | number) {
    if (typeof newLimit === "number") {
      newLimit = new BN(newLimit);
    }

    this._blockGasLimit = newLimit;
  }

  private _addPendingTransaction(tx: Transaction) {
    const hexSenderAddress = bufferToHex(tx.getSenderAddress());
    let accountTransactions =
      this._pendingTransactions.get(hexSenderAddress) ?? ImmutableList();
    accountTransactions = accountTransactions.push(serializeTransaction(tx));

    const {
      executableNonce,
      newPending,
      newQueued,
    } = reorganizeTransactionsLists(
      accountTransactions,
      this._queuedTransactions.get(hexSenderAddress) ?? ImmutableList()
    );

    this._setExecutableNonce(hexSenderAddress, executableNonce);
    this._setPending(hexSenderAddress, newPending);
    this._setQueued(hexSenderAddress, newQueued);
  }

  private _addQueuedTransaction(tx: Transaction) {
    const hexSenderAddress = bufferToHex(tx.getSenderAddress());
    const accountTransactions =
      this._queuedTransactions.get(hexSenderAddress) ?? ImmutableList();
    this._setQueued(
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

  private _setExecutableNonce(accountAddress: string, nonce: BN): void {
    this._executableNonces = this._executableNonces.set(
      accountAddress,
      bufferToHex(toBuffer(nonce))
    );
  }

  private _setPending(address: string, transactions: SenderTransactions) {
    this._pendingTransactions = this._pendingTransactions.set(
      address,
      transactions
    );
  }

  private _setQueued(address: string, transactions: SenderTransactions) {
    this._queuedTransactions = this._queuedTransactions.set(
      address,
      transactions
    );
  }
}
