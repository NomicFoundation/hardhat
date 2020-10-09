import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";
import { List as ImmutableList, Map as ImmutableMap } from "immutable";

import { PStateManager } from "./types/PStateManager";

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

  private _setExecutableNonce(accountAddress: Buffer, nonce: BN): void {
    this._executableNonces = this._executableNonces.set(
      bufferToHex(accountAddress),
      bufferToHex(toBuffer(nonce))
    );
  }

  private _addPendingTransaction(tx: Transaction) {
    const hexAccountAddress = bufferToHex(tx.getSenderAddress());
    const accountTransactions =
      this._pendingTransactions.get(hexAccountAddress) ??
      ImmutableList<SerializedTransaction>();
    this._pendingTransactions = this._pendingTransactions.set(
      hexAccountAddress,
      accountTransactions.push(serializeTransaction(tx))
    );
  }

  private _addQueuedTransaction(tx: Transaction) {
    const hexAccountAddress = bufferToHex(tx.getSenderAddress());
    const accountTransactions =
      this._queuedTransactions.get(hexAccountAddress) ??
      ImmutableList<SerializedTransaction>();
    this._queuedTransactions = this._queuedTransactions.set(
      hexAccountAddress,
      accountTransactions.push(serializeTransaction(tx))
    );
  }

  private _moveQueuedTransactionToPending(tx: Transaction) {
    const serializedTransaction = serializeTransaction(tx);
    const senderAddress = bufferToHex(tx.getSenderAddress());
    const senderTransactions = this._queuedTransactions.get(
      bufferToHex(tx.getSenderAddress())
    );
    if (senderTransactions === undefined) {
      throw new Error("TODO, this should never happen");
    }
    this._queuedTransactions = this._queuedTransactions.set(
      senderAddress,
      senderTransactions.filter((tx) => tx !== serializedTransaction)
    );
    this._addPendingTransaction(tx);
  }

  private _moveQueuedTransactions() {
    const pendingTransactions = this._pendingTransactions.map((transactions) =>
      transactions.map((tx) => deserializeTransaction(tx))
    );
    const queuedTransactions = this._queuedTransactions.map((transactions) =>
      transactions.map((tx) => deserializeTransaction(tx))
    );

    for (const address in queuedTransactions) {
      if (queuedTransactions.has(address)) {
        const transactions = queuedTransactions.get(address);
        if (transactions !== undefined) {
          transactions.forEach((queued) => {
            const txNonce = new BN(queued.nonce);

            // TODO: Move this to a while loop
            pendingTransactions.get(address)?.forEach((pending) => {
              const pendingNonce = new BN(pending.nonce);
              if (txNonce.addn(1).eq(pendingNonce)) {
                this._moveQueuedTransactionToPending(queued);
              }
            });
          });
        }
      }
    }
  }
}
