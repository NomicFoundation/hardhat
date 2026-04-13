import type { HardhatViemHelpers } from "../types.js";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { ChainDescriptorsConfig } from "hardhat/types/config";
import type { ChainType } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

import {
  getPublicClient,
  getWalletClients,
  getWalletClient,
  getTestClient,
} from "./clients.js";
import {
  deployContract,
  getContractAt,
  sendDeploymentTransaction,
} from "./contracts.js";

export function initializeViem<ChainTypeT extends ChainType | string>(
  chainType: ChainTypeT,
  provider: EthereumProvider,
  artifactManager: ArtifactManager,
  chainDescriptors: ChainDescriptorsConfig,
  networkName: string,
): HardhatViemHelpers<ChainTypeT> {
  return {
    getPublicClient: async (publicClientConfig) =>
      await getPublicClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        publicClientConfig,
      ),

    getWalletClients: async (walletClientConfig) =>
      await getWalletClients(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        walletClientConfig,
      ),

    getWalletClient: async (address, walletClientConfig) =>
      await getWalletClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        address,
        walletClientConfig,
      ),

    getTestClient: async (testClientConfig) =>
      await getTestClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        testClientConfig,
      ),

    deployContract: async (
      contractName,
      constructorArgs,
      deployContractConfig,
    ) =>
      await deployContract(
        provider,
        artifactManager,
        chainDescriptors,
        networkName,
        contractName,
        constructorArgs,
        deployContractConfig,
      ),

    sendDeploymentTransaction: async (
      contractName,
      constructorArgs,
      sendDeploymentTransactionConfig,
    ) =>
      await sendDeploymentTransaction(
        provider,
        artifactManager,
        chainDescriptors,
        networkName,
        contractName,
        constructorArgs,
        sendDeploymentTransactionConfig,
      ),

    getContractAt: async (contractName, address, getContractAtConfig) =>
      await getContractAt(
        provider,
        artifactManager,
        chainDescriptors,
        networkName,
        contractName,
        address,
        getContractAtConfig,
      ),
  };
}
