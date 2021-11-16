import debug from "debug";
import { ethers, Contract, ContractFactory } from "ethers";

import { TxSender } from "./tx-sender";
import { IgnitionSigner, Providers } from "./providers";
import { Artifact } from "./types";
import { sleep } from "./utils";

interface TransactionOptions {
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
}

export class ContractsService {
  private _debug = debug("ignition:services:contracts-service");
  private _ethersProvider: ethers.providers.Web3Provider;

  constructor(
    private _providers: Providers,
    private _txSender: TxSender,
    private _options: { pollingInterval: number }
  ) {
    this._ethersProvider = new ethers.providers.Web3Provider(
      _providers.ethereumProvider
    );
  }

  public async deploy(
    artifact: Artifact,
    args: any[],
    txOptions?: TransactionOptions
  ): Promise<string> {
    this._debug("Deploying contract");
    // TODO this assumes the signer is connected
    const signer = await this._providers.signers.getDefaultSigner();
    const Factory = new ContractFactory(artifact.abi, artifact.bytecode);

    const deployTransaction = Factory.getDeployTransaction(...args);

    return this._sendTx(signer, deployTransaction, txOptions);
  }

  public async call(
    address: string,
    abi: any[],
    method: string,
    args: any[],
    txOptions?: TransactionOptions
  ): Promise<string> {
    this._debug("Calling method of contract");
    const signer = await this._providers.signers.getDefaultSigner();
    const contract = new Contract(address, abi);

    const unsignedTx = await contract.populateTransaction[method](...args);

    return this._sendTx(signer, unsignedTx, txOptions);
  }

  public async staticCall(
    address: string,
    abi: any[],
    method: string,
    args: any[]
  ): Promise<any> {
    const provider = new ethers.providers.Web3Provider(
      this._providers.ethereumProvider
    );
    const contract = new Contract(address, abi, provider);

    return contract.callStatic[method](...args);
  }

  public async getLog(
    txHash: string,
    eventName: string,
    address: string,
    abi: any[]
  ): Promise<any | undefined> {
    const provider = new ethers.providers.Web3Provider(
      this._providers.ethereumProvider
    );
    const contract = new ethers.Contract(address, abi, provider);

    const receipt = await provider.waitForTransaction(txHash);

    for (const log of receipt.logs) {
      const parsedLog = contract.interface.parseLog(log);
      if (parsedLog.name === eventName) {
        return parsedLog;
      }
    }

    return undefined;
  }

  private async _sendTx(
    signer: IgnitionSigner,
    tx: ethers.providers.TransactionRequest,
    txOptions?: TransactionOptions
  ): Promise<string> {
    if (txOptions?.gasLimit !== undefined) {
      tx.gasLimit = ethers.BigNumber.from(txOptions.gasLimit);
    }

    if (txOptions?.gasPrice !== undefined) {
      tx.gasPrice = ethers.BigNumber.from(txOptions.gasPrice);
    }

    let blockNumberWhenSent = await this._ethersProvider.getBlockNumber();
    const txIndexAndHash = await this._txSender.send(
      signer,
      tx,
      blockNumberWhenSent
    );

    const txIndex = txIndexAndHash[0];
    let txHash = txIndexAndHash[1];

    let txSent = tx;
    while (true) {
      const currentBlockNumber = await this._ethersProvider.getBlockNumber();

      if (await this._providers.transactions.isConfirmed(txHash)) {
        break;
      }

      if (blockNumberWhenSent + 5 <= currentBlockNumber) {
        const txToSend = await this._bump(txHash, signer, txSent, txHash);

        blockNumberWhenSent = await this._ethersProvider.getBlockNumber();
        txHash = await this._txSender.sendAndReplace(
          signer,
          txToSend,
          blockNumberWhenSent,
          txIndex
        );

        txSent = txToSend;
      }

      await sleep(this._options.pollingInterval);
    }

    return txHash;
  }

  private async _bump(
    txHash: string,
    signer: IgnitionSigner,
    previousTxRequest: ethers.providers.TransactionRequest,
    previousTxHash: string
  ): Promise<ethers.providers.TransactionRequest> {
    const previousTx = await this._ethersProvider.getTransaction(
      previousTxHash
    );
    const newEstimatedGasPrice =
      await this._providers.gasProvider.estimateGasPrice();

    if (previousTx.gasPrice !== undefined) {
      // Increase 10%, and add 1 to be sure it's at least rounded up
      const newGasPrice = ethers.BigNumber.from(previousTx.gasPrice)
        .mul(110_000)
        .div(100_000)
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
        .mul(110_000)
        .div(100_000)
        .add(1);

      const newMaxPriorityFeePerGas = ethers.BigNumber.from(
        previousTx.maxPriorityFeePerGas
      )
        .mul(110_000)
        .div(100_000)
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

export class ArtifactsService {
  constructor(private readonly _providers: Providers) {}

  public getArtifact(name: string): Promise<Artifact> {
    return this._providers.artifacts.getArtifact(name);
  }
  public hasArtifact(name: string): Promise<boolean> {
    return this._providers.artifacts.hasArtifact(name);
  }
}

export class TransactionsService {
  constructor(private readonly _providers: Providers) {}

  public async wait(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt> {
    const provider = new ethers.providers.Web3Provider(
      this._providers.ethereumProvider
    );

    return provider.waitForTransaction(txHash);
  }
}

export class LoggingService {
  private _enabled: boolean;
  constructor({ enabled }: { enabled: boolean }) {
    this._enabled = enabled;
  }

  public log(...args: string[]) {
    if (this._enabled) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  }
}

export interface Services {
  contracts: ContractsService;
  artifacts: ArtifactsService;
  transactions: TransactionsService;
  logging: LoggingService;
}
