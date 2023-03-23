import type { ExternalParamValue } from "../internal/types/deploymentGraph";
import type { Artifact } from "./hardhat";

import { ethers } from "ethers";

import { ModuleParams } from "./module";

/**
 * The low level adapters that allow Ignition to interact with external services
 * like the target chain or the local filesystem.
 *
 * @internal
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
 * @internal
 */
export interface ArtifactsProvider {
  getArtifact: (name: string) => Promise<Artifact>;
  hasArtifact: (name: string) => Promise<boolean>;
  getAllArtifacts: () => Promise<Artifact[]>;
}

/**
 * Provide access to the target Ethereum chain via requests.
 *
 * @internal
 */
export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/**
 * Provide access to Ethereum gas information for the target chain.
 *
 * @internal
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
 * @internal
 */
export interface TransactionsProvider {
  isConfirmed(txHash: string): Promise<boolean>;
  isMined(txHash: string): Promise<boolean>;
}

/**
 * Allowed error codes for a parameter lookup.
 *
 * @internal
 */
export type HasParamErrorCode = "no-params" | "param-missing";

/**
 * The results of a parameter look up.
 *
 * @internal
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
 * @internal
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
 * @internal
 */
export interface AccountsProvider {
  getAccounts(): Promise<string[]>;
  getSigner(address: string): Promise<ethers.Signer>;
}
