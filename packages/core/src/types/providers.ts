import type { ExternalParamValue } from "../types/dsl";
import type { ArtifactOld } from "./hardhat";

import { ethers } from "ethers";

import { ModuleParams } from "./module";

/**
 * The low level adapters that allow Ignition to interact with external services
 * like the target chain or the local filesystem.
 *
 * @alpha
 */
export interface Providers {
  artifacts: ArtifactsProvider;
  ethereumProvider: EIP1193Provider;
  gasProvider: GasProvider;
  transactions: TransactionsProvider;
  config: ConfigProvider;
  accounts: AccountsProvider;
}

/**
 * Provide access to contract artifacts based on a label.
 *
 * @alpha
 */
export interface ArtifactsProvider {
  getArtifact: (name: string) => Promise<ArtifactOld>;
  hasArtifact: (name: string) => Promise<boolean>;
  getAllArtifacts: () => Promise<ArtifactOld[]>;
}

/**
 * Provide access to the target Ethereum chain via requests.
 *
 * @alpha
 */
export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/**
 * Provide access to Ethereum gas information for the target chain.
 *
 * @alpha
 */
export interface GasProvider {
  estimateGasLimit: (
    tx: ethers.providers.TransactionRequest
  ) => Promise<ethers.BigNumber>;
  estimateGasPrice: () => Promise<ethers.BigNumber>;
}

/**
 * Provide access to transaction information for the target chain.
 *
 * @alpha
 */
export interface TransactionsProvider {
  isConfirmed(txHash: string): Promise<boolean>;
  isMined(txHash: string): Promise<boolean>;
}

/**
 * Allowed error codes for a parameter lookup.
 *
 * @alpha
 */
export type HasParamErrorCode = "no-params" | "param-missing";

/**
 * The results of a parameter look up.
 *
 * @alpha
 */
export type HasParamResult =
  | {
      found: false;
      errorCode: HasParamErrorCode;
    }
  | { found: true };

/**
 * Provide access to configuration options for Ignition execution.
 *
 * @alpha
 */
export interface ConfigProvider {
  parameters: ModuleParams | undefined;

  setParams(parameters: { [key: string]: ExternalParamValue }): Promise<void>;

  getParam(paramName: string): Promise<ExternalParamValue>;

  hasParam(paramName: string): Promise<HasParamResult>;
}

/**
 * Provide a set of usable Ethereum accounts that can be made available within
 * the Module api.
 *
 * @alpha
 */
export interface AccountsProvider {
  getAccounts(): Promise<string[]>;
  getSigner(address: string): Promise<ethers.Signer>;
}
