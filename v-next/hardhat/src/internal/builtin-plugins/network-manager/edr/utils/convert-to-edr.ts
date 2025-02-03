/* eslint-disable no-restricted-syntax -- hack */
import type {
  EdrNetworkAccountConfig,
  EdrNetworkAccountsConfig,
  EdrNetworkChainsConfig,
  EdrNetworkForkingConfig,
  EdrNetworkMempoolConfig,
  EdrNetworkMiningConfig,
} from "../../../../../types/config.js";
import type { ChainType } from "../../../../../types/network.js";
import type { RpcDebugTraceOutput, RpcStructLog } from "../types/output.js";
import type {
  IntervalRange,
  DebugTraceResult,
  ChainConfig,
  ForkConfig,
  OwnedAccount,
} from "@ignored/edr-optimism";

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
  OPTIMISM_CHAIN_TYPE as EDR_OPTIMISM_CHAIN_TYPE,
  L1_CHAIN_TYPE as EDR_L1_CHAIN_TYPE,
  GENERIC_CHAIN_TYPE as EDR_GENERIC_CHAIN_TYPE,
} from "@ignored/edr-optimism";
import { getUnprefixedHexString } from "@ignored/hardhat-vnext-utils/hex";

import { L1_CHAIN_TYPE, OPTIMISM_CHAIN_TYPE } from "../../../../constants.js";
import { FixedValueConfigurationVariable } from "../../../../core/configuration-variables.js";
import { derivePrivateKeys } from "../../accounts/derive-private-keys.js";
import {
  DEFAULT_EDR_NETWORK_BALANCE,
  EDR_NETWORK_DEFAULT_PRIVATE_KEYS,
  isDefaultEdrNetworkHDAccountsConfig,
} from "../edr-provider.js";
import { HardforkName } from "../types/hardfork.js";

import { getHardforkName } from "./hardfork.js";

export function hardhatHardforkToEdrSpecId(hardfork: string): string {
  const hardforkName = getHardforkName(hardfork);

  switch (hardforkName) {
    case HardforkName.FRONTIER:
      return FRONTIER;
    case HardforkName.HOMESTEAD:
      return HOMESTEAD;
    case HardforkName.DAO:
      return DAO_FORK;
    case HardforkName.TANGERINE_WHISTLE:
      return TANGERINE;
    case HardforkName.SPURIOUS_DRAGON:
      return SPURIOUS_DRAGON;
    case HardforkName.BYZANTIUM:
      return BYZANTIUM;
    case HardforkName.CONSTANTINOPLE:
      return CONSTANTINOPLE;
    case HardforkName.PETERSBURG:
      return PETERSBURG;
    case HardforkName.ISTANBUL:
      return ISTANBUL;
    case HardforkName.MUIR_GLACIER:
      return MUIR_GLACIER;
    case HardforkName.BERLIN:
      return BERLIN;
    case HardforkName.LONDON:
      return LONDON;
    case HardforkName.ARROW_GLACIER:
      return ARROW_GLACIER;
    case HardforkName.GRAY_GLACIER:
      return GRAY_GLACIER;
    case HardforkName.MERGE:
      return MERGE;
    case HardforkName.SHANGHAI:
      return SHANGHAI;
    case HardforkName.CANCUN:
      return CANCUN;
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- trust but verify
    default:
      const _exhaustiveCheck: never = hardforkName;
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we want to print the fork
        `Unknown hardfork name '${hardfork as string}', this shouldn't happen`,
      );
  }
}

export function edrSpecIdToHardhatHardfork(specId: string): HardforkName {
  switch (specId) {
    case FRONTIER:
      return HardforkName.FRONTIER;
    case HOMESTEAD:
      return HardforkName.HOMESTEAD;
    case DAO_FORK:
      return HardforkName.DAO;
    case TANGERINE:
      return HardforkName.TANGERINE_WHISTLE;
    case SPURIOUS_DRAGON:
      return HardforkName.SPURIOUS_DRAGON;
    case BYZANTIUM:
      return HardforkName.BYZANTIUM;
    case CONSTANTINOPLE:
      return HardforkName.CONSTANTINOPLE;
    case PETERSBURG:
      return HardforkName.PETERSBURG;
    case ISTANBUL:
      return HardforkName.ISTANBUL;
    case MUIR_GLACIER:
      return HardforkName.MUIR_GLACIER;
    case BERLIN:
      return HardforkName.BERLIN;
    case LONDON:
      return HardforkName.LONDON;
    case ARROW_GLACIER:
      return HardforkName.ARROW_GLACIER;
    case GRAY_GLACIER:
      return HardforkName.GRAY_GLACIER;
    case MERGE:
      return HardforkName.MERGE;
    case SHANGHAI:
      return HardforkName.SHANGHAI;
    // HACK: EthereumJS doesn't support Cancun, so report Shanghai
    case CANCUN:
      return HardforkName.SHANGHAI;

    default:
      throw new Error(`Unknown spec id '${specId}', this shouldn't happen`);
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
): Promise<OwnedAccount[]> {
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

  const isDefaultConfig =
    await isDefaultEdrNetworkHDAccountsConfig(accounts);
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

export function hardhatChainsToEdrChains(
  chains: EdrNetworkChainsConfig,
): ChainConfig[] {
  const edrChains: ChainConfig[] = [];

  for (const [chainId, hardforkConfig] of chains) {
    const hardforks = [];

    for (const [hardfork, blockNumber] of hardforkConfig.hardforkHistory) {
      const specId = hardhatHardforkToEdrSpecId(getHardforkName(hardfork));

      hardforks.push({
        blockNumber: BigInt(blockNumber),
        specId,
      });
    }

    edrChains.push({
      chainId: BigInt(chainId),
      hardforks,
    });
  }

  return edrChains;
}

export async function hardhatForkingConfigToEdrForkConfig(
  forkingConfig: EdrNetworkForkingConfig | undefined,
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
      jsonRpcUrl: await forkingConfig.url.getUrl(),
      blockNumber: forkingConfig.blockNumber,
      httpHeaders,
    };
  }

  return fork;
}

export function hardhatChainTypeToEdrChainType(
  chainType: ChainType | undefined,
): string {
  if (chainType === OPTIMISM_CHAIN_TYPE) {
    return EDR_OPTIMISM_CHAIN_TYPE;
  }

  if (chainType === L1_CHAIN_TYPE) {
    return EDR_L1_CHAIN_TYPE;
  }

  return EDR_GENERIC_CHAIN_TYPE;
}
