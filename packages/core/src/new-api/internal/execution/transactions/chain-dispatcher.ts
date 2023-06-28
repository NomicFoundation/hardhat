import { ethers } from "ethers";

import { GasAdapter, TransactionsAdapter } from "../../../types/adapters";

interface TransactionSuccess {
  type: "transaction-success";
  contractAddress?: string;
  txId?: string;
}

interface TransactionFailure {
  type: "transaction-failure";
  error: Error;
}

type TransactionReceipt = TransactionSuccess | TransactionFailure;

export interface ChainDispatcher {
  sendTx(
    tx: ethers.providers.TransactionRequest,
    signer: ethers.Signer
  ): Promise<TransactionReceipt>;
  getTxReceipt(txHash: string): Promise<ethers.providers.TransactionReceipt>;
}

/**
 * Dispatch and interact with the blockchain.
 *
 * @beta
 */
export class EthersChainDispatcher implements ChainDispatcher {
  constructor(
    private _gasProvider: GasAdapter,
    private _transactionProvider: TransactionsAdapter
  ) {}

  public async sendTx(
    tx: ethers.providers.TransactionRequest,
    signer: ethers.Signer
  ): Promise<TransactionReceipt> {
    // if (txOptions?.gasLimit !== undefined) {
    //   tx.gasLimit = ethers.BigNumber.from(txOptions.gasLimit);
    // }

    // if (txOptions?.gasPrice !== undefined) {
    //   tx.gasPrice = ethers.BigNumber.from(txOptions.gasPrice);
    // }

    if (tx.gasLimit === undefined) {
      const gasLimit = await this._gasProvider.estimateGasLimit(tx);

      tx.gasLimit = gasLimit;
    }

    if (tx.gasPrice === undefined) {
      const gasPrice = await this._gasProvider.estimateGasPrice();

      tx.gasPrice = gasPrice;
    }
    try {
      const response = await signer.sendTransaction(tx);

      const txHash = response.hash;

      const receipt = await this._transactionProvider.wait(txHash);

      return {
        type: "transaction-success",
        contractAddress: receipt.contractAddress,
        txId: receipt.transactionHash,
      };
    } catch (error) {
      return {
        type: "transaction-failure",
        error:
          error instanceof Error
            ? error
            : new Error("Unknown issue during `sendTx`"),
      };
    }
  }

  public async getTxReceipt(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt> {
    return this._transactionProvider.getTransactionReceipt(txHash);
  }
}
