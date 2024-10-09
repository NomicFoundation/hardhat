import type {
  ConfigurationVariable,
  GasConfig,
  GasUserConfig,
  HardhatConfig,
  HardhatUserConfig,
  HttpNetworkConfig,
  NetworkConfig,
  NetworkUserConfig,
  ResolvedConfigurationVariable,
} from "../../../../types/config.js";
import type { ConfigHooks } from "../../../../types/hooks.js";

import { validateUserConfig } from "../type-validation.js";

export default async (): Promise<Partial<ConfigHooks>> => ({
  extendUserConfig,
  validateUserConfig,
  resolveUserConfig,
});

export async function extendUserConfig(
  config: HardhatUserConfig,
  next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
): Promise<HardhatUserConfig> {
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
}

export async function resolveUserConfig(
  userConfig: HardhatUserConfig,
  resolveConfigurationVariable: (
    variableOrString: ConfigurationVariable | string,
  ) => ResolvedConfigurationVariable,
  next: (
    nextUserConfig: HardhatUserConfig,
    nextResolveConfigurationVariable: (
      variableOrString: ConfigurationVariable | string,
    ) => ResolvedConfigurationVariable,
  ) => Promise<HardhatConfig>,
): Promise<HardhatConfig> {
  const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

  const networks: Record<string, NetworkUserConfig> = userConfig.networks ?? {};

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
    defaultChainType: resolvedConfig.defaultChainType ?? "unknown",
    defaultNetwork: resolvedConfig.defaultNetwork ?? "localhost",
    networks: resolvedNetworks,
  };
}

function resolveGasConfig(value: GasUserConfig = "auto"): GasConfig {
  return value === "auto" ? value : BigInt(value);
}
