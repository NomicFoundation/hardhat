import type {
  EdrNetworkAccountConfig,
  EdrNetworkAccountsConfig,
  ChainDescriptorsConfig,
  EdrNetworkConfig,
  EdrNetworkForkingConfig,
  EdrNetworkMempoolConfig,
  EdrNetworkMiningConfig,
} from "../../../../../types/config.js";
import type { ChainType } from "../../../../../types/network.js";
import type { GasMeasurement } from "../../../gas-analytics/types.js";
import type { OpHardforkName } from "../types/hardfork.js";
import type {
  IntervalRange,
  ChainOverride,
  ForkConfig,
  GasReport,
  L1Hardfork,
  OpHardfork,
} from "@nomicfoundation/edr";

import {
  GasEstimationMode,
  GasReportExecutionStatus,
  l1HardforkToString,
  MineOrdering,
  opHardforkToString,
} from "@nomicfoundation/edr";

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
  EIP_7825_TRANSACTION_GAS_CAP,
  isDefaultEdrNetworkHDAccountsConfig,
} from "../edr-constants.js";
import { hardforkGte, L1HardforkName } from "../types/hardfork.js";

import {
  getHardforkName,
  getL1HardforkName,
  getOpHardforkName,
} from "./hardfork.js";

/**
 * Returns Hardhat's name for an EDR hardfork.
 */
export function edrL1HardforkToHardhatL1HardforkName(
  hardfork: L1Hardfork,
): L1HardforkName {
  return getL1HardforkName(l1HardforkToString(hardfork));
}

/**
 * Returns Hardhat's name for an EDR OP hardfork. See
 * {@link edrL1HardforkToHardhatL1HardforkName}.
 */
export function edrOpHardforkToHardhatOpHardforkName(
  hardfork: OpHardfork,
): OpHardforkName {
  return getOpHardforkName(opHardforkToString(hardfork));
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
      min: BigInt(Math.max(1, config[0])),
      max: BigInt(Math.max(1, config[1])),
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

export function hardhatGasEstimationModeToEdrGasEstimationMode(
  gasEstimationMode: EdrNetworkConfig["gasEstimationMode"],
): GasEstimationMode {
  switch (gasEstimationMode) {
    case "topLevelSuccess":
      return GasEstimationMode.TopLevelSuccess;
    case "noInternalOutOfGas":
      return GasEstimationMode.NoInternalOutOfGas;
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
    return EIP_7825_TRANSACTION_GAS_CAP;
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
