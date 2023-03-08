import { Providers } from "@ignored/ignition-core";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ConfigWrapper } from "./ConfigWrapper";

export function buildIgnitionProvidersFrom(hre: HardhatRuntimeEnvironment) {
  const providers: Providers = {
    artifacts: {
      getArtifact: (name: string) => hre.artifacts.readArtifact(name),
      hasArtifact: async (name: string) => {
        try {
          return await hre.artifacts.artifactExists(name);
        } catch (err) {
          return false;
        }
      },
    },
    gasProvider: {
      estimateGasLimit: async (tx: any) => {
        const gasLimit = await hre.ethers.provider.estimateGas(tx);

        // return 1.5x estimated gas
        return gasLimit.mul(15).div(10);
      },
      estimateGasPrice: async () => {
        return hre.ethers.provider.getGasPrice();
      },
    },
    ethereumProvider: hre.network.provider,
    signers: {
      getDefaultSigner: async () => {
        const [signer] = await hre.ethers.getSigners();
        return signer;
      },
    },
    transactions: {
      isConfirmed: async (txHash: any) => {
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
        if (receipt === null) {
          return false;
        }

        return receipt.blockNumber <= blockNumber;
      },
      isMined: async (txHash: any) => {
        const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
        return receipt !== null;
      },
    },
    config: new ConfigWrapper(),
  };

  return providers;
}
