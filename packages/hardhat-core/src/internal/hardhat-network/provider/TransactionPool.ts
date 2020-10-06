import { List as ImmutableList } from "immutable";
import { Transaction } from "ethereumjs-tx";
import { PStateManager } from "./types/PStateManager";
import { bufferToInt } from "ethereumjs-util";

export class TransactionPool {
  public transactions: ImmutableList<Transaction> = ImmutableList();

  constructor(private readonly _stateManager: PStateManager) {}

  public async addTransaction(tx: Transaction) {
    const account = await this._stateManager.getAccount(tx.getSenderAddress());
    if (bufferToInt(tx.nonce) <= bufferToInt(account.nonce)) {
      throw new Error("Nonce too low");
    }
    this.transactions = this.transactions.push(tx);
  }

  public getPendingTransactions(): Transaction[] {
    return this.transactions.toArray();
  }
}
