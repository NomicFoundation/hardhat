import type { ExternalParamValue } from "./deploymentGraph";
import type { Artifact } from "./hardhat";
import type { ethers } from "ethers";

import { ModuleParams } from "./module";

export interface Providers {
  artifacts: ArtifactsProvider;
  ethereumProvider: EIP1193Provider;
  gasProvider: GasProvider;
  transactions: TransactionsProvider;
  config: ConfigProvider;
  accounts: AccountsProvider;
}

export interface ArtifactsProvider {
  getArtifact: (name: string) => Promise<Artifact>;
  hasArtifact: (name: string) => Promise<boolean>;
}

export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export interface GasProvider {
  estimateGasLimit: (
    tx: ethers.providers.TransactionRequest
  ) => Promise<ethers.BigNumber>;
  estimateGasPrice: () => Promise<ethers.BigNumber>;
}

export interface TransactionsProvider {
  isConfirmed(txHash: string): Promise<boolean>;
  isMined(txHash: string): Promise<boolean>;
}

export type HasParamErrorCode = "no-params" | "param-missing";

export type HasParamResult =
  | {
      found: false;
      errorCode: HasParamErrorCode;
    }
  | { found: true };

export interface ConfigProvider {
  parameters: ModuleParams | undefined;

  setParams(parameters: { [key: string]: ExternalParamValue }): Promise<void>;

  getParam(paramName: string): Promise<ExternalParamValue>;

  hasParam(paramName: string): Promise<HasParamResult>;
}

export interface AccountsProvider {
  getAccounts(): Promise<string[]>;
  getSigner(address: string): Promise<ethers.Signer>;
}
