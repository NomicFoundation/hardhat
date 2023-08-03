import { ethers } from "ethers";

export interface Adapters {
  signer: SignerAdapter;
  gas: GasAdapter;
  transactions: TransactionsAdapter;
  blocks: BlocksAdapter;
}

export interface SignerAdapter {
  getSigner(address: string): Promise<ethers.Signer>;
}

export interface GasAdapter {
  estimateGasLimit: (
    tx: ethers.providers.TransactionRequest
  ) => Promise<ethers.BigNumber>;
  estimateGasPrice: () => Promise<ethers.BigNumber>;
}

export interface TransactionsAdapter {
  getTransaction(
    txHash: string
  ): Promise<ethers.providers.TransactionResponse | null | undefined>;

  getTransactionReceipt(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt | null | undefined>;

  getPendingTransactionCount(address: string): Promise<number>;

  getLatestTransactionCount(address: string): Promise<number>;
}

export interface BlocksAdapter {
  getBlock(): Promise<{ number: number; hash: string }>;
}
