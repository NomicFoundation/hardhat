import type {
  ConfigurationVariableResolver,
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
  HttpNetworkAccountsConfig,
  HttpNetworkAccountsUserConfig,
  HttpNetworkConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkUserConfig,
} from "../../../types/config.js";

import path from "node:path";

import {
  hexStringToBytes,
  normalizeHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "./accounts/constants.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  EDR_NETWORK_DEFAULT_COINBASE,
} from "./edr/edr-provider.js";
import { HardforkName, LATEST_HARDFORK } from "./edr/types/hardfork.js";
import { isHttpNetworkHdAccountsUserConfig } from "./type-validation.js";

export function resolveHttpNetwork(
  networkConfig: HttpNetworkUserConfig,
  resolveConfigurationVariable: ConfigurationVariableResolver,
): HttpNetworkConfig {
  return {
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
    url: resolveConfigurationVariable(networkConfig.url),
    timeout: networkConfig.timeout ?? 20_000,
    httpHeaders: networkConfig.httpHeaders ?? {},
  };
}

export function resolveEdrNetwork(
  networkConfig: EdrNetworkUserConfig,
  cachePath: string,
  resolveConfigurationVariable: ConfigurationVariableResolver,
): EdrNetworkConfig {
  return {
    type: "edr",
    accounts: resolveEdrNetworkAccounts(
      networkConfig.accounts,
      resolveConfigurationVariable,
    ),
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
      cachePath,
      resolveConfigurationVariable,
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
}

/**
 * Resolves a NetworkUserConfig into a Partial<NetworkConfig> object.
 * This function processes the network configuration override using the appropriate
 * resolver (either HTTP or EDR) and ensures only the values explicitly specified
 * in the override are included in the final result, preventing defaults from
 * overwriting the user's configuration.
 *
 * @param networkUserConfigOverride The user's network configuration override.
 * @param resolveConfigurationVariable A function to resolve configuration variables.
 * @returns A Partial<NetworkConfig> containing the resolved values from the override.
 */
export function resolveNetworkConfigOverride(
  networkUserConfigOverride: NetworkUserConfig,
  resolveConfigurationVariable: ConfigurationVariableResolver,
): Partial<NetworkConfig> {
  let resolvedConfigOverride: NetworkConfig;

  if (networkUserConfigOverride.type === "http") {
    resolvedConfigOverride = resolveHttpNetwork(
      networkUserConfigOverride,
      resolveConfigurationVariable,
    );
  } else {
    resolvedConfigOverride = resolveEdrNetwork(
      networkUserConfigOverride,
      "",
      resolveConfigurationVariable,
    );
  }

  /* Return only the resolved config of the values overridden by the user. This
  ensures that only the overridden values are merged into the config and
  indirectly removes cacheDir from the resolved forking config, as cacheDir
  is not part of the NetworkUserConfig. */
  return pickResolvedFromOverrides(
    resolvedConfigOverride,
    networkUserConfigOverride,
  );
}

function pickResolvedFromOverrides<
  TResolved extends object,
  TOverride extends object,
>(resolvedConfig: TResolved, overrides: TOverride): Partial<TResolved> {
  const result: Partial<TResolved> = {};

  for (const key of Object.keys(overrides)) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- As TResolved and TOverride are objects share the same keys, we can
    safely cast the key */
    const resolvedKey = key as keyof TResolved;
    const resolvedValue = resolvedConfig[resolvedKey];
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- As TResolved and TOverride are objects share the same keys, we can
    safely cast the key */
    const overrideValue = overrides[key as keyof TOverride];

    if (!(isObject(resolvedValue) && isObject(overrideValue))) {
      result[resolvedKey] = resolvedValue;
      continue;
    }

    /* Some properties in NetworkConfig, such as accounts, forking, and mining,
    are objects themselves. To handle these, we process them recursively. */
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- The return type adheres to TResolved[keyof TResolved], but TS can't
    infer it */
    result[resolvedKey] = pickResolvedFromOverrides(
      resolvedValue,
      overrideValue,
    ) as TResolved[keyof TResolved];
  }

  return result;
}

export function resolveGasConfig(value: GasUserConfig = "auto"): GasConfig {
  return value === "auto" ? value : BigInt(value);
}

export function resolveHttpNetworkAccounts(
  accounts: HttpNetworkAccountsUserConfig | undefined = "remote",
  resolveConfigurationVariable: ConfigurationVariableResolver,
): HttpNetworkAccountsConfig {
  if (Array.isArray(accounts)) {
    return accounts.map((acc) => {
      if (typeof acc === "string") {
        acc = normalizeHexString(acc);
      }

      return resolveConfigurationVariable(acc);
    });
  }

  if (isHttpNetworkHdAccountsUserConfig(accounts)) {
    const { passphrase: defaultPassphrase, ...defaultHdAccountRest } =
      DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS;
    const { mnemonic, passphrase, ...hdAccountRest } = accounts;

    return {
      ...defaultHdAccountRest,
      ...hdAccountRest,
      mnemonic: resolveConfigurationVariable(mnemonic),
      passphrase: resolveConfigurationVariable(passphrase ?? defaultPassphrase),
    };
  }

  return accounts;
}

export function resolveEdrNetworkAccounts(
  accounts:
    | EdrNetworkAccountsUserConfig
    | undefined = DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  resolveConfigurationVariable: ConfigurationVariableResolver,
): EdrNetworkAccountsConfig {
  if (Array.isArray(accounts)) {
    return accounts.map(({ privateKey, balance }) => {
      if (typeof privateKey === "string") {
        privateKey = normalizeHexString(privateKey);
      }

      return {
        privateKey: resolveConfigurationVariable(privateKey),
        balance: BigInt(balance),
      };
    });
  }

  const {
    mnemonic: defaultMnemonic,
    accountsBalance: defaultAccountsBalance,
    passphrase: defaultPassphrase,
    ...defaultHdAccountRest
  } = DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS;
  const { mnemonic, passphrase, accountsBalance, ...hdAccountRest } = accounts;
  return {
    ...defaultHdAccountRest,
    ...hdAccountRest,
    mnemonic: resolveConfigurationVariable(mnemonic ?? defaultMnemonic),
    accountsBalance: BigInt(accountsBalance ?? defaultAccountsBalance),
    passphrase: resolveConfigurationVariable(passphrase ?? defaultPassphrase),
  };
}

export function resolveForkingConfig(
  forkingUserConfig: EdrNetworkForkingUserConfig | undefined,
  cacheDir: string,
  resolveConfigurationVariable: ConfigurationVariableResolver,
): EdrNetworkForkingConfig | undefined {
  if (forkingUserConfig === undefined) {
    return undefined;
  }

  return {
    enabled: forkingUserConfig.enabled ?? true,
    url: resolveConfigurationVariable(forkingUserConfig.url),
    cacheDir: path.join(cacheDir, "edr-fork-cache"),
    blockNumber:
      forkingUserConfig.blockNumber !== undefined
        ? BigInt(forkingUserConfig.blockNumber)
        : undefined,
    httpHeaders: forkingUserConfig.httpHeaders,
  };
}

export function resolveMiningConfig(
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

export function resolveCoinbase(
  coinbase: string | undefined = EDR_NETWORK_DEFAULT_COINBASE,
): Uint8Array {
  return hexStringToBytes(coinbase);
}

export function resolveChains(
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

export function resolveHardfork(
  hardfork: string | undefined,
  _enableTransientStorage: boolean | undefined,
): string {
  if (hardfork !== undefined) {
    return hardfork;
  }

  return LATEST_HARDFORK;
}

export function resolveInitialBaseFeePerGas(
  initialBaseFeePerGas: bigint | number | undefined,
): bigint | undefined {
  return initialBaseFeePerGas !== undefined
    ? BigInt(initialBaseFeePerGas)
    : undefined;
}
