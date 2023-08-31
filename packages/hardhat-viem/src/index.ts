import { extendEnvironment } from "hardhat/config";

import {
  getPublicClient,
  getWalletClients,
  getWalletClient,
  getTestClient,
} from "./internal/clients";
import { deployContract, getContractAt } from "./internal/contracts";
import "./internal/type-extensions";

extendEnvironment((hre) => {
  const { provider } = hre.network;

  hre.viem = {
    getPublicClient: (publicClientConfig) =>
      getPublicClient(provider, publicClientConfig),

    getWalletClients: (walletClientConfig) =>
      getWalletClients(provider, walletClientConfig),

    getWalletClient: (address, walletClientConfig) =>
      getWalletClient(provider, address, walletClientConfig),

    getTestClient: (testClientConfig) =>
      getTestClient(provider, testClientConfig),

    deployContract: (contractName, constructorArgs, config) =>
      deployContract(hre, contractName, constructorArgs, config),

    getContractAt: (contractName, address, config) =>
      getContractAt(hre, contractName, address, config),
  };
});
