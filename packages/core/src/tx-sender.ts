import setupDebug, { IDebugger } from "debug";
import { ethers } from "ethers";

import { Journal } from "./journal/types";
import { GasProvider, IgnitionSigner } from "./providers";

/**
 * Sends, replaces and keeps track of transactions.
 *
 * An instance of this class is created for every executor.
 * Each transaction sent from that executor should go through this class.
 */
export class TxSender {
  private _debug: IDebugger;

  // Index of the last sent tx, or -1 if none was sent yet
  private _txIndex = -1;

  constructor(
    private _moduleId: string,
    private _executorId: string,
    private _gasProvider: GasProvider,
    private _journal: Journal
  ) {
    this._debug = setupDebug(`ignition:tx-sender:${_moduleId}:${_executorId}`);
  }

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
    const nextTxIndex = this._txIndex + 1;
    this._debug(`Getting transaction ${nextTxIndex} from journal`);
    const journaledTx = await this._journal.getEntry(
      this._moduleId,
      this._executorId,
      nextTxIndex
    );

    if (journaledTx !== undefined) {
      this._debug(`Transaction with index ${nextTxIndex} found in journal`);
      this._txIndex = nextTxIndex;
      return [this._txIndex, journaledTx.txHash];
    }

    this._debug(
      `Transaction with index ${nextTxIndex} not found in journal, sending`
    );

    const sentTx = await this._send(signer, tx);

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
    const sentTx = await this._send(signer, tx);
    await this._journal.replaceEntry(
      this._moduleId,
      this._executorId,
      txIndex,
      { txHash: sentTx.hash, blockNumberWhenSent }
    );

    return sentTx.hash;
  }

  private async _send(
    signer: IgnitionSigner,
    tx: ethers.providers.TransactionRequest
  ): Promise<ethers.providers.TransactionResponse> {
    if (tx.gasLimit === undefined) {
      const gasLimit = await this._gasProvider.estimateGasLimit(tx);

      tx.gasLimit = gasLimit;
    }

    if (tx.gasPrice === undefined) {
      const gasPrice = await this._gasProvider.estimateGasPrice();

      tx.gasPrice = gasPrice;
    }

    return signer.sendTransaction(tx);
  }
}
