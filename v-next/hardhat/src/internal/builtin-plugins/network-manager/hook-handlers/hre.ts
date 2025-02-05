import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { NetworkManager } from "../../../../types/network.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    let networkManager: NetworkManager | undefined;

    hre.network = {
      async connect(networkName, chainType, networkConfigOverride) {
        const { NetworkManagerImplementation } = await import(
          "../network-manager.js"
        );

        if (networkManager === undefined) {
          networkManager = new NetworkManagerImplementation(
            hre.globalOptions.network !== ""
              ? hre.globalOptions.network
              : hre.config.defaultNetwork,
            hre.config.defaultChainType,
            hre.config.networks,
            context.hooks,
            context.artifacts,
          );
        }

        return networkManager.connect(
          networkName,
          chainType,
          networkConfigOverride,
        );
      },
    };
  },
});
