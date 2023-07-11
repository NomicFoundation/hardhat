import {
  Adapters,
  BlocksAdapter,
  TransactionsAdapter,
} from "@ignored/ignition-core";
import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export function buildAdaptersFrom(hre: HardhatRuntimeEnvironment): Adapters {
  const signerAdapter = {
    getSigner: (address: string): Promise<ethers.Signer> =>
      hre.ethers.getSigner(address),
  };

  const gasAdapter = {
    estimateGasLimit: async (
      tx: ethers.providers.TransactionRequest
    ): Promise<ethers.BigNumber> => {
      const gasLimit = await hre.ethers.provider.estimateGas(tx);

      // return 1.5x estimated gas
      return gasLimit.mul(15).div(10);
    },
    estimateGasPrice: (): Promise<ethers.BigNumber> => {
      return hre.ethers.provider.getGasPrice();
    },
  };

  const transactionsAdapter: TransactionsAdapter = {
    async getTransactionReceipt(
      txHash: string
    ): Promise<ethers.providers.TransactionReceipt | null | undefined> {
      return hre.ethers.provider.getTransactionReceipt(txHash);
    },
    async getTransaction(
      txHash: string
    ): Promise<ethers.providers.TransactionResponse | null | undefined> {
      return hre.ethers.provider.getTransaction(txHash);
    },
    async getPendingTransactionCount(address: string): Promise<number> {
      return hre.ethers.provider.getTransactionCount(address, "pending");
    },
    async getLatestTransactionCount(address: string): Promise<number> {
      return hre.ethers.provider.getTransactionCount(address, "latest");
    },
  };

  const blockAdapter: BlocksAdapter = {
    async getBlock(): Promise<{ number: number; hash: string }> {
      const blockNumber = await hre.ethers.provider.getBlockNumber();

      const block = await hre.ethers.provider.getBlock(blockNumber);

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
