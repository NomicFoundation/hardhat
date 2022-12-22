import setupDebug from "debug";
import { ethers } from "ethers";

import {
  GasProvider,
  IgnitionSigner,
  SignersProvider,
  TransactionsProvider,
} from "types/providers";
import { sleep } from "utils/sleep";
import { TxSender } from "utils/tx-sender";

import type { TransactionOptions } from "./types";

export interface IContractsService {
  sendTx(
    deployTransaction: ethers.providers.TransactionRequest,
    txOptions?: TransactionOptions
  ): Promise<string>;
}

export interface ContractsServiceProviders {
  web3Provider: ethers.providers.Web3Provider;
  signersProvider: SignersProvider;
  transactionsProvider: TransactionsProvider;
  gasProvider: GasProvider;
}

export class ContractsService implements IContractsService {
  private _debug = setupDebug("ignition:services:contracts-service");

  constructor(
    private _providers: ContractsServiceProviders,
    private _txSender: TxSender
  ) {}

  public async sendTx(
    deployTransaction: ethers.providers.TransactionRequest,
    txOptions: TransactionOptions
  ): Promise<string> {
    if (deployTransaction.to !== undefined) {
      this._debug("Calling method of contract");
    } else {
      this._debug("Deploying contract");
    }

    const signer = await this._providers.signersProvider.getDefaultSigner();

    return this._sendTx(signer, deployTransaction, txOptions);
  }

  private async _sendTx(
    signer: IgnitionSigner,
    tx: ethers.providers.TransactionRequest,
    txOptions: TransactionOptions
  ): Promise<string> {
    if (txOptions?.gasLimit !== undefined) {
      tx.gasLimit = ethers.BigNumber.from(txOptions.gasLimit);
    }

    if (txOptions?.gasPrice !== undefined) {
      tx.gasPrice = ethers.BigNumber.from(txOptions.gasPrice);
    }

    let blockNumberWhenSent =
      await this._providers.web3Provider.getBlockNumber();

    let txHash = await this._txSender.send(signer, tx);

    let txSent = tx;
    let retries = 0;
    while (true) {
      const currentBlockNumber =
        await this._providers.web3Provider.getBlockNumber();

      if (await this._providers.transactionsProvider.isConfirmed(txHash)) {
        break;
      }

      if (blockNumberWhenSent + 5 <= currentBlockNumber) {
        if (retries === txOptions.maxRetries) {
          throw new Error("Transaction not confirmed within max retry limit");
        }

        const txToSend = await this._bump(
          txHash,
          signer,
          txSent,
          txHash,
          txOptions.gasIncrementPerRetry
        );

        blockNumberWhenSent =
          await this._providers.web3Provider.getBlockNumber();

        txHash = await this._txSender.sendAndReplace(signer, txToSend);

        txSent = txToSend;
        retries++;
      }

      await sleep(txOptions.pollingInterval);
    }

    return txHash;
  }

  private async _bump(
    _txHash: string,
    _signer: IgnitionSigner,
    previousTxRequest: ethers.providers.TransactionRequest,
    previousTxHash: string,
    gasIncrementPerRetry: ethers.BigNumber | null
  ): Promise<ethers.providers.TransactionRequest> {
    const previousTx = await this._providers.web3Provider.getTransaction(
      previousTxHash
    );

    const newEstimatedGasPrice =
      await this._providers.gasProvider.estimateGasPrice();

    if (previousTx.gasPrice !== undefined) {
      // Increase 10%, and add 1 to be sure it's at least rounded up
      // or add by user's config value if present
      const newGasPrice = gasIncrementPerRetry
        ? ethers.BigNumber.from(previousTx.gasPrice).add(gasIncrementPerRetry)
        : ethers.BigNumber.from(previousTx.gasPrice)
            .mul(110000)
            .div(100000)
            .add(1);

      return {
        ...previousTxRequest,
        nonce: previousTx.nonce,
        gasPrice: newEstimatedGasPrice.gt(newGasPrice)
          ? newEstimatedGasPrice
          : newGasPrice,
      };
    } else if (
      previousTx.maxFeePerGas !== undefined &&
      previousTx.maxPriorityFeePerGas !== undefined
    ) {
      const newMaxFeePerGas = ethers.BigNumber.from(previousTx.maxFeePerGas)
        .mul(110000)
        .div(100000)
        .add(1);

      const newMaxPriorityFeePerGas = ethers.BigNumber.from(
        previousTx.maxPriorityFeePerGas
      )
        .mul(110000)
        .div(100000)
        .add(1);

      return {
        ...previousTxRequest,
        nonce: previousTx.nonce,
        maxFeePerGas: newMaxFeePerGas,
        maxPriorityFeePerGas: newMaxPriorityFeePerGas,
      };
    }

    throw new Error(
      `Transaction doesn't have gasPrice or maxFeePerGas/maxPriorityFeePerGas`
    );
  }
}
