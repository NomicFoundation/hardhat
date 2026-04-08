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
import type { ChainType } from "../../../../types/network.js";

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

  const localhostConfig: NetworkUserConfig | undefined = networks.localhost;
  const defaultConfig: NetworkUserConfig | undefined = networks.default;
  const nodeConfig: NetworkUserConfig | undefined = networks.node;

  let extendedLocalhostConfig: NetworkUserConfig;
  if (
    localhostConfig === undefined ||
    localhostConfig.type === undefined ||
    localhostConfig.type === "http"
  ) {
    extendedLocalhostConfig = {
      url: "http://localhost:8545",
      type: "http",
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- We cast it here because otherwise TS complains that some fields are
        always overwritten, which is not true for js incomplete configs. */
      ...(localhostConfig as Partial<HttpNetworkUserConfig>),
    };
  } else {
    extendedLocalhostConfig = localhostConfig;
  }

  const defaultEdrNetworkConfigValues = {
    chainId: 31337,
    gas: "auto",
    gasMultiplier: 1,
    gasPrice: "auto",
    type: "edr-simulated",
  } as const;

  let extendedDefaultConfig: NetworkUserConfig;
  if (
    defaultConfig === undefined ||
    defaultConfig.type === undefined ||
    defaultConfig.type === "edr-simulated"
  ) {
    extendedDefaultConfig = {
      ...defaultEdrNetworkConfigValues,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- We cast it here because otherwise TS complains that some fields are
        always overwritten, which is not true for js incomplete configs. */
      ...(defaultConfig as Partial<EdrNetworkUserConfig>),
    };
  } else {
    extendedDefaultConfig = defaultConfig;
  }

  let extendedNodeConfig: NetworkUserConfig;
  if (
    nodeConfig === undefined ||
    nodeConfig.type === undefined ||
    nodeConfig.type === "edr-simulated"
  ) {
    extendedNodeConfig = {
      ...defaultEdrNetworkConfigValues,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- We cast it here because otherwise TS complains that url and http will
        be always overwritten, which is not true for js incomplete configs. */
      ...(nodeConfig as Partial<EdrNetworkUserConfig>),
    };
  } else {
    extendedNodeConfig = nodeConfig;
  }

  return {
    ...extendedConfig,
    networks: {
      ...networks,
      localhost: extendedLocalhostConfig,
      [DEFAULT_NETWORK_NAME]: extendedDefaultConfig,
      node: extendedNodeConfig,
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

  const resolvedDefaultChainType: ChainType =
    userConfig.defaultChainType ?? GENERIC_CHAIN_TYPE;

  const networks: Record<string, NetworkUserConfig> = userConfig.networks ?? {};

  const resolvedNetworks: Record<string, NetworkConfig> = {};

  for (const [networkName, networkConfig] of Object.entries(networks)) {
    const networkType = networkConfig.type;
    if (networkType !== "http" && networkType !== "edr-simulated") {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_NETWORK_TYPE,
        {
          networkName,
          networkType,
        },
      );
    }

    resolvedNetworks[networkName] =
      networkConfig.type === "http"
        ? resolveHttpNetwork(networkConfig, resolveConfigurationVariable)
        : resolveEdrNetwork(
            networkConfig,
            resolvedDefaultChainType,
            resolvedConfig.paths.cache,
            resolveConfigurationVariable,
          );
  }

  return {
    ...resolvedConfig,
    chainDescriptors: await resolveChainDescriptors(
      userConfig.chainDescriptors,
    ),
    defaultChainType: resolvedDefaultChainType,
    networks: resolvedNetworks,
  };
}
