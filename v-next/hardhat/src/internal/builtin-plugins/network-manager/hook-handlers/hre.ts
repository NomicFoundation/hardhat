import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { NetworkManager } from "../../../../types/network.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    let networkManager: NetworkManager | undefined;

    hre.network = {
      async connect(networkName, chainType, networkConfigOverride) {
        if (networkManager === undefined) {
          const { NetworkManagerImplementation } = await import(
            "../network-manager.js"
          );

          networkManager = new NetworkManagerImplementation(
            hre.globalOptions.network !== ""
              ? hre.globalOptions.network
              : hre.config.defaultNetwork,
            hre.config.defaultChainType,
            hre.config.networks,
            context.hooks,
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
