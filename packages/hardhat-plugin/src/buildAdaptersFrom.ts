import { Adapters } from "@ignored/ignition-core";
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

  const transactionsAdapter = {
    async wait(txHash: string): Promise<ethers.providers.TransactionReceipt> {
      return hre.ethers.provider.waitForTransaction(txHash);
    },
    async getTransactionReceipt(
      txHash: string
    ): Promise<ethers.providers.TransactionReceipt> {
      return hre.ethers.provider.getTransactionReceipt(txHash);
    },
  };

  const adapters: Adapters = {
    transactions: transactionsAdapter,
    gas: gasAdapter,
    signer: signerAdapter,
  };

  return adapters;
}
