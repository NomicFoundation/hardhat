import type {
  ConfigurationVariableResolver,
  EdrNetworkAccountsConfig,
  EdrNetworkAccountsUserConfig,
  ChainDescriptorConfig,
  ChainDescriptorsConfig,
  ChainDescriptorsUserConfig,
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
} from "../../../types/config.js";
import type { ChainType } from "../../../types/network.js";

import path from "node:path";

import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import {
  hexStringToBytes,
  normalizeHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { deepClone } from "@nomicfoundation/hardhat-utils/lang";

import { GENERIC_CHAIN_TYPE } from "../../constants.js";

import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "./accounts/constants.js";
import { DEFAULT_CHAIN_DESCRIPTORS } from "./chain-descriptors.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  EDR_NETWORK_DEFAULT_COINBASE,
} from "./edr/edr-provider.js";
import { getCurrentHardfork } from "./edr/types/hardfork.js";
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
    timeout: networkConfig.timeout ?? 300_000,
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
    coinbase: resolveCoinbase(networkConfig.coinbase),
    enableTransientStorage: networkConfig.enableTransientStorage ?? false,
    forking: resolveForkingConfig(
      networkConfig.forking,
      cachePath,
      resolveConfigurationVariable,
    ),
    hardfork: resolveHardfork(
      networkConfig.hardfork,
      networkConfig.chainType,
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

export async function resolveChainDescriptors(
  chainDescriptors: ChainDescriptorsUserConfig | undefined,
): Promise<ChainDescriptorsConfig> {
  const resolvedChainDescriptors: ChainDescriptorsConfig = await deepClone(
    DEFAULT_CHAIN_DESCRIPTORS,
  );

  if (chainDescriptors === undefined) {
    return resolvedChainDescriptors;
  }

  // Loop over the user-provided chain descriptors
  // and merge them with the default ones
  for (const [chainId, userDescriptor] of Object.entries(chainDescriptors)) {
    const existingDescriptor: ChainDescriptorConfig =
      resolvedChainDescriptors.get(toBigInt(chainId)) ?? {
        name: userDescriptor.name,
        chainType: GENERIC_CHAIN_TYPE,
        blockExplorers: {},
      };

    existingDescriptor.name = userDescriptor.name;

    if (userDescriptor.chainType !== undefined) {
      existingDescriptor.chainType = userDescriptor.chainType;
    }

    if (userDescriptor.hardforkHistory !== undefined) {
      existingDescriptor.hardforkHistory = new Map(
        Object.entries(userDescriptor.hardforkHistory),
      );
    }

    if (userDescriptor.blockExplorers?.etherscan !== undefined) {
      existingDescriptor.blockExplorers.etherscan = await deepClone(
        userDescriptor.blockExplorers.etherscan,
      );
    }

    if (userDescriptor.blockExplorers?.blockscout !== undefined) {
      existingDescriptor.blockExplorers.blockscout = await deepClone(
        userDescriptor.blockExplorers.blockscout,
      );
    }

    resolvedChainDescriptors.set(toBigInt(chainId), existingDescriptor);
  }

  return resolvedChainDescriptors;
}

export function resolveHardfork(
  hardfork: string | undefined,
  chainType: ChainType | undefined = GENERIC_CHAIN_TYPE,
  _enableTransientStorage: boolean | undefined,
): string {
  if (hardfork !== undefined) {
    return hardfork;
  }

  return getCurrentHardfork(chainType);
}

export function resolveInitialBaseFeePerGas(
  initialBaseFeePerGas: bigint | number | undefined,
): bigint | undefined {
  return initialBaseFeePerGas !== undefined
    ? BigInt(initialBaseFeePerGas)
    : undefined;
}
