import { HeaderData as EthereumJSHeaderData } from "@nomicfoundation/ethereumjs-block";
import {
  EVMResult,
  Log as EthereumJsLog,
  Message,
} from "@nomicfoundation/ethereumjs-evm";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";
import {
  Address,
  BufferLike,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import {
  BlockOptions,
  ExecutionResult,
  SpecId,
  ExecutionLog,
  MineOrdering,
  TracingMessage,
  SuccessReason,
  IntervalRange,
  DebugTraceResult,
} from "@ignored/edr";
import { fromBigIntLike } from "../../../util/bigint";
import { HardforkName } from "../../../util/hardforks";
import {
  isCreateOutput,
  isHaltResult,
  isRevertResult,
  isSuccessResult,
} from "../../stack-traces/message-trace";
import { IntervalMiningConfig, MempoolOrder } from "../node-types";
import { RpcDebugTraceOutput, RpcStructLog } from "../output";
import { Exit, ExitCode } from "../vm/exit";
import { RunTxResult } from "../vm/vm-adapter";
import { Bloom } from "./bloom";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export function ethereumsjsHardforkToEdrSpecId(hardfork: HardforkName): SpecId {
  switch (hardfork) {
    case HardforkName.FRONTIER:
      return SpecId.Frontier;
    case HardforkName.HOMESTEAD:
      return SpecId.Homestead;
    case HardforkName.DAO:
      return SpecId.DaoFork;
    case HardforkName.TANGERINE_WHISTLE:
      return SpecId.Tangerine;
    case HardforkName.SPURIOUS_DRAGON:
      return SpecId.SpuriousDragon;
    case HardforkName.BYZANTIUM:
      return SpecId.Byzantium;
    case HardforkName.CONSTANTINOPLE:
      return SpecId.Constantinople;
    case HardforkName.PETERSBURG:
      return SpecId.Petersburg;
    case HardforkName.ISTANBUL:
      return SpecId.Istanbul;
    case HardforkName.MUIR_GLACIER:
      return SpecId.MuirGlacier;
    case HardforkName.BERLIN:
      return SpecId.Berlin;
    case HardforkName.LONDON:
      return SpecId.London;
    case HardforkName.ARROW_GLACIER:
      return SpecId.ArrowGlacier;
    case HardforkName.GRAY_GLACIER:
      return SpecId.GrayGlacier;
    case HardforkName.MERGE:
      return SpecId.Merge;
    case HardforkName.SHANGHAI:
      return SpecId.Shanghai;
    default:
      const _exhaustiveCheck: never = hardfork;
      throw new Error(
        `Unknown hardfork name '${hardfork as string}', this shouldn't happen`
      );
  }
}

export function edrSpecIdToEthereumHardfork(specId: SpecId): HardforkName {
  switch (specId) {
    case SpecId.Frontier:
      return HardforkName.FRONTIER;
    case SpecId.Homestead:
      return HardforkName.HOMESTEAD;
    case SpecId.DaoFork:
      return HardforkName.DAO;
    case SpecId.Tangerine:
      return HardforkName.TANGERINE_WHISTLE;
    case SpecId.SpuriousDragon:
      return HardforkName.SPURIOUS_DRAGON;
    case SpecId.Byzantium:
      return HardforkName.BYZANTIUM;
    case SpecId.Constantinople:
      return HardforkName.CONSTANTINOPLE;
    case SpecId.Petersburg:
      return HardforkName.PETERSBURG;
    case SpecId.Istanbul:
      return HardforkName.ISTANBUL;
    case SpecId.MuirGlacier:
      return HardforkName.MUIR_GLACIER;
    case SpecId.Berlin:
      return HardforkName.BERLIN;
    case SpecId.London:
      return HardforkName.LONDON;
    case SpecId.ArrowGlacier:
      return HardforkName.ARROW_GLACIER;
    case SpecId.GrayGlacier:
      return HardforkName.GRAY_GLACIER;
    case SpecId.Merge:
      return HardforkName.MERGE;
    case SpecId.Shanghai:
      return HardforkName.SHANGHAI;
    // HACK: EthereumJS doesn't support Cancun, so report Shanghai
    case SpecId.Cancun:
      return HardforkName.SHANGHAI;

    default:
      throw new Error(`Unknown spec id '${specId}', this shouldn't happen`);
  }
}

export function ethereumjsHeaderDataToEdrBlockOptions(
  headerData?: EthereumJSHeaderData
): BlockOptions {
  if (headerData === undefined) {
    return {};
  }

  // Ensure that we leave leave options undefined, as opposed to `toBuffer`
  function fromBufferLike(bufferLike?: BufferLike): Buffer | undefined {
    if (bufferLike === undefined) {
      return bufferLike;
    }

    return toBuffer(bufferLike);
  }

  return {
    parentHash: fromBufferLike(headerData.parentHash),
    beneficiary: fromBufferLike(headerData.coinbase),
    stateRoot: fromBufferLike(headerData.stateRoot),
    receiptsRoot: fromBufferLike(headerData.receiptTrie),
    logsBloom: fromBufferLike(headerData.logsBloom),
    difficulty: fromBigIntLike(headerData.difficulty),
    number: fromBigIntLike(headerData.number),
    gasLimit: fromBigIntLike(headerData.gasLimit),
    timestamp: fromBigIntLike(headerData.timestamp),
    extraData: fromBufferLike(headerData.extraData),
    mixHash: fromBufferLike(headerData.mixHash),
    nonce: fromBufferLike(headerData.nonce),
    baseFee: fromBigIntLike(headerData.baseFeePerGas),
    withdrawalsRoot: fromBufferLike(headerData.withdrawalsRoot),
  };
}

export function ethereumjsIntervalMiningConfigToEdr(
  config: IntervalMiningConfig
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

export function ethereumjsMempoolOrderToEdrMineOrdering(
  mempoolOrder: MempoolOrder
): MineOrdering {
  switch (mempoolOrder) {
    case "fifo":
      return MineOrdering.Fifo;
    case "priority":
      return MineOrdering.Priority;
  }
}

function edrLogsToBloom(logs: ExecutionLog[]): Bloom {
  const bloom = new Bloom();
  for (const log of logs) {
    bloom.add(log.address);
    for (const topic of log.topics) {
      bloom.add(topic);
    }
  }
  return bloom;
}

function getCreatedAddress(result: ExecutionResult): Address | undefined {
  const address =
    isSuccessResult(result.result) && isCreateOutput(result.result.output)
      ? result.result.output.address
      : undefined;

  return address === undefined ? undefined : new Address(address);
}

function getExit(result: ExecutionResult): Exit {
  return isSuccessResult(result.result)
    ? Exit.fromEdrSuccessReason(result.result.reason)
    : isHaltResult(result.result)
    ? Exit.fromEdrExceptionalHalt(result.result.reason)
    : new Exit(ExitCode.REVERT);
}

function getLogs(result: ExecutionResult): EthereumJsLog[] | undefined {
  return isSuccessResult(result.result)
    ? result.result.logs.map((log) => {
        return [log.address, log.topics, log.data];
      })
    : undefined;
}

function getReturnValue(result: ExecutionResult): Buffer {
  return isRevertResult(result.result)
    ? result.result.output
    : isSuccessResult(result.result)
    ? result.result.output.returnValue
    : Buffer.from([]);
}

export function edrResultToEthereumjsEvmResult(
  result: ExecutionResult
): EVMResult {
  const exit = getExit(result);

  const gasRefund = isSuccessResult(result.result)
    ? result.result.gasRefunded
    : undefined;

  return {
    createdAddress: getCreatedAddress(result),
    execResult: {
      exceptionError: exit.getEthereumJSError(),
      executionGasUsed: result.result.gasUsed,
      returnValue: getReturnValue(result),
      gasRefund,
      logs: getLogs(result),
    },
  };
}

export function ethereumjsEvmResultToEdrResult(
  result: EVMResult,
  overrideExceptionalHalt: boolean = false
): ExecutionResult {
  const gasUsed = result.execResult.executionGasUsed;

  if (result.execResult.exceptionError === undefined) {
    const reason =
      result.execResult.selfdestruct !== undefined &&
      Object.keys(result.execResult.selfdestruct).length > 0
        ? SuccessReason.SelfDestruct
        : result.createdAddress !== undefined ||
          result.execResult.returnValue.length > 0
        ? SuccessReason.Return
        : SuccessReason.Stop;

    return {
      result: {
        reason,
        gasUsed,
        gasRefunded: result.execResult.gasRefund ?? 0n,
        logs:
          result.execResult.logs?.map((log) => {
            return {
              address: log[0],
              topics: log[1],
              data: log[2],
            };
          }) ?? [],
        output:
          result.createdAddress === undefined
            ? {
                returnValue: result.execResult.returnValue,
              }
            : {
                address: result.createdAddress.toBuffer(),
                returnValue: result.execResult.returnValue,
              },
      },
    };
  } else if (result.execResult.exceptionError.error === ERROR.REVERT) {
    return {
      result: {
        gasUsed,
        output: result.execResult.returnValue,
      },
    };
  } else {
    if (overrideExceptionalHalt) {
      const overridenResult: any = {
        gasUsed,
      };

      // Throw an error if reason is accessed
      Object.defineProperty(overridenResult, "reason", {
        get: () => {
          throw new Error(
            "Cannot access reason of an exceptional halt in EthereumJS mode"
          );
        },
      });

      return {
        result: overridenResult,
      };
    } else {
      const vmError = Exit.fromEthereumJSEvmError(
        result.execResult.exceptionError
      );

      return {
        result: {
          reason: vmError.getEdrExceptionalHalt(),
          gasUsed,
        },
      };
    }
  }
}

export function edrResultToRunTxResult(
  edrResult: ExecutionResult,
  blockGasUsed: bigint
): RunTxResult {
  const exit = getExit(edrResult);

  const bloom = isSuccessResult(edrResult.result)
    ? edrLogsToBloom(edrResult.result.logs)
    : new Bloom(undefined);

  return {
    gasUsed: edrResult.result.gasUsed,
    createdAddress: getCreatedAddress(edrResult),
    exit,
    returnValue: getReturnValue(edrResult),
    bloom,
    receipt: {
      // Receipts have a 0 as status on error
      status: exit.isError() ? 0 : 1,
      cumulativeBlockGasUsed: blockGasUsed,
      bitvector: bloom.bitvector,
      logs: getLogs(edrResult) ?? [],
    },
  };
}

export function edrRpcDebugTraceToHardhat(
  rpcDebugTrace: DebugTraceResult
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
        })
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

export function edrTracingMessageToEthereumjsMessage(
  message: TracingMessage
): Message {
  return new Message({
    to: message.to !== undefined ? new Address(message.to) : undefined,
    depth: message.depth,
    data: message.data,
    value: message.value,
    codeAddress:
      message.codeAddress !== undefined
        ? new Address(message.codeAddress)
        : undefined,
    code: message.code,
    caller: new Address(message.caller),
    gasLimit: message.gasLimit,
  });
}

export function ethereumjsMessageToEdrTracingMessage(
  message: Message
): TracingMessage {
  return {
    to: message.to?.buf,
    depth: message.depth,
    data: message.data,
    value: message.value,
    codeAddress: message._codeAddress?.buf,
    code:
      // We don't support the pre-compile format in EDR
      message.code === undefined || message.isCompiled
        ? undefined
        : (message.code as Buffer),
    caller: message.caller.buf,
    gasLimit: message.gasLimit,
  };
}
