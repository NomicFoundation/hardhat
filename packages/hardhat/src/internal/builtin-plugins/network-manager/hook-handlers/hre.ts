import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { NetworkManager } from "../../../../types/network.js";

import { createLazyLoader } from "@nomicfoundation/hardhat-utils/lang";

import { DEFAULT_NETWORK_NAME } from "../../../constants.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    let networkManager: NetworkManager | undefined;

    const getNetworkManagerImpl = createLazyLoader<NetworkManager>(async () => {
      const { NetworkManagerImplementation } = await import(
        "../network-manager.js"
      );

      networkManager = new NetworkManagerImplementation(
        hre.globalOptions.network !== undefined
          ? hre.globalOptions.network
          : DEFAULT_NETWORK_NAME,
        hre.config.defaultChainType,
        hre.config.networks,
        context.hooks,
        context.artifacts,
        hre.userConfig,
        hre.config.chainDescriptors,
        hre.globalOptions.config,
        hre.config.paths.root,
        hre.globalOptions.verbosity,
      );

      return networkManager;
    });

    hre.network = {
      async create(networkConnectionParams) {
        return (await getNetworkManagerImpl()).create(networkConnectionParams);
      },

      async connect(networkConnectionParams) {
        return (await getNetworkManagerImpl()).connect(networkConnectionParams);
      },

      async getOrCreate(networkOrParams) {
        return (await getNetworkManagerImpl()).getOrCreate(networkOrParams);
      },

      async createServer(...params) {
        return (await getNetworkManagerImpl()).createServer(...params);
      },
    };

    // To avoid adding `wasConnectCalled` to the public interface of
    // `NetworkManager`, we add this pass through method that is only
    // called from the `main` function.
    Object.defineProperty(hre.network, "wasConnectCalled", {
      value: () =>
        networkManager !== undefined &&
        "wasConnectCalled" in networkManager &&
        typeof networkManager.wasConnectCalled === "function" &&
        networkManager.wasConnectCalled(),
      enumerable: false,
    });
  },
});
