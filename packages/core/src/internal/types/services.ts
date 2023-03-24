import type { Artifact } from "../../types/hardhat";
import type {
  GasProvider,
  HasParamResult,
  TransactionsProvider,
} from "../../types/providers";
import type { ExternalParamValue } from "./deploymentGraph";

import { ethers } from "ethers";

export interface IAccountsService {
  getAccounts(): Promise<string[]>;
  getSigner(address: string): Promise<ethers.Signer>;
}

export interface IArtifactsService {
  getArtifact(name: string): Promise<Artifact>;
  hasArtifact(name: string): Promise<boolean>;
}

export interface IConfigService {
  getParam(paramName: string): Promise<ExternalParamValue>;

  hasParam(paramName: string): Promise<HasParamResult>;
}

export interface IContractsService {
  sendTx(
    deployTransaction: ethers.providers.TransactionRequest,
    txOptions?: TransactionOptions
  ): Promise<string>;
}

export interface INetworkService {
  getChainId(): Promise<number>;
}

export interface ITransactionsService {
  wait(txHash: string): Promise<ethers.providers.TransactionReceipt>;
  waitForEvent(
    filter: ethers.EventFilter,
    durationMs: number
  ): Promise<ethers.providers.Log | null>;
}

export interface TransactionOptions {
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  maxRetries: number;
  gasPriceIncrementPerRetry: ethers.BigNumber | null;
  pollingInterval: number;
  signer: ethers.Signer;
}

export interface ContractsServiceProviders {
  web3Provider: ethers.providers.Web3Provider;
  transactionsProvider: TransactionsProvider;
  gasProvider: GasProvider;
}

export interface Services {
  network: INetworkService;
  contracts: IContractsService;
  artifacts: IArtifactsService;
  transactions: ITransactionsService;
  config: IConfigService;
  accounts: IAccountsService;
}
