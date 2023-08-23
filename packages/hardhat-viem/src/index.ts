import { extendEnvironment } from "hardhat/config";

import {
  getPublicClient,
  getWalletClients,
  getWalletClient,
  getTestClient,
} from "./internal/clients";
import "./internal/type-extensions";

extendEnvironment((hre) => {
  hre.viem = {
    getPublicClient: (publicClientConfig) =>
      getPublicClient(hre.network.provider, publicClientConfig),
    getWalletClients: (walletClientConfig) =>
      getWalletClients(hre.network.provider, walletClientConfig),
    getWalletClient: (address, walletClientConfig) =>
      getWalletClient(hre.network.provider, address, walletClientConfig),
    getTestClient: (testClientConfig) =>
      getTestClient(hre.network.provider, testClientConfig),
  };
});
