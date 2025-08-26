import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { NetworkManager } from "../../../../types/network.js";

import { DEFAULT_NETWORK_NAME } from "../../../constants.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    let networkManager: NetworkManager | undefined;

    const userConfigNetworks = hre.userConfig.networks;

    hre.network = {
      async connect(networkConnectionParams) {
        const { NetworkManagerImplementation } = await import(
          "../network-manager.js"
        );

        const networkName =
          hre.globalOptions.network ??
          process.env.HARDHAT_NETWORK ??
          DEFAULT_NETWORK_NAME;

        if (networkManager === undefined) {
          networkManager = new NetworkManagerImplementation(
            networkName,
            hre.config.defaultChainType,
            hre.config.networks,
            context.hooks,
            context.artifacts,
            userConfigNetworks,
            hre.config.chainDescriptors,
          );
        }

        return networkManager.connect(networkConnectionParams);
      },
    };
  },
});
