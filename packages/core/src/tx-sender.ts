import { ethers } from "ethers";
import { Journal } from "./journal";
import { IgnitionSigner } from "./providers";

/**
 * Sends, replaces and keeps track of transactions.
 *
 * An instance of this class is created for every executor.
 * Each transaction sent from that executor should go through this class.
 */
export class TxSender {
  // Index of the last sent tx, or -1 if none was sent yet or
  // no journal is available
  private _txIndex = -1;

  constructor(
    private _moduleId: string,
    private _executorId: string,
    private _journal: Journal | undefined
  ) {}

  /**
   * Sends `tx` using `signer`.
   *
   * Returns the index of the transaction in the journal and its hash.
   */
  public async send(
    signer: IgnitionSigner,
    tx: ethers.providers.TransactionRequest,
    blockNumberWhenSent: number
  ): Promise<[number, string]> {
    if (this._journal === undefined) {
      const { hash } = await signer.sendTransaction(tx);
      return [-1, hash];
    }

    const journaledTx = await this._journal.getEntry(
      this._moduleId,
      this._executorId,
      this._txIndex
    );

    if (journaledTx !== undefined) {
      this._txIndex += 1;
      return [this._txIndex, journaledTx.txHash];
    }

    const sentTx = await signer.sendTransaction(tx);
    this._txIndex = await this._journal.addEntry(
      this._moduleId,
      this._executorId,
      { txHash: sentTx.hash, blockNumberWhenSent }
    );

    return [this._txIndex, sentTx.hash];
  }

  /**
   * Sends `tx` to replace the transaction with index `txIndex`.
   *
   * Returns the hash of the new transaction.
   */
  public async sendAndReplace(
    signer: IgnitionSigner,
    tx: ethers.providers.TransactionRequest,
    blockNumberWhenSent: number,
    txIndex: number
  ): Promise<string> {
    if (this._journal === undefined) {
      const { hash } = await signer.sendTransaction(tx);
      return hash;
    }

    const sentTx = await signer.sendTransaction(tx);
    await this._journal.replaceEntry(
      this._moduleId,
      this._executorId,
      txIndex,
      { txHash: sentTx.hash, blockNumberWhenSent }
    );

    return sentTx.hash;
  }
}
