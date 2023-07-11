import { ethers } from "ethers";

/**
 * Provide adapters for on-chain interactions.
 *
 * @beta
 */
export interface Adapters {
  signer: SignerAdapter;
  gas: GasAdapter;
  transactions: TransactionsAdapter;
  blocks: BlocksAdapter;
}

/**
 * Provide a transaction signer.
 *
 * @beta
 */
export interface SignerAdapter {
  getSigner(address: string): Promise<ethers.Signer>;
}

/**
 * Provide access to Ethereum gas information for the target chain.
 *
 * @beta
 */
export interface GasAdapter {
  estimateGasLimit: (
    tx: ethers.providers.TransactionRequest
  ) => Promise<ethers.BigNumber>;
  estimateGasPrice: () => Promise<ethers.BigNumber>;
}

/**
 * Provide access to Ethereum transactions.
 *
 * @beta
 */
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

/**
 * Provide accto to Ethereum blocks
 *
 * @beta
 */
export interface BlocksAdapter {
  getBlock(): Promise<{ number: number; hash: string }>;
}
