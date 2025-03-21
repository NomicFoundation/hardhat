import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { NetworkManager } from "../../../../types/network.js";
import type { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    let networkManager: NetworkManager | undefined;

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- although `userConfig` is present on the hre, it isn’t typed in the official definition
    const userConfigNetworks = (hre as HardhatRuntimeEnvironmentImplementation)
      .userConfig.networks;

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
            userConfigNetworks,
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
