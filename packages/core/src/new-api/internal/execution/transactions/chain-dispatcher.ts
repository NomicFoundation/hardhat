import { ethers } from "ethers";

import { GasAdapter, TransactionsAdapter } from "../../../types/adapters";

interface TransactionReceipt {
  contractAddress?: string;
  txId?: string;
}

export interface ChainDispatcher {
  sendTx(
    tx: ethers.providers.TransactionRequest,
    signer: ethers.Signer
  ): Promise<TransactionReceipt>;
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

    const response = await signer.sendTransaction(tx);

    const txHash = response.hash;

    const receipt = await this._transactionProvider.wait(txHash);

    return {
      contractAddress: receipt.contractAddress,
      txId: txHash,
    };
  }
}
