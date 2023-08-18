import type {
  PublicClientConfig,
  TestClientConfig,
  WalletClientConfig,
} from "viem";

import { extendEnvironment } from "hardhat/config";

import {
  getPublicClient,
  getWalletClients,
  getTestClient,
} from "./internal/clients";
import "./type-extensions";
import "./internal/tasks";

extendEnvironment((hre) => {
  hre.viem = {
    getPublicClient: (publicClientConfig?: Partial<PublicClientConfig>) =>
      getPublicClient(hre.network.provider, publicClientConfig),
    getWalletClients: (walletClientConfig?: Partial<WalletClientConfig>) =>
      getWalletClients(hre.network.provider, walletClientConfig),
    getTestClient: (testClientConfig?: Partial<TestClientConfig>) =>
      getTestClient(hre.network.provider, testClientConfig),
  };
});
