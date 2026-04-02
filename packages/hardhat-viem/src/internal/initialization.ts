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
    getPublicClient: (publicClientConfig) =>
      getPublicClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        publicClientConfig,
      ),

    getWalletClients: (walletClientConfig) =>
      getWalletClients(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        walletClientConfig,
      ),

    getWalletClient: (address, walletClientConfig) =>
      getWalletClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        address,
        walletClientConfig,
      ),

    getTestClient: (testClientConfig) =>
      getTestClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        testClientConfig,
      ),

    deployContract: (contractName, constructorArgs, deployContractConfig) =>
      deployContract(
        provider,
        artifactManager,
        chainDescriptors,
        networkName,
        contractName,
        constructorArgs,
        deployContractConfig,
      ),

    sendDeploymentTransaction: (
      contractName,
      constructorArgs,
      sendDeploymentTransactionConfig,
    ) =>
      sendDeploymentTransaction(
        provider,
        artifactManager,
        chainDescriptors,
        networkName,
        contractName,
        constructorArgs,
        sendDeploymentTransactionConfig,
      ),

    getContractAt: (contractName, address, getContractAtConfig) =>
      getContractAt(
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
