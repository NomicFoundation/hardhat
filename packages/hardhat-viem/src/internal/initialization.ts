import type * as ClientsModuleT from "./clients.js";
import type * as ContractsModuleT from "./contracts.js";
import type { HardhatViemHelpers } from "../types.js";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { ChainDescriptorsConfig } from "hardhat/types/config";
import type { ChainType } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

let clientsModule: typeof ClientsModuleT | undefined;
let contractsModule: typeof ContractsModuleT | undefined;

export function initializeViem<ChainTypeT extends ChainType | string>(
  chainType: ChainTypeT,
  provider: EthereumProvider,
  artifactManager: ArtifactManager,
  chainDescriptors: ChainDescriptorsConfig,
  networkName: string,
): HardhatViemHelpers<ChainTypeT> {
  return {
    getPublicClient: async (publicClientConfig) => {
      const { getPublicClient } = await getClientsModule();

      return await getPublicClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        publicClientConfig,
      );
    },

    getWalletClients: async (walletClientConfig) => {
      const { getWalletClients } = await getClientsModule();

      return await getWalletClients(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        walletClientConfig,
      );
    },

    getWalletClient: async (address, walletClientConfig) => {
      const { getWalletClient } = await getClientsModule();

      return await getWalletClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        address,
        walletClientConfig,
      );
    },

    getTestClient: async (testClientConfig) => {
      const { getTestClient } = await getClientsModule();

      return await getTestClient(
        provider,
        chainType,
        chainDescriptors,
        networkName,
        testClientConfig,
      );
    },

    deployContract: async (
      contractName,
      constructorArgs,
      deployContractConfig,
    ) => {
      const { deployContract } = await getContractsModule();

      return await deployContract(
        provider,
        artifactManager,
        chainDescriptors,
        networkName,
        contractName,
        constructorArgs,
        deployContractConfig,
      );
    },

    sendDeploymentTransaction: async (
      contractName,
      constructorArgs,
      sendDeploymentTransactionConfig,
    ) => {
      const { sendDeploymentTransaction } = await getContractsModule();

      return await sendDeploymentTransaction(
        provider,
        artifactManager,
        chainDescriptors,
        networkName,
        contractName,
        constructorArgs,
        sendDeploymentTransactionConfig,
      );
    },

    getContractAt: async (contractName, address, getContractAtConfig) => {
      const { getContractAt } = await getContractsModule();

      return await getContractAt(
        provider,
        artifactManager,
        chainDescriptors,
        networkName,
        contractName,
        address,
        getContractAtConfig,
      );
    },
  };
}

async function getClientsModule(): Promise<typeof ClientsModuleT> {
  if (clientsModule === undefined) {
    clientsModule = await import("./clients.js");
  }

  return clientsModule;
}

async function getContractsModule(): Promise<typeof ContractsModuleT> {
  if (contractsModule === undefined) {
    contractsModule = await import("./contracts.js");
  }

  return contractsModule;
}
