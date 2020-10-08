import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";
import { List as ImmutableList, Map as ImmutableMap } from "immutable";

import { PStateManager } from "./types/PStateManager";

type SerialisedTransaction = ImmutableList<string>;

export class TransactionPool {
  // TODO: change this later to ImmutableMap<string, ImmutableList>
  private _pendingTransactions = ImmutableList<SerialisedTransaction>(); // list of serialized pending Transactions
  private _queuedTransactions = ImmutableList<SerialisedTransaction>(); // list of serialized queued Transactions
  private _executableNonces = ImmutableMap<string, string>(); // account address => nonce (hex)

  constructor(private readonly _stateManager: PStateManager) {}

  public async addTransaction(tx: Transaction) {
    const txNonce = new BN(tx.nonce);
    const senderNonce = await this.getExecutableNonce(tx.getSenderAddress());

    if (txNonce.lt(senderNonce)) {
      throw new Error("Nonce too low");
    }

    if (txNonce.eq(senderNonce)) {
      this._setExecutableNonce(tx.getSenderAddress(), txNonce.addn(1));
      this._addPendingTransaction(tx);
    } else {
      this._addQueuedTransaction(tx);
    }
  }

  public getPendingTransactions(): Transaction[] {
    const pendingTransactions = this._pendingTransactions.map((tx) =>
      this._deserialiseTransaction(tx)
    );
    return pendingTransactions.toArray();
  }

  public async getExecutableNonce(accountAddress: Buffer): Promise<BN> {
    const nonce = this._executableNonces.get(bufferToHex(accountAddress));
    if (nonce === undefined) {
      const account = await this._stateManager.getAccount(accountAddress);
      return new BN(account.nonce);
    }
    return new BN(toBuffer(nonce));
  }

  private _setExecutableNonce(accountAddress: Buffer, nonce: BN): void {
    this._executableNonces = this._executableNonces.set(
      bufferToHex(accountAddress),
      bufferToHex(toBuffer(nonce))
    );
  }

  private _addPendingTransaction(tx: Transaction) {
    this._pendingTransactions = this._pendingTransactions.push(
      this._serialiseTransaction(tx)
    );
  }

  private _addQueuedTransaction(tx: Transaction) {
    const serialisedTx = this._serialiseTransaction(tx);
    this._queuedTransactions = this._queuedTransactions.push(serialisedTx);
  }

  private _serialiseTransaction(tx: Transaction): SerialisedTransaction {
    const serialisedFields = tx.raw.map((field) => bufferToHex(field));
    return ImmutableList(serialisedFields);
  }

  private _deserialiseTransaction(tx: SerialisedTransaction): Transaction {
    const fields = tx.toArray().map((field) => toBuffer(field));
    return new Transaction(fields);
  }
}
