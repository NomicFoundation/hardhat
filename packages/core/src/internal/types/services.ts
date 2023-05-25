import type { ArtifactOld } from "../../types/hardhat";
import type {
  GasProvider,
  HasParamResult,
  TransactionsProvider,
} from "../../types/providers";
import type { ExternalParamValue } from "./../../types/dsl";

import { ethers } from "ethers";

/**
 * Access a set of predefined ethereum accounts and their equivalent signers.
 *
 * @internal
 */
export interface IAccountsService {
  getAccounts(): Promise<string[]>;
  getSigner(address: string): Promise<ethers.Signer>;
}

/**
 * Provide access to contract artifacts (i.e. the container for a contract's
 * abi, bytecode and other key metadata).
 *
 * @internal
 */
export interface IArtifactsService {
  getArtifact(name: string): Promise<ArtifactOld>;
  hasArtifact(name: string): Promise<boolean>;
  getAllArtifacts(): Promise<ArtifactOld[]>;
}

/**
 * Provide access to underlying configuration options.
 *
 * @internal
 */
export interface IConfigService {
  getParam(paramName: string): Promise<ExternalParamValue>;

  hasParam(paramName: string): Promise<HasParamResult>;
}

/**
 * Allow the sending of transactions to smart contracts on-chain.
 *
 * @internal
 */
export interface IContractsService {
  sendTx(
    deployTransaction: ethers.providers.TransactionRequest,
    txOptions?: TransactionOptions
  ): Promise<string>;
}

/**
 * Provide access to details of the chain being deployed against.
 *
 * @internal
 */
export interface INetworkService {
  getChainId(): Promise<number>;
}

/**
 * Provide general access to the target chains transaction and event
 * processing.
 *
 * @internal
 */
export interface ITransactionsService {
  wait(txHash: string): Promise<ethers.providers.TransactionReceipt>;
  waitForEvent(
    filter: ethers.EventFilter,
    durationMs: number
  ): Promise<ethers.providers.Log | null>;
}

/**
 * Configuration options to be sent to the target chain with the transaction
 * to be processed.
 *
 * @internal
 */
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

/**
 * Adapter implementations for the underlying services that represent
 * Ignitions interactions with external systems (i.e. the target blockchain,
 * the filesystem etc).
 *
 * @internal
 */
export interface Services {
  network: INetworkService;
  contracts: IContractsService;
  artifacts: IArtifactsService;
  transactions: ITransactionsService;
  config: IConfigService;
  accounts: IAccountsService;
}
