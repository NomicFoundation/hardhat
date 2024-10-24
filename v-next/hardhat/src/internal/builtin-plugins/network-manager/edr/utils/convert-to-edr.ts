/* eslint-disable no-restricted-syntax -- hack */
import type { IntervalMiningConfig } from "../../../../../types/config.js";
import type { MempoolOrder } from "../types/node-types.js";
import type { RpcDebugTraceOutput, RpcStructLog } from "../types/output.js";
import type {
  IntervalRange,
  DebugTraceResult,
  MineOrdering,
} from "@ignored/edr-optimism";

import {
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
} from "@ignored/edr-optimism";

import { HardforkName } from "../types/hardfork.js";

export function ethereumsjsHardforkToEdrSpecId(hardfork: HardforkName): string {
  switch (hardfork) {
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
      const _exhaustiveCheck: never = hardfork;
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we want to print the fork
        `Unknown hardfork name '${hardfork as string}', this shouldn't happen`,
      );
  }
}

export function edrSpecIdToEthereumHardfork(specId: string): HardforkName {
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

export function ethereumjsIntervalMiningConfigToEdr(
  config: IntervalMiningConfig,
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

// TODO: returning literals casted to the type is a hack to workaround
// "Cannot access ambient const enums when 'isolatedModules' is enabled."
// error. We should fix this properly by exporting the values as constants
// from the EDR package.
export function ethereumjsMempoolOrderToEdrMineOrdering(
  mempoolOrder: MempoolOrder,
): MineOrdering {
  switch (mempoolOrder) {
    case "fifo":
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Casting is required here as we are returning a literal */
      return "Fifo" as MineOrdering.Fifo;
    case "priority":
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Casting is required here as we are returning a literal */
      return "Priority" as MineOrdering.Priority;
  }
}

export function edrRpcDebugTraceToHardhat(
  rpcDebugTrace: DebugTraceResult,
): RpcDebugTraceOutput {
  const structLogs = rpcDebugTrace.structLogs.map((log) => {
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
      result.stack = log.stack?.map((item) => item.slice(2));
    }

    if (log.storage !== undefined) {
      result.storage = Object.fromEntries(
        Object.entries(log.storage).map(([key, value]) => {
          return [key.slice(2), value.slice(2)];
        }),
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
  if (structLogs.length > 0 && structLogs[0].op === "STOP") {
    structLogs.shift();
  }

  let returnValue = rpcDebugTrace.output?.toString("hex") ?? "";
  if (returnValue === "0x") {
    returnValue = "";
  }

  return {
    failed: !rpcDebugTrace.pass,
    gas: Number(rpcDebugTrace.gasUsed),
    returnValue,
    structLogs,
  };
}
