import type {
  HardhatRuntimeEnvironmentHooks,
  HookContext,
} from "../../../../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../types/hre.js";
import type { NetworkManager } from "../../../../types/network.js";

import { DEFAULT_NETWORK_NAME } from "../../../constants.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    let networkManager: NetworkManager | undefined;

    hre.network = {
      async create(networkConnectionParams) {
        if (networkManager === undefined) {
          networkManager = await createNetworkManager(hre, context);
        }

        return await networkManager.create(networkConnectionParams);
      },

      async connect(networkConnectionParams) {
        if (networkManager === undefined) {
          networkManager = await createNetworkManager(hre, context);
        }

        return await networkManager.connect(networkConnectionParams);
      },

      async getOrCreate(networkOrParams) {
        if (networkManager === undefined) {
          networkManager = await createNetworkManager(hre, context);
        }

        return await networkManager.getOrCreate(networkOrParams);
      },

      async createServer(...params) {
        if (networkManager === undefined) {
          networkManager = await createNetworkManager(hre, context);
        }

        return await networkManager.createServer(...params);
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

async function createNetworkManager(
  hre: HardhatRuntimeEnvironment,
  context: HookContext,
): Promise<NetworkManager> {
  const { NetworkManagerImplementation } = await import(
    "../network-manager.js"
  );

  return new NetworkManagerImplementation(
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
}
