import type {
  GasConfig,
  GasUserConfig,
  HttpNetworkConfig,
  NetworkConfig,
  NetworkUserConfig,
} from "../../../../types/config.js";
import type { ConfigHooks } from "../../../../types/hooks.js";

import { validateUserConfig } from "../type-validation.js";

export default async (): Promise<Partial<ConfigHooks>> => ({
  extendUserConfig: async (config, next) => {
    const extendedConfig = await next(config);

    const networks: Record<string, NetworkUserConfig> =
      extendedConfig.networks ?? {};

    return {
      ...extendedConfig,
      networks: {
        ...networks,
        localhost: {
          url: "http://localhost:8545",
          ...networks.localhost,
          type: "http",
        },
      },
    };
  },
  validateUserConfig,
  resolveUserConfig: async (userConfig, resolveConfigurationVariable, next) => {
    const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

    const networks: Record<string, NetworkUserConfig> =
      userConfig.networks ?? {};

    const resolvedNetworks: Record<string, NetworkConfig> = {};

    for (const [networkName, networkConfig] of Object.entries(networks)) {
      if (networkConfig.type !== "http") {
        // eslint-disable-next-line no-restricted-syntax -- TODO
        throw new Error("Only HTTP network is supported for now");
      }

      const resolvedNetworkConfig: HttpNetworkConfig = {
        type: "http",
        chainId: networkConfig.chainId,
        chainType: networkConfig.chainType,
        from: networkConfig.from,
        gas: resolveGasConfig(networkConfig.gas),
        gasMultiplier: networkConfig.gasMultiplier ?? 1,
        gasPrice: resolveGasConfig(networkConfig.gasPrice),
        url: networkConfig.url,
        timeout: networkConfig.timeout ?? 20_000,
        httpHeaders: networkConfig.httpHeaders ?? {},
      };

      resolvedNetworks[networkName] = resolvedNetworkConfig;
    }

    return {
      ...resolvedConfig,
      defaultNetwork: resolvedConfig.defaultNetwork ?? "localhost",
      defaultChainType: resolvedConfig.defaultChainType ?? "unknown",
      networks: resolvedNetworks,
    };
  },
});

function resolveGasConfig(value: GasUserConfig = "auto"): GasConfig {
  return value === "auto" ? value : BigInt(value);
}
