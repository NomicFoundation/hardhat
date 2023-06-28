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
  wait(txHash: string): Promise<ethers.providers.TransactionReceipt>;
  getTransactionReceipt(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt>;
}
