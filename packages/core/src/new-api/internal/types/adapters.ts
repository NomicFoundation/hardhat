import {
  Signer,
  TransactionRequest,
  TransactionReceipt,
  TransactionResponse,
} from "ethers";

export interface Adapters {
  signer: SignerAdapter;
  gas: GasAdapter;
  transactions: TransactionsAdapter;
  blocks: BlocksAdapter;
}

export interface SignerAdapter {
  getSigner(address: string): Promise<Signer>;
}

export interface GasAdapter {
  estimateGasLimit: (tx: TransactionRequest) => Promise<bigint>;
  estimateGasPrice: () => Promise<bigint>;
}

export interface TransactionsAdapter {
  getTransaction(
    txHash: string
  ): Promise<TransactionResponse | null | undefined>;

  getTransactionReceipt(
    txHash: string
  ): Promise<TransactionReceipt | null | undefined>;

  getPendingTransactionCount(address: string): Promise<number>;

  getLatestTransactionCount(address: string): Promise<number>;
}

export interface BlocksAdapter {
  getBlock(): Promise<{ number: number; hash: string }>;
}
