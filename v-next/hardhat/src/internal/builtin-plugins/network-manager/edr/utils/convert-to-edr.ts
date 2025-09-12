/* eslint-disable no-restricted-syntax -- hack */
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
import type { RpcDebugTraceOutput, RpcStructLog } from "../types/output.js";
import type {
  IntervalRange,
  DebugTraceResult,
  ChainOverride,
  ForkConfig,
  GasReport,
} from "@nomicfoundation/edr";

import {
  MineOrdering,
  FRONTIER,
  HOMESTEAD,
  DAO_FORK,
  TANGERINE,
  SPURIOUS_DRAGON,
  BYZANTIUM,
  CONSTANTINOPLE,
  PETERSBURG,
  ISTANBUL,
  MUIR_GLACIER,
  BERLIN,
  LONDON,
  ARROW_GLACIER,
  GRAY_GLACIER,
  MERGE,
  SHANGHAI,
  CANCUN,
  PRAGUE,
  BEDROCK,
  REGOLITH,
  CANYON,
  ECOTONE,
  FJORD,
  GRANITE,
  HOLOCENE,
  GasReportExecutionStatus,
} from "@nomicfoundation/edr";
import { getUnprefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

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
} from "../edr-provider.js";
import { L1HardforkName, OpHardforkName } from "../types/hardfork.js";

import { getL1HardforkName, getOpHardforkName } from "./hardfork.js";

export function hardhatHardforkToEdrSpecId(
  hardfork: string,
  chainType: ChainType,
): string {
  return chainType === OPTIMISM_CHAIN_TYPE
    ? hardhatOpHardforkToEdrSpecId(hardfork)
    : hardhatL1HardforkToEdrSpecId(hardfork);
}

function hardhatOpHardforkToEdrSpecId(hardfork: string): string {
  const hardforkName = getOpHardforkName(hardfork);

  switch (hardforkName) {
    case OpHardforkName.BEDROCK:
      return BEDROCK;
    case OpHardforkName.REGOLITH:
      return REGOLITH;
    case OpHardforkName.CANYON:
      return CANYON;
    case OpHardforkName.ECOTONE:
      return ECOTONE;
    case OpHardforkName.FJORD:
      return FJORD;
    case OpHardforkName.GRANITE:
      return GRANITE;
    case OpHardforkName.HOLOCENE:
      return HOLOCENE;
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- trust but verify
    default:
      const _exhaustiveCheck: never = hardforkName;
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we want to print the fork
        `Unknown hardfork name '${hardforkName as string}', this shouldn't happen`,
      );
  }
}

function hardhatL1HardforkToEdrSpecId(hardfork: string): string {
  const hardforkName = getL1HardforkName(hardfork);

  switch (hardforkName) {
    case L1HardforkName.FRONTIER:
      return FRONTIER;
    case L1HardforkName.HOMESTEAD:
      return HOMESTEAD;
    case L1HardforkName.DAO:
      return DAO_FORK;
    case L1HardforkName.TANGERINE_WHISTLE:
      return TANGERINE;
    case L1HardforkName.SPURIOUS_DRAGON:
      return SPURIOUS_DRAGON;
    case L1HardforkName.BYZANTIUM:
      return BYZANTIUM;
    case L1HardforkName.CONSTANTINOPLE:
      return CONSTANTINOPLE;
    case L1HardforkName.PETERSBURG:
      return PETERSBURG;
    case L1HardforkName.ISTANBUL:
      return ISTANBUL;
    case L1HardforkName.MUIR_GLACIER:
      return MUIR_GLACIER;
    case L1HardforkName.BERLIN:
      return BERLIN;
    case L1HardforkName.LONDON:
      return LONDON;
    case L1HardforkName.ARROW_GLACIER:
      return ARROW_GLACIER;
    case L1HardforkName.GRAY_GLACIER:
      return GRAY_GLACIER;
    case L1HardforkName.MERGE:
      return MERGE;
    case L1HardforkName.SHANGHAI:
      return SHANGHAI;
    case L1HardforkName.CANCUN:
      return CANCUN;
    case L1HardforkName.PRAGUE:
      return PRAGUE;

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- we want to print the fork
    default:
      const _exhaustiveCheck: never = hardforkName;
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- an enum can be safely cast to a string
        `Unknown hardfork name '${hardfork as string}', this shouldn't happen`,
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

// TODO: EDR should handle this conversion. This is a temporary solution.
export function edrRpcDebugTraceToHardhat(
  debugTraceResult: DebugTraceResult,
): RpcDebugTraceOutput {
  const structLogs = debugTraceResult.structLogs.map((log) => {
    const result: RpcStructLog = {
      depth: Number(log.depth),
      gas: Number(log.gas),
      gasCost: Number(log.gasCost),
      op: log.opName,
      pc: Number(log.pc),
    };

    if (log.memory !== undefined) {
      result.memory = log.memory;
    }

    if (log.stack !== undefined) {
      // Remove 0x prefix which is required by EIP-3155, but not expected by Hardhat.
      result.stack = log.stack.map(getUnprefixedHexString);
    }

    if (log.storage !== undefined) {
      result.storage = Object.fromEntries(
        Object.entries(log.storage).map(([key, value]) => [
          getUnprefixedHexString(key),
          getUnprefixedHexString(value),
        ]),
      );
    }

    if (log.error !== undefined) {
      result.error = {
        message: log.error,
      };
    }

    return result;
  });

  // REVM trace adds initial STOP that Hardhat doesn't expect
  // TODO: double check with EDR team that this is still the case
  if (structLogs.length > 0 && structLogs[0].op === "STOP") {
    structLogs.shift();
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  debugTraceResult.output is a string, but it's typed as Buffer in Edr */
  let returnValue = (debugTraceResult.output as unknown as string) ?? "0x";
  if (returnValue === "0x") {
    returnValue = "";
  }

  return {
    failed: !debugTraceResult.pass,
    gas: Number(debugTraceResult.gasUsed),
    returnValue,
    structLogs,
  };
}

export async function hardhatAccountsToEdrOwnedAccounts(
  accounts: EdrNetworkAccountsConfig,
): Promise<Array<{ secretKey: string; balance: bigint }>> {
  const normalizedAccounts = await normalizeEdrNetworkAccountsConfig(accounts);

  const accountPromises = normalizedAccounts.map(async (account) => ({
    secretKey: await account.privateKey.getHexString(),
    balance: account.balance,
  }));

  return Promise.all(accountPromises);
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
            hardfork: hardhatHardforkToEdrSpecId(
              hardfork,
              descriptor.chainType,
            ),
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
 * Converts EDR's nested GasReport structure into a flat array of gas entries.
 * Filters out reverted transactions.
 */
export function edrGasReportToHardhatGasMeasurements(
  gasReport: GasReport,
): GasMeasurement[] {
  const gasMeasurements: GasMeasurement[] = [];

  for (const [contractFqn, data] of Object.entries(gasReport.contracts)) {
    // Process deployments
    for (const deployment of data.deployments) {
      if (deployment.status === GasReportExecutionStatus.Success) {
        gasMeasurements.push({
          contractFqn,
          type: "deployment",
          gas: deployment.gas,
          size: deployment.size,
        });
      }
    }

    // Process function calls
    for (const [functionSig, { calls }] of Object.entries(data.functions)) {
      for (const call of calls) {
        if (call.status === GasReportExecutionStatus.Success) {
          gasMeasurements.push({
            contractFqn,
            type: "function",
            functionSig,
            gas: call.gas,
          });
        }
      }
    }
  }

  return gasMeasurements;
}
