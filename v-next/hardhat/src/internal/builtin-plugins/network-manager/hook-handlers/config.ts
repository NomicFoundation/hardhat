import type {
  ConfigurationVariableResolver,
  EdrNetworkUserConfig,
  HardhatConfig,
  HardhatUserConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkUserConfig,
} from "../../../../types/config.js";
import type { ConfigHooks } from "../../../../types/hooks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import {
  DEFAULT_NETWORK_NAME,
  GENERIC_CHAIN_TYPE,
} from "../../../constants.js";
import {
  resolveChainDescriptors,
  resolveEdrNetwork,
  resolveHttpNetwork,
} from "../config-resolution.js";
import { validateNetworkUserConfig } from "../type-validation.js";

export default async (): Promise<Partial<ConfigHooks>> => ({
  extendUserConfig,
  validateUserConfig: validateNetworkUserConfig,
  resolveUserConfig,
});

export async function extendUserConfig(
  config: HardhatUserConfig,
  next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
): Promise<HardhatUserConfig> {
  const extendedConfig = await next(config);

  const networks: Record<string, NetworkUserConfig> =
    extendedConfig.networks ?? {};

  const localhostConfig: Omit<HttpNetworkUserConfig, "url"> = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- This is always http
    ...(networks.localhost as HttpNetworkUserConfig),
  };

  const defaultConfig: Partial<EdrNetworkUserConfig> = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- This is always edr
    ...(networks.default as EdrNetworkUserConfig),
  };

  return {
    ...extendedConfig,
    networks: {
      ...networks,
      localhost: {
        url: "http://localhost:8545",
        ...localhostConfig,
        type: "http",
      },
      [DEFAULT_NETWORK_NAME]: {
        chainId: 31337,
        gas: "auto",
        gasMultiplier: 1,
        gasPrice: "auto",
        ...defaultConfig,
        type: "edr-simulated",
      },
    },
  };
}

export async function resolveUserConfig(
  userConfig: HardhatUserConfig,
  resolveConfigurationVariable: ConfigurationVariableResolver,
  next: (
    nextUserConfig: HardhatUserConfig,
    nextResolveConfigurationVariable: ConfigurationVariableResolver,
  ) => Promise<HardhatConfig>,
): Promise<HardhatConfig> {
  const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

  const networks: Record<string, NetworkUserConfig> = userConfig.networks ?? {};

  const resolvedNetworks: Record<string, NetworkConfig> = {};

  for (const [networkName, networkConfig] of Object.entries(networks)) {
    if (
      networkConfig.type !== "http" &&
      networkConfig.type !== "edr-simulated"
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_NETWORK_TYPE,
        {
          networkName,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we want to show the type
          networkType: (networkConfig as any).type,
        },
      );
    }

    resolvedNetworks[networkName] =
      networkConfig.type === "http"
        ? resolveHttpNetwork(networkConfig, resolveConfigurationVariable)
        : resolveEdrNetwork(
            networkConfig,
            resolvedConfig.paths.cache,
            resolveConfigurationVariable,
          );
  }

  return {
    ...resolvedConfig,
    chainDescriptors: await resolveChainDescriptors(
      userConfig.chainDescriptors,
    ),
    defaultChainType: resolvedConfig.defaultChainType ?? GENERIC_CHAIN_TYPE,
    networks: resolvedNetworks,
  };
}
