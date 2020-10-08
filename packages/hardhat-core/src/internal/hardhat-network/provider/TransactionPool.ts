import { Transaction } from "ethereumjs-tx";
import { bufferToInt } from "ethereumjs-util";
import { List as ImmutableList, Map as ImmutableMap } from "immutable";

import { PStateManager } from "./types/PStateManager";

export class TransactionPool {
  // TODO: change this later to ImmutableMap<string, ImmutableList>
  private _pendingTransactions: ImmutableList<Transaction> = ImmutableList();
  private _queuedTransactions: ImmutableList<Transaction> = ImmutableList();
  private _nonces = ImmutableMap<string, number>();

  constructor(private readonly _stateManager: PStateManager) {}

  public async addTransaction(tx: Transaction) {
    const currentNonce = await this.getAccountNonce(tx.getSenderAddress());
    if (bufferToInt(tx.nonce) < currentNonce) {
      throw new Error("Nonce too low");
    }

    if (bufferToInt(tx.nonce) === currentNonce) {
      this._nonces = this._nonces.set(
        tx.getSenderAddress().toString(),
        bufferToInt(tx.nonce) + 1
      );
      this._pendingTransactions = this._pendingTransactions.push(tx);
    } else {
      this._queuedTransactions = this._queuedTransactions.push(tx);
    }
  }

  public getPendingTransactions(): Transaction[] {
    return this._pendingTransactions.toArray();
  }

  public async getAccountNonce(address: Buffer): Promise<number> {
    let nonce = this._nonces.get(address.toString());

    if (nonce === undefined) {
      const account = await this._stateManager.getAccount(address);
      nonce = bufferToInt(account.nonce);
    }

    return nonce;
  }
}
