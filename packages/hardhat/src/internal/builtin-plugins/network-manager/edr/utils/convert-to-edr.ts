import type {
  EdrNetworkAccountConfig,
  EdrNetworkAccountsConfig,
  ChainDescriptorsConfig,
  EdrNetworkForkingConfig,
  EdrNetworkMempoolConfig,
  EdrNetworkMiningConfig,
} from "../../../../../types/config.js";
import type { ChainType } from "../../../../../types/network.js";
import type { GasMeasurement } from "../../../gas-analytics/types.js";
import type {
  IntervalRange,
  ChainOverride,
  ForkConfig,
  GasReport,
} from "@nomicfoundation/edr";

import {
  GasReportExecutionStatus,
  L1Hardfork,
  MineOrdering,
  OpHardfork,
} from "@nomicfoundation/edr";
import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../constants.js";
import { FixedValueConfigurationVariable } from "../../../../core/configuration-variables.js";
import { derivePrivateKeys } from "../../accounts/derive-private-keys.js";
import {
  DEFAULT_EDR_NETWORK_BALANCE,
  EDR_NETWORK_DEFAULT_PRIVATE_KEYS,
  isDefaultEdrNetworkHDAccountsConfig,
} from "../edr-constants.js";
import {
  hardforkGte,
  L1HardforkName,
  OpHardforkName,
} from "../types/hardfork.js";

import { getHardforkName } from "./hardfork.js";

export function edrL1HardforkToHardhatL1HardforkName(
  hardfork: L1Hardfork,
): L1HardforkName {
  switch (hardfork) {
    case L1Hardfork.Byzantium:
      return L1HardforkName.BYZANTIUM;
    case L1Hardfork.Constantinople:
      return L1HardforkName.CONSTANTINOPLE;
    case L1Hardfork.Petersburg:
      return L1HardforkName.PETERSBURG;
    case L1Hardfork.Istanbul:
      return L1HardforkName.ISTANBUL;
    case L1Hardfork.MuirGlacier:
      return L1HardforkName.MUIR_GLACIER;
    case L1Hardfork.Berlin:
      return L1HardforkName.BERLIN;
    case L1Hardfork.London:
      return L1HardforkName.LONDON;
    case L1Hardfork.ArrowGlacier:
      return L1HardforkName.ARROW_GLACIER;
    case L1Hardfork.GrayGlacier:
      return L1HardforkName.GRAY_GLACIER;
    case L1Hardfork.Merge:
      return L1HardforkName.MERGE;
    case L1Hardfork.Shanghai:
      return L1HardforkName.SHANGHAI;
    case L1Hardfork.Cancun:
      return L1HardforkName.CANCUN;
    case L1Hardfork.Prague:
      return L1HardforkName.PRAGUE;
    case L1Hardfork.Osaka:
      return L1HardforkName.OSAKA;
    case L1Hardfork.Amsterdam:
      return L1HardforkName.AMSTERDAM;
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- trust but verify
    default:
      const _exhaustiveCheck: never = hardfork;
      assertHardhatInvariant(
        false,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we want to print the fork
        `Unknown L1 hardfork '${hardfork as L1Hardfork}', this shouldn't happen`,
      );
  }
}

export function edrOpHardforkToHardhatOpHardforkName(
  hardfork: OpHardfork,
): OpHardforkName {
  switch (hardfork) {
    case OpHardfork.Bedrock:
      return OpHardforkName.BEDROCK;
    case OpHardfork.Regolith:
      return OpHardforkName.REGOLITH;
    case OpHardfork.Canyon:
      return OpHardforkName.CANYON;
    case OpHardfork.Ecotone:
      return OpHardforkName.ECOTONE;
    case OpHardfork.Fjord:
      return OpHardforkName.FJORD;
    case OpHardfork.Granite:
      return OpHardforkName.GRANITE;
    case OpHardfork.Holocene:
      return OpHardforkName.HOLOCENE;
    case OpHardfork.Isthmus:
      return OpHardforkName.ISTHMUS;
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- trust but verify
    default:
      const _exhaustiveCheck: never = hardfork;
      assertHardhatInvariant(
        false,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we want to print the fork
        `Unknown OP hardfork '${hardfork as OpHardfork}', this shouldn't happen`,
      );
  }
}

export function hardhatMiningIntervalToEdrMiningInterval(
  config: EdrNetworkMiningConfig["interval"],
): bigint | IntervalRange | undefined {
  if (typeof config === "number") {
    // Is interval mining disabled?
    if (config === 0) {
      return undefined;
    } else {
      return BigInt(config);
    }
  } else {
    return {
      min: BigInt(config[0]),
      max: BigInt(config[1]),
    };
  }
}

export function hardhatMempoolOrderToEdrMineOrdering(
  mempoolOrder: EdrNetworkMempoolConfig["order"],
): MineOrdering {
  switch (mempoolOrder) {
    case "fifo":
      return MineOrdering.Fifo;
    case "priority":
      return MineOrdering.Priority;
  }
}

export async function hardhatAccountsToEdrOwnedAccounts(
  accounts: EdrNetworkAccountsConfig,
): Promise<Array<{ secretKey: string; balance: bigint }>> {
  const normalizedAccounts = await normalizeEdrNetworkAccountsConfig(accounts);

  const accountPromises = normalizedAccounts.map(async (account) => ({
    secretKey: await account.privateKey.getHexString(),
    balance: account.balance,
  }));

  return await Promise.all(accountPromises);
}

export async function normalizeEdrNetworkAccountsConfig(
  accounts: EdrNetworkAccountsConfig,
): Promise<EdrNetworkAccountConfig[]> {
  if (Array.isArray(accounts)) {
    return accounts;
  }

  const isDefaultConfig = await isDefaultEdrNetworkHDAccountsConfig(accounts);
  const derivedPrivateKeys = isDefaultConfig
    ? EDR_NETWORK_DEFAULT_PRIVATE_KEYS
    : await derivePrivateKeys(
        await accounts.mnemonic.get(),
        accounts.path,
        accounts.initialIndex,
        accounts.count,
        await accounts.passphrase.get(),
      );

  return derivedPrivateKeys.map((privateKey) => ({
    privateKey: new FixedValueConfigurationVariable(privateKey),
    balance: accounts.accountsBalance ?? DEFAULT_EDR_NETWORK_BALANCE,
  }));
}

export function hardhatChainDescriptorsToEdrChainOverrides(
  chainDescriptors: ChainDescriptorsConfig,
  chainType: ChainType,
): ChainOverride[] {
  return (
    Array.from(chainDescriptors)
      // Skip chain descriptors that don't match the expected chain type
      .filter(([_, descriptor]) => {
        if (chainType === GENERIC_CHAIN_TYPE) {
          // When "generic" is requested, include both "generic" and "l1" chains
          return (
            descriptor.chainType === GENERIC_CHAIN_TYPE ||
            descriptor.chainType === L1_CHAIN_TYPE
          );
        }

        return descriptor.chainType === chainType;
      })
      .map(([chainId, descriptor]) => {
        const chainOverride: ChainOverride = {
          chainId,
          name: descriptor.name,
        };

        if (descriptor.hardforkHistory !== undefined) {
          chainOverride.hardforkActivationOverrides = Array.from(
            descriptor.hardforkHistory,
          ).map(([hardfork, { blockNumber, timestamp }]) => ({
            condition:
              blockNumber !== undefined
                ? { blockNumber: BigInt(blockNumber) }
                : { timestamp: BigInt(timestamp) },
            hardfork: getHardforkName(hardfork, descriptor.chainType),
          }));
        }

        return chainOverride;
      })
  );
}

export async function hardhatForkingConfigToEdrForkConfig(
  forkingConfig: EdrNetworkForkingConfig | undefined,
  chainDescriptors: ChainDescriptorsConfig,
  chainType: ChainType,
): Promise<ForkConfig | undefined> {
  let fork: ForkConfig | undefined;
  if (forkingConfig !== undefined && forkingConfig.enabled === true) {
    const httpHeaders =
      forkingConfig.httpHeaders !== undefined
        ? Object.entries(forkingConfig.httpHeaders).map(([name, value]) => ({
            name,
            value,
          }))
        : undefined;

    fork = {
      blockNumber: forkingConfig.blockNumber,
      cacheDir: forkingConfig.cacheDir,
      chainOverrides: hardhatChainDescriptorsToEdrChainOverrides(
        chainDescriptors,
        chainType,
      ),
      httpHeaders,
      url: await forkingConfig.url.getUrl(),
    };
  }

  return fork;
}

/**
 * Resolves the default transaction gas limit used by RPC call and
 * transaction requests that omit a `gas` field.
 *
 * When `transactionGasCap` is a bigint, that value wins. When it is
 * `false`, the per-transaction cap is disabled and the block gas limit is
 * used. When it is undefined, the hardfork-specific default applies:
 * from L1's Osaka hardfork onwards, the EIP-7825 transaction gas cap of
 * 16,777,216; otherwise the block gas limit.
 */
export function resolveDefaultTransactionGasLimit(params: {
  chainType: ChainType;
  hardfork: string;
  blockGasLimit: bigint;
  transactionGasCap: bigint | false | undefined;
}): bigint {
  const { chainType, hardfork, blockGasLimit, transactionGasCap } = params;

  if (typeof transactionGasCap === "bigint") {
    return transactionGasCap;
  }

  if (transactionGasCap === false) {
    return blockGasLimit;
  }

  // TODO: OP UPGRADE 19 - update OP to also set a default transaction gas once enabled
  if (chainType === OPTIMISM_CHAIN_TYPE) {
    return blockGasLimit;
  }

  if (hardforkGte(hardfork, L1HardforkName.OSAKA, chainType)) {
    return 16_777_216n; // EIP-7825 transaction gas cap
  }

  return blockGasLimit;
}

/**
 * Converts EDR's nested GasReport structure into a flat array of gas entries.
 * Filters out reverted transactions.
 */
export function edrGasReportToHardhatGasMeasurements(
  gasReport: GasReport,
  excludedContractFqns: string[] = [],
): GasMeasurement[] {
  const gasMeasurements: GasMeasurement[] = [];

  for (const [contractFqn, data] of Object.entries(gasReport.contracts)) {
    if (excludedContractFqns.includes(contractFqn)) {
      continue;
    }

    // Process deployments
    for (const deployment of data.deployments) {
      if (deployment.status === GasReportExecutionStatus.Success) {
        gasMeasurements.push({
          contractFqn,
          type: "deployment",
          gas: Number(deployment.gas),
          runtimeSize: Number(deployment.runtimeSize),
        });
      }
    }

    // Process function calls
    for (const [functionSig, calls] of Object.entries(data.functions)) {
      for (const call of calls) {
        if (call.status === GasReportExecutionStatus.Success) {
          gasMeasurements.push({
            contractFqn,
            type: "function",
            functionSig,
            gas: Number(call.gas),
            proxyChain: call.proxyChain,
          });
        }
      }
    }
  }

  return gasMeasurements;
}
