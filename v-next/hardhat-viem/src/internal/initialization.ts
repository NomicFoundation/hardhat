import type { HardhatViemHelpers } from "../types.js";
import type { ArtifactManager } from "hardhat/types/artifacts";
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
): HardhatViemHelpers<ChainTypeT> {
  return {
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
        contractName,
        constructorArgs,
        sendDeploymentTransactionConfig,
      ),

    getContractAt: (contractName, address, getContractAtConfig) =>
      getContractAt(
        provider,
        artifactManager,
        contractName,
        address,
        getContractAtConfig,
      ),
  };
}
