import { List as ImmutableList, Map as ImmutableMap } from "immutable";
import { Transaction } from "ethereumjs-tx";
import { PStateManager } from "./types/PStateManager";
import { bufferToInt } from "ethereumjs-util";

export class TransactionPool {
  // TODO: change this later to ImmutableMap<string, ImmutableList>
  private pendingTransactions: ImmutableList<Transaction> = ImmutableList();
  private queuedTransactions: ImmutableList<Transaction> = ImmutableList();
  private nonces = ImmutableMap<string, Number>();

  constructor(private readonly _stateManager: PStateManager) {}

  public async addTransaction(tx: Transaction) {
    const currentNonce = await this.getAccountNonce(tx.getSenderAddress());
    if (bufferToInt(tx.nonce) < currentNonce) {
      throw new Error("Nonce too low");
    }

    if (bufferToInt(tx.nonce) === currentNonce) {
      this.nonces = this.nonces.set(
        tx.getSenderAddress().toString(),
        bufferToInt(tx.nonce) + 1
      );
      this.pendingTransactions = this.pendingTransactions.push(tx);
    } else {
      this.queuedTransactions = this.queuedTransactions.push(tx);
    }
  }

  public getPendingTransactions(): Transaction[] {
    return this.pendingTransactions.toArray();
  }

  public async getAccountNonce(address: Buffer): Promise<Number> {
    let nonce = this.nonces.get(address.toString());

    if (nonce === undefined) {
      const account = await this._stateManager.getAccount(address);
      nonce = bufferToInt(account.nonce);
    }

    return nonce;
  }
}
