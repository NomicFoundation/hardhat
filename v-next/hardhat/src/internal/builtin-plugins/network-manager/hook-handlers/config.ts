import type {
  ConfigurationVariable,
  EdrNetworkConfig,
  EdrNetworkUserConfig,
  HardhatConfig,
  HardhatUserConfig,
  HttpNetworkConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkUserConfig,
  ResolvedConfigurationVariable,
} from "../../../../types/config.js";
import type { ConfigHooks } from "../../../../types/hooks.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import {
  resolveChains,
  resolveCoinbase,
  resolveEdrNetworkAccounts,
  resolveForkingConfig,
  resolveGasConfig,
  resolveHardfork,
  resolveHttpNetworkAccounts,
  resolveInitialBaseFeePerGas,
  resolveMiningConfig,
} from "../config-resolution.js";
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

  const localhostConfig: Omit<HttpNetworkUserConfig, "url"> = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- This is always http
    ...(networks.localhost as HttpNetworkUserConfig),
  };

  const hardhatConfig: Partial<EdrNetworkUserConfig> = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- This is always edr
    ...(networks.hardhat as EdrNetworkUserConfig),
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
      hardhat: {
        chainId: 31337,
        gas: "auto",
        gasMultiplier: 1,
        gasPrice: "auto",
        ...hardhatConfig,
        type: "edr",
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
    if (networkConfig.type !== "http" && networkConfig.type !== "edr") {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.INVALID_NETWORK_TYPE, {
        networkName,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we want to show the type
        networkType: (networkConfig as any).type,
      });
    }

    if (networkConfig.type === "http") {
      const resolvedNetworkConfig: HttpNetworkConfig = {
        type: "http",
        accounts: resolveHttpNetworkAccounts(
          networkConfig.accounts,
          resolveConfigurationVariable,
        ),
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

    if (networkConfig.type === "edr") {
      const resolvedNetworkConfig: EdrNetworkConfig = {
        type: "edr",
        accounts: resolveEdrNetworkAccounts(networkConfig.accounts),
        chainId: networkConfig.chainId ?? 31337,
        chainType: networkConfig.chainType,
        from: networkConfig.from,
        gas: resolveGasConfig(networkConfig.gas),
        gasMultiplier: networkConfig.gasMultiplier ?? 1,
        gasPrice: resolveGasConfig(networkConfig.gasPrice),

        allowBlocksWithSameTimestamp:
          networkConfig.allowBlocksWithSameTimestamp ?? false,
        allowUnlimitedContractSize:
          networkConfig.allowUnlimitedContractSize ?? false,
        blockGasLimit: BigInt(networkConfig.blockGasLimit ?? 30_000_000n),
        chains: resolveChains(networkConfig.chains),
        coinbase: resolveCoinbase(networkConfig.coinbase),
        enableRip7212: networkConfig.enableRip7212 ?? false,
        enableTransientStorage: networkConfig.enableTransientStorage ?? false,
        forking: resolveForkingConfig(
          networkConfig.forking,
          resolvedConfig.paths.cache,
        ),
        hardfork: resolveHardfork(
          networkConfig.hardfork,
          networkConfig.enableTransientStorage,
        ),
        initialBaseFeePerGas: resolveInitialBaseFeePerGas(
          networkConfig.initialBaseFeePerGas,
        ),
        initialDate: networkConfig.initialDate ?? new Date(),
        loggingEnabled: networkConfig.loggingEnabled ?? false,
        minGasPrice: BigInt(networkConfig.minGasPrice ?? 0),
        mining: resolveMiningConfig(networkConfig.mining),
        networkId: networkConfig.networkId ?? networkConfig.chainId ?? 31337,
        throwOnCallFailures: networkConfig.throwOnCallFailures ?? true,
        throwOnTransactionFailures:
          networkConfig.throwOnTransactionFailures ?? true,
      };

      resolvedNetworks[networkName] = resolvedNetworkConfig;
    }
  }

  return {
    ...resolvedConfig,
    defaultChainType: resolvedConfig.defaultChainType ?? "generic",
    defaultNetwork: resolvedConfig.defaultNetwork ?? "hardhat",
    networks: resolvedNetworks,
  };
}
