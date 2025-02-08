import type { HardhatViemHelpers } from "../types.js";
import type { ArtifactManager } from "@ignored/hardhat-vnext/types/artifacts";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

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

export async function initializeViem<ChainTypeT extends ChainType | string>(
  chainType: ChainTypeT,
  provider: EthereumProvider,
  artifactManager: ArtifactManager,
): Promise<HardhatViemHelpers<ChainTypeT>> {
  const defaultPublicClient = await getPublicClient(provider, chainType);

  return {
    publicClient: defaultPublicClient,

    getPublicClient: (publicClientConfig) =>
      getPublicClient(provider, chainType, publicClientConfig),

    getWalletClients: (walletClientConfig) =>
      getWalletClients(provider, chainType, walletClientConfig),

    getWalletClient: (address, walletClientConfig) =>
      getWalletClient(provider, chainType, address, walletClientConfig),

    getTestClient: (testClientConfig) =>
      getTestClient(provider, chainType, testClientConfig),

    deployContract: (contractName, constructorArgs, deployContractConfig) =>
      deployContract(
        provider,
        artifactManager,
        defaultPublicClient,
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
        defaultPublicClient,
        contractName,
        constructorArgs,
        sendDeploymentTransactionConfig,
      ),

    getContractAt: (contractName, address, getContractAtConfig) =>
      getContractAt(
        provider,
        artifactManager,
        defaultPublicClient,
        contractName,
        address,
        getContractAtConfig,
      ),
  };
}
