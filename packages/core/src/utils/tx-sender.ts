import setupDebug, { IDebugger } from "debug";
import { ethers } from "ethers";

import { GasProvider } from "../types/providers";

/**
 * Sends, replaces and keeps track of transactions.
 *
 * An instance of this class is created for every executor.
 * Each transaction sent from that executor should go through this class.
 */
export class TxSender {
  private _debug: IDebugger;

  constructor(private _gasProvider: GasProvider) {
    this._debug = setupDebug(`ignition:tx-sender`);
  }

  /**
   * Sends `tx` using `signer`.
   *
   * Returns the index of the transaction in the journal and its hash.
   */
  public async send(
    signer: ethers.Signer,
    tx: ethers.providers.TransactionRequest
  ): Promise<string> {
    this._debug(`sending transaction`, [tx]);

    const sentTx = await this._send(signer, tx);

    return sentTx.hash;
  }

  /**
   * Sends `tx` to replace the transaction with index `txIndex`.
   *
   * Returns the hash of the new transaction.
   */
  public async sendAndReplace(
    signer: ethers.Signer,
    tx: ethers.providers.TransactionRequest
  ): Promise<string> {
    const sentTx = await this._send(signer, tx);

    return sentTx.hash;
  }

  private async _send(
    signer: ethers.Signer,
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
