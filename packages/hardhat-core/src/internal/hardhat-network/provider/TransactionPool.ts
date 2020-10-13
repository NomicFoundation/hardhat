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
  private _blockGasLimit = new BN(10000000);

  constructor(private readonly _stateManager: PStateManager) {}

  public async addTransaction(tx: Transaction) {
    await this._validateTransaction(tx);

    const txNonce = new BN(tx.nonce);
    const senderAddress = tx.getSenderAddress(); // verifies signature so no need to check it again
    const senderNonce = await this.getExecutableNonce(senderAddress);

    if (txNonce.eq(senderNonce)) {
      this._addPendingTransaction(tx);
    } else {
      this._addQueuedTransaction(tx);
    }
  }

  public getPendingTransactions(): Transaction[] {
    const list = this._pendingTransactions
      .toList()
      .map((txs) => txs.map((tx) => deserializeTransaction(tx)))
      .flatten() as ImmutableList<Transaction>;
    return list.toArray();
  }

  public async getExecutableNonce(accountAddress: Buffer): Promise<BN> {
    const nonce = this._executableNonces.get(bufferToHex(accountAddress));
    if (nonce === undefined) {
      const account = await this._stateManager.getAccount(accountAddress);
      return new BN(account.nonce);
    }
    return new BN(toBuffer(nonce));
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

  private async _validateTransaction(tx: Transaction) {
    const txNonce = new BN(tx.nonce);
    const senderNonce = await this.getExecutableNonce(tx.getSenderAddress());

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
