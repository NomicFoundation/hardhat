import type { ethers } from "ethers";

import { ParamValue } from "./modules/types";
import { Artifact } from "./types";

export interface Providers {
  artifacts: ArtifactsProvider;
  ethereumProvider: EIP1193Provider;
  gasProvider: GasProvider;
  signers: SignersProvider;
  transactions: TransactionsProvider;
  config: ConfigProvider;
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

export interface SignersProvider {
  getDefaultSigner(): Promise<IgnitionSigner>;
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
  setParams(parameters: { [key: string]: ParamValue }): Promise<void>;

  getParam(paramName: string): Promise<ParamValue>;

  hasParam(paramName: string): Promise<HasParamResult>;
}

export interface IgnitionSigner {
  sendTransaction: (
    tx: ethers.providers.TransactionRequest
  ) => Promise<ethers.providers.TransactionResponse>;
}
