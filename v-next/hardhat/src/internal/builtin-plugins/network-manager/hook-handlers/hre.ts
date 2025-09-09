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
      async connect(networkConnectionParams) {
        if (networkManager === undefined) {
          networkManager = await createNetworkManager(hre, context);
        }

        return networkManager.connect(networkConnectionParams);
      },
      async createServer(...params) {
        if (networkManager === undefined) {
          networkManager = await createNetworkManager(hre, context);
        }

        return networkManager.createServer(...params);
      },
    };
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
  );
}
