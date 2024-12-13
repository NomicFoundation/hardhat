import type {
  ConfigurationResolver,
  ConfigurationVariable,
  EdrNetworkAccountsConfig,
  EdrNetworkAccountsUserConfig,
  EdrNetworkChainConfig,
  EdrNetworkChainsConfig,
  EdrNetworkChainsUserConfig,
  EdrNetworkConfig,
  EdrNetworkForkingConfig,
  EdrNetworkForkingUserConfig,
  EdrNetworkMiningConfig,
  EdrNetworkMiningUserConfig,
  EdrNetworkUserConfig,
  GasConfig,
  GasUserConfig,
  HardhatConfig,
  HardhatUserConfig,
  HttpNetworkAccountsConfig,
  HttpNetworkAccountsUserConfig,
  HttpNetworkConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkUserConfig,
  ResolvedConfigurationVariable,
} from "../../../../types/config.js";
import type { ConfigHooks } from "../../../../types/hooks.js";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  hexStringToBytes,
  normalizeHexString,
} from "@ignored/hardhat-vnext-utils/hex";

import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "../accounts/derive-private-keys.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  EDR_NETWORK_DEFAULT_COINBASE,
} from "../edr/edr-provider.js";
import { HardforkName } from "../edr/types/hardfork.js";
import { isHdAccountsConfig, validateUserConfig } from "../type-validation.js";

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
        chainId: networkConfig.chainId,
        chainType: networkConfig.chainType,
        from: networkConfig.from,
        gas: resolveGasConfig(networkConfig.gas),
        gasMultiplier: networkConfig.gasMultiplier ?? 1,
        gasPrice: resolveGasConfig(networkConfig.gasPrice),
        accounts: resolveHttpNetworkAccounts(
          networkConfig.accounts,
          resolveConfigurationVariable,
        ),
        url: networkConfig.url,
        timeout: networkConfig.timeout ?? 20_000,
        httpHeaders: networkConfig.httpHeaders ?? {},
      };

      resolvedNetworks[networkName] = resolvedNetworkConfig;
    }

    if (networkConfig.type === "edr") {
      const resolvedNetworkConfig: EdrNetworkConfig = {
        type: "edr",
        chainId: networkConfig.chainId ?? 31337,
        chainType: networkConfig.chainType,
        from: networkConfig.from,
        gas: resolveGasConfig(networkConfig.gas),
        gasMultiplier: networkConfig.gasMultiplier ?? 1,
        gasPrice: resolveGasConfig(networkConfig.gasPrice),
        forking: resolveForkingConfig(
          networkConfig.forking,
          resolvedConfig.paths.cache,
        ),
        hardfork: resolveHardfork(
          networkConfig.hardfork,
          networkConfig.enableTransientStorage,
        ),
        networkId: networkConfig.networkId ?? networkConfig.chainId ?? 31337,
        blockGasLimit: BigInt(networkConfig.blockGasLimit ?? 30_000_000n),
        minGasPrice: BigInt(networkConfig.minGasPrice ?? 0),
        mining: resolveMiningConfig(networkConfig.mining),
        chains: resolveChains(networkConfig.chains),
        accounts: resolveEdrNetworkAccounts(networkConfig.accounts),
        allowUnlimitedContractSize:
          networkConfig.allowUnlimitedContractSize ?? false,
        throwOnTransactionFailures:
          networkConfig.throwOnTransactionFailures ?? true,
        throwOnCallFailures: networkConfig.throwOnCallFailures ?? true,
        allowBlocksWithSameTimestamp:
          networkConfig.allowBlocksWithSameTimestamp ?? false,
        enableTransientStorage: networkConfig.enableTransientStorage ?? false,
        enableRip7212: networkConfig.enableRip7212 ?? false,
        initialDate: networkConfig.initialDate ?? new Date(),
        coinbase: resolveCoinbase(networkConfig.coinbase),
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

function resolveGasConfig(value: GasUserConfig = "auto"): GasConfig {
  return value === "auto" ? value : BigInt(value);
}

function resolveHttpNetworkAccounts(
  accounts: HttpNetworkAccountsUserConfig | undefined = "remote",
  resolveConfigurationVariable: ConfigurationResolver,
): HttpNetworkAccountsConfig {
  if (Array.isArray(accounts)) {
    return accounts.map((acc) => {
      if (typeof acc === "string") {
        acc = normalizeHexString(acc);
      }

      return resolveConfigurationVariable(acc);
    });
  }

  if (isHdAccountsConfig(accounts)) {
    return {
      ...DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS,
      ...accounts,
    };
  }

  return accounts;
}

function resolveEdrNetworkAccounts(
  accounts:
    | EdrNetworkAccountsUserConfig
    | undefined = DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
): EdrNetworkAccountsConfig {
  if (Array.isArray(accounts)) {
    return accounts.map(({ privateKey, balance }) => ({
      privateKey: normalizeHexString(privateKey),
      balance: BigInt(balance),
    }));
  }

  return {
    ...DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
    ...accounts,
    accountsBalance: BigInt(
      accounts.accountsBalance ??
        DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.accountsBalance,
    ),
  };
}

function resolveForkingConfig(
  forkingUserConfig: EdrNetworkForkingUserConfig | undefined,
  cacheDir: string,
): EdrNetworkForkingConfig | undefined {
  if (forkingUserConfig === undefined) {
    return undefined;
  }

  const httpHeaders =
    forkingUserConfig.httpHeaders !== undefined
      ? Object.entries(forkingUserConfig.httpHeaders).map(([name, value]) => ({
          name,
          value,
        }))
      : undefined;

  return {
    enabled: forkingUserConfig.enabled ?? true,
    url: forkingUserConfig.url,
    cacheDir: path.join(cacheDir, "edr-fork-cache"),
    blockNumber:
      forkingUserConfig.blockNumber !== undefined
        ? BigInt(forkingUserConfig.blockNumber)
        : undefined,
    httpHeaders,
  };
}

function resolveMiningConfig(
  miningUserConfig: EdrNetworkMiningUserConfig | undefined = {},
): EdrNetworkMiningConfig {
  const { auto, interval, mempool } = miningUserConfig;

  return {
    auto: auto ?? interval === undefined,
    interval: interval ?? 0,
    mempool: {
      order: mempool?.order ?? "priority",
    },
  };
}

function resolveCoinbase(
  coinbase: string | undefined = EDR_NETWORK_DEFAULT_COINBASE,
): Uint8Array {
  return hexStringToBytes(coinbase);
}

function resolveChains(
  chains: EdrNetworkChainsUserConfig | undefined,
): EdrNetworkChainsConfig {
  const resolvedChains: EdrNetworkChainsConfig = new Map([
    [
      // block numbers below were taken from https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/common/src/chains
      1, // mainnet
      {
        hardforkHistory: new Map([
          [HardforkName.FRONTIER, 0],
          [HardforkName.HOMESTEAD, 1_150_000],
          [HardforkName.DAO, 1_920_000],
          [HardforkName.TANGERINE_WHISTLE, 2_463_000],
          [HardforkName.SPURIOUS_DRAGON, 2_675_000],
          [HardforkName.BYZANTIUM, 4_370_000],
          [HardforkName.CONSTANTINOPLE, 7_280_000],
          [HardforkName.PETERSBURG, 7_280_000],
          [HardforkName.ISTANBUL, 9_069_000],
          [HardforkName.MUIR_GLACIER, 9_200_000],
          [HardforkName.BERLIN, 1_2244_000],
          [HardforkName.LONDON, 12_965_000],
          [HardforkName.ARROW_GLACIER, 13_773_000],
          [HardforkName.GRAY_GLACIER, 15_050_000],
          [HardforkName.MERGE, 15_537_394],
          [HardforkName.SHANGHAI, 17_034_870],
          [HardforkName.CANCUN, 19_426_589],
        ]),
      },
    ],
    [
      3, // ropsten
      {
        hardforkHistory: new Map([
          [HardforkName.BYZANTIUM, 1700000],
          [HardforkName.CONSTANTINOPLE, 4230000],
          [HardforkName.PETERSBURG, 4939394],
          [HardforkName.ISTANBUL, 6485846],
          [HardforkName.MUIR_GLACIER, 7117117],
          [HardforkName.BERLIN, 9812189],
          [HardforkName.LONDON, 10499401],
        ]),
      },
    ],
    [
      4, // rinkeby
      {
        hardforkHistory: new Map([
          [HardforkName.BYZANTIUM, 1035301],
          [HardforkName.CONSTANTINOPLE, 3660663],
          [HardforkName.PETERSBURG, 4321234],
          [HardforkName.ISTANBUL, 5435345],
          [HardforkName.BERLIN, 8290928],
          [HardforkName.LONDON, 8897988],
        ]),
      },
    ],
    [
      5, // goerli
      {
        hardforkHistory: new Map([
          [HardforkName.ISTANBUL, 1561651],
          [HardforkName.BERLIN, 4460644],
          [HardforkName.LONDON, 5062605],
        ]),
      },
    ],
    [
      42, // kovan
      {
        hardforkHistory: new Map([
          [HardforkName.BYZANTIUM, 5067000],
          [HardforkName.CONSTANTINOPLE, 9200000],
          [HardforkName.PETERSBURG, 10255201],
          [HardforkName.ISTANBUL, 14111141],
          [HardforkName.BERLIN, 24770900],
          [HardforkName.LONDON, 26741100],
        ]),
      },
    ],
    [
      11155111, // sepolia
      {
        hardforkHistory: new Map([
          [HardforkName.GRAY_GLACIER, 0],
          [HardforkName.MERGE, 1_450_409],
          [HardforkName.SHANGHAI, 2_990_908],
          [HardforkName.CANCUN, 5_187_023],
        ]),
      },
    ],
    // TODO: the rest of this config is a temporary workaround,
    // see https://github.com/NomicFoundation/edr/issues/522
    [
      10, // optimism mainnet
      {
        hardforkHistory: new Map([[HardforkName.SHANGHAI, 0]]),
      },
    ],
    [
      11155420, // optimism sepolia
      {
        hardforkHistory: new Map([[HardforkName.SHANGHAI, 0]]),
      },
    ],
    [
      42161, // arbitrum one
      {
        hardforkHistory: new Map([[HardforkName.SHANGHAI, 0]]),
      },
    ],
    [
      421614, // arbitrum sepolia
      {
        hardforkHistory: new Map([[HardforkName.SHANGHAI, 0]]),
      },
    ],
  ]);

  if (chains === undefined) {
    return resolvedChains;
  }

  chains.forEach((chainConfig, chainId) => {
    const resolvedChainConfig: EdrNetworkChainConfig = {
      hardforkHistory: new Map(),
    };
    if (chainConfig.hardforkHistory !== undefined) {
      chainConfig.hardforkHistory.forEach((block, name) => {
        resolvedChainConfig.hardforkHistory.set(name, block);
      });
    }
    resolvedChains.set(chainId, resolvedChainConfig);
  });

  return resolvedChains;
}

function resolveHardfork(
  hardfork: string | undefined,
  enableTransientStorage: boolean | undefined,
): string {
  if (hardfork !== undefined) {
    return hardfork;
  }

  if (enableTransientStorage === true) {
    return HardforkName.CANCUN;
  } else {
    return HardforkName.SHANGHAI;
  }
}
