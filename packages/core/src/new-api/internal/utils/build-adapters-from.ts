import { ethers } from "ethers";

import { EIP1193Provider } from "../../types/provider";
import {
  Adapters,
  BlocksAdapter,
  GasAdapter,
  SignerAdapter,
  TransactionsAdapter,
} from "../types/adapters";

export function buildAdaptersFrom(provider: EIP1193Provider): Adapters {
  const ethersProvider = new ethers.providers.Web3Provider(provider);

  const signerAdapter: SignerAdapter = {
    getSigner: async (address: string): Promise<ethers.Signer> =>
      ethersProvider.getSigner(address),
  };

  const gasAdapter: GasAdapter = {
    estimateGasLimit: async (
      tx: ethers.providers.TransactionRequest
    ): Promise<ethers.BigNumber> => {
      const gasLimit = await ethersProvider.estimateGas(tx);

      // return 1.5x estimated gas
      return gasLimit.mul(15).div(10);
    },
    estimateGasPrice: (): Promise<ethers.BigNumber> => {
      return ethersProvider.getGasPrice();
    },
  };

  const transactionsAdapter: TransactionsAdapter = {
    async getTransactionReceipt(
      txHash: string
    ): Promise<ethers.providers.TransactionReceipt | null | undefined> {
      return ethersProvider.getTransactionReceipt(txHash);
    },
    async getTransaction(
      txHash: string
    ): Promise<ethers.providers.TransactionResponse | null | undefined> {
      return ethersProvider.getTransaction(txHash);
    },
    async getPendingTransactionCount(address: string): Promise<number> {
      return ethersProvider.getTransactionCount(address, "pending");
    },
    async getLatestTransactionCount(address: string): Promise<number> {
      return ethersProvider.getTransactionCount(address, "latest");
    },
  };

  const blockAdapter: BlocksAdapter = {
    async getBlock(): Promise<{ number: number; hash: string }> {
      const blockNumber = await ethersProvider.getBlockNumber();

      const block = await ethersProvider.getBlock(blockNumber);

      return { number: block.number, hash: block.hash };
    },
  };

  const adapters: Adapters = {
    transactions: transactionsAdapter,
    gas: gasAdapter,
    signer: signerAdapter,
    blocks: blockAdapter,
  };

  return adapters;
}
