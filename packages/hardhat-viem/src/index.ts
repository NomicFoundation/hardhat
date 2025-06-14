import { extendEnvironment } from "hardhat/config";

import {
  getPublicClient,
  getWalletClients,
  getWalletClient,
  getTestClient,
} from "./internal/clients";
import {
  deployContract,
  sendDeploymentTransaction,
  getContractAt,
} from "./internal/contracts";
import "./internal/type-extensions";
import "./internal/tasks";

extendEnvironment((hre) => {
  const network = hre.network;
  const { provider } = hre.network;

  hre.viem = {
    getPublicClient: (publicClientConfig) =>
      getPublicClient(network, publicClientConfig),

    getWalletClients: (walletClientConfig) =>
      getWalletClients(network, walletClientConfig),

    getWalletClient: (address, walletClientConfig) =>
      getWalletClient(network, address, walletClientConfig),

    getTestClient: (testClientConfig) =>
      getTestClient(network, testClientConfig),

    deployContract: (contractName, constructorArgs, config) =>
      deployContract(hre, contractName, constructorArgs, config),

    sendDeploymentTransaction: (contractName, constructorArgs, config) =>
      sendDeploymentTransaction(hre, contractName, constructorArgs, config),

    getContractAt: (contractName, address, config) =>
      getContractAt(hre, contractName, address, config),
  };
});
