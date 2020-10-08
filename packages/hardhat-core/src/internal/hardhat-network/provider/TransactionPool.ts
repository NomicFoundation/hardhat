import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";
import { List as ImmutableList, Map as ImmutableMap } from "immutable";

import { PStateManager } from "./types/PStateManager";

export class TransactionPool {
  // TODO: change this later to ImmutableMap<string, ImmutableList>
  private _pendingTransactions: ImmutableList<Transaction> = ImmutableList();
  private _queuedTransactions: ImmutableList<Transaction> = ImmutableList();
  private _executableNonces: ImmutableMap<string, string> = ImmutableMap(); // account address => nonce (hex)

  constructor(private readonly _stateManager: PStateManager) {}

  public async addTransaction(tx: Transaction) {
    const txNonce = new BN(tx.nonce);
    const senderNonce = await this.getExecutableNonce(tx.getSenderAddress());

    if (txNonce.lt(senderNonce)) {
      throw new Error("Nonce too low");
    }

    if (txNonce.eq(senderNonce)) {
      this._setExecutableNonce(tx.getSenderAddress(), txNonce.addn(1));
      this._pendingTransactions = this._pendingTransactions.push(tx);
    } else {
      this._queuedTransactions = this._queuedTransactions.push(tx);
    }
  }

  public getPendingTransactions(): Transaction[] {
    return this._pendingTransactions.toArray();
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
}
