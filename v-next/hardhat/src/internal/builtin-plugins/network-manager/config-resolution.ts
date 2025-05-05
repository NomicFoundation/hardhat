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
} from "../../../types/config.js";
import type { ChainType } from "../../../types/network.js";

import path from "node:path";

import {
  hexStringToBytes,
  normalizeHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import {
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
  GENERIC_CHAIN_TYPE,
} from "../../constants.js";

import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "./accounts/constants.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  EDR_NETWORK_DEFAULT_COINBASE,
} from "./edr/edr-provider.js";
import {
  getCurrentHardfork,
  L1HardforkName,
  OpHardforkName,
} from "./edr/types/hardfork.js";
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

export function resolveChains(
  chains: EdrNetworkChainsUserConfig | undefined,
): EdrNetworkChainsConfig {
  /**
   * Block numbers / timestamps were taken from:
   *
   * L1 / Generic:
   * https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/common/src/chains.ts
   * Op:
   * https://github.com/ethereum-optimism/superchain-registry/tree/main/superchain/configs/mainnet
   *
   * To find hardfork activation blocks by timestamp, use:
   * https://api-TESTNET.etherscan.io/api?module=block&action=getblocknobytime&timestamp=TIMESTAMP&closest=before&apikey=APIKEY
   */
  const resolvedChains: EdrNetworkChainsConfig = new Map([
    [
      1, // mainnet
      {
        chainType: L1_CHAIN_TYPE,
        hardforkHistory: new Map([
          [L1HardforkName.FRONTIER, 0],
          [L1HardforkName.HOMESTEAD, 1_150_000],
          [L1HardforkName.DAO, 1_920_000],
          [L1HardforkName.TANGERINE_WHISTLE, 2_463_000],
          [L1HardforkName.SPURIOUS_DRAGON, 2_675_000],
          [L1HardforkName.BYZANTIUM, 4_370_000],
          [L1HardforkName.CONSTANTINOPLE, 7_280_000],
          [L1HardforkName.PETERSBURG, 7_280_000],
          [L1HardforkName.ISTANBUL, 9_069_000],
          [L1HardforkName.MUIR_GLACIER, 9_200_000],
          [L1HardforkName.BERLIN, 1_2244_000],
          [L1HardforkName.LONDON, 12_965_000],
          [L1HardforkName.ARROW_GLACIER, 13_773_000],
          [L1HardforkName.GRAY_GLACIER, 15_050_000],
          [L1HardforkName.MERGE, 15_537_394],
          [L1HardforkName.SHANGHAI, 17_034_870],
          [L1HardforkName.CANCUN, 19_426_589],
        ]),
      },
    ],
    [
      5, // goerli
      {
        chainType: L1_CHAIN_TYPE,
        hardforkHistory: new Map([
          [L1HardforkName.ISTANBUL, 1_561_651],
          [L1HardforkName.BERLIN, 4_460_644],
          [L1HardforkName.LONDON, 5_062_605],
        ]),
      },
    ],
    [
      17000, // holesky
      {
        chainType: L1_CHAIN_TYPE,
        hardforkHistory: new Map([
          [L1HardforkName.MERGE, 0],
          [L1HardforkName.SHANGHAI, 6_698],
          [L1HardforkName.CANCUN, 894_732],
        ]),
      },
    ],
    [
      560048, // hoodi
      {
        chainType: L1_CHAIN_TYPE,
        hardforkHistory: new Map([
          [L1HardforkName.MERGE, 0],
          [L1HardforkName.SHANGHAI, 0],
          [L1HardforkName.CANCUN, 0],
        ]),
      },
    ],
    [
      11155111, // sepolia
      {
        chainType: L1_CHAIN_TYPE,
        hardforkHistory: new Map([
          [L1HardforkName.GRAY_GLACIER, 0],
          [L1HardforkName.MERGE, 1_450_409],
          [L1HardforkName.SHANGHAI, 2_990_908],
          [L1HardforkName.CANCUN, 5_187_023],
        ]),
      },
    ],
    [
      10, // op mainnet
      {
        chainType: OPTIMISM_CHAIN_TYPE,
        hardforkHistory: new Map([
          [OpHardforkName.BEDROCK, 105_235_063],
          [OpHardforkName.REGOLITH, 105_235_063],
          [OpHardforkName.CANYON, 114_696_812],
          [OpHardforkName.ECOTONE, 117_387_812],
          [OpHardforkName.FJORD, 122_514_212],
          [OpHardforkName.GRANITE, 125_235_812],
          [OpHardforkName.HOLOCENE, 130_423_412],
        ]),
      },
    ],
    [
      11155420, // op sepolia
      {
        chainType: OPTIMISM_CHAIN_TYPE,
        hardforkHistory: new Map([
          [OpHardforkName.BEDROCK, 0],
          [OpHardforkName.REGOLITH, 0],
          [OpHardforkName.CANYON, 4_089_330],
          [OpHardforkName.ECOTONE, 8_366_130],
          [OpHardforkName.FJORD, 12_597_930],
          [OpHardforkName.GRANITE, 15_837_930],
          [OpHardforkName.HOLOCENE, 20_415_330],
        ]),
      },
    ],
  ]);

  if (chains === undefined) {
    return resolvedChains;
  }

  chains.forEach((chainConfig, chainId) => {
    const resolvedChainConfig: EdrNetworkChainConfig = {
      chainType: chainConfig.chainType ?? GENERIC_CHAIN_TYPE,
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
