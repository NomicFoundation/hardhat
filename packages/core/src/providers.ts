import type { ethers } from "ethers";

import { Artifact } from "./types";

export interface Providers {
  artifacts: ArtifactsProvider;
  ethereumProvider: EIP1193Provider;
  gasProvider: GasProvider;
  signers: SignersProvider;
  transactions: TransactionsProvider;
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

export interface IgnitionSigner {
  sendTransaction: (
    tx: ethers.providers.TransactionRequest
  ) => Promise<ethers.providers.TransactionResponse>;
}
