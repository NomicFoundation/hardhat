import type {
  ChainOverride,
  MineOrdering,
  IntervalRange,
  TracingMessage,
  TracingMessageResult,
  TracingStep,
  HttpHeader,
} from "@nomicfoundation/edr";
import type { HardhatNetworkChainsConfig } from "../../../../types";
import { Address } from "@ethereumjs/util";

import { requireNapiRsModule } from "../../../../common/napi-rs";
import { getHardforkName, HARDFORKS_ORDER } from "../../../util/hardforks";
import { IntervalMiningConfig, MempoolOrder } from "../node-types";
import { RpcDebugTraceOutput, RpcStructLog } from "../output";
import {
  MinimalEVMResult,
  MinimalInterpreterStep,
  MinimalMessage,
} from "../vm/types";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

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
  const { MineOrdering } = requireNapiRsModule(
    "@nomicfoundation/edr"
  ) as typeof import("@nomicfoundation/edr");

  switch (mempoolOrder) {
    case "fifo":
      return MineOrdering.Fifo;
    case "priority":
      return MineOrdering.Priority;
  }
}

export function edrTracingStepToMinimalInterpreterStep(
  step: TracingStep
): MinimalInterpreterStep {
  const minimalInterpreterStep: MinimalInterpreterStep = {
    pc: step.pc,
    depth: step.depth,
    opcode: {
      name: step.opcode.name,
    },
    stack: step.stack,
    memory: step.memory,
  };

  return minimalInterpreterStep;
}

export function edrTracingMessageResultToMinimalEVMResult(
  tracingMessageResult: TracingMessageResult
): MinimalEVMResult {
  const execResult = tracingMessageResult.execResult;

  const minimalEVMResult: MinimalEVMResult = {
    execResult: {
      success: execResult.success,
      executionGasUsed: execResult.executionGasUsed,
      contractAddress:
        execResult.contractAddress !== undefined
          ? new Address(execResult.contractAddress)
          : undefined,
      reason: execResult.reason,
      output:
        execResult.output !== undefined
          ? Buffer.from(execResult.output)
          : undefined,
    },
  };

  return minimalEVMResult;
}

export function edrTracingMessageToMinimalMessage(
  message: TracingMessage
): MinimalMessage {
  return {
    to: message.to !== undefined ? new Address(message.to) : undefined,
    codeAddress:
      message.codeAddress !== undefined
        ? new Address(message.codeAddress)
        : undefined,
    data: message.data,
    value: message.value,
    caller: new Address(message.caller),
    gasLimit: message.gasLimit,
    isStaticCall: message.isStaticCall,
  };
}

export function httpHeadersToEdr(input?: {
  [name: string]: string;
}): HttpHeader[] | undefined {
  let httpHeaders: HttpHeader[] | undefined;
  if (input !== undefined) {
    httpHeaders = [];

    for (const [name, value] of Object.entries(input)) {
      httpHeaders.push({
        name,
        value,
      });
    }
  }

  return httpHeaders;
}

/** A struct log entry of EDR's geth-style default tracer output. */
export interface EdrGethStructLog {
  pc: number;
  op: string;
  gas: number;
  gasCost: number;
  depth: number;
  error?: string;
  stack?: string[];
  returnData?: string;
  memory?: string[];
  storage?: Record<string, string>;
  refund?: number;
}

/** EDR's geth-style default tracer output. */
export interface EdrGethDefaultTrace {
  failed: boolean;
  gas: number;
  returnValue: string;
  structLogs: EdrGethStructLog[];
}

const HEX_PREFIX = "0x";
const WORD_HEX_LENGTH = 64;
const ADDRESS_HEX_LENGTH = 40;

/**
 * The address that a failed CREATE or CREATE2 pushes, in the unprefixed form
 * that `stackItemToAddress` returns.
 */
const FAILED_CREATE_ADDRESS = "0".repeat(ADDRESS_HEX_LENGTH);

const CALL_OPCODES_WITH_OWN_STORAGE = new Set(["CALL", "STATICCALL"]);
const CALL_OPCODES_WITH_CALLER_STORAGE = new Set(["DELEGATECALL", "CALLCODE"]);
const CREATE_OPCODES = new Set(["CREATE", "CREATE2"]);

/**
 * The target address sits second from the top of the stack, below the gas.
 * This holds for CALL, CALLCODE, DELEGATECALL and STATICCALL.
 */
const CALL_ADDRESS_STACK_OFFSET = 2;

function stripHexPrefix(hex: string): string {
  return hex.startsWith(HEX_PREFIX) ? hex.slice(HEX_PREFIX.length) : hex;
}

function edrStackItemToHardhat2(item: string): string {
  return stripHexPrefix(item).padStart(WORD_HEX_LENGTH, "0");
}

function edrStorageToHardhat2(
  storage: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(storage).map(([key, value]) => [
      stripHexPrefix(key),
      stripHexPrefix(value),
    ])
  );
}

function stackItemToAddress(item: string): string {
  return edrStackItemToHardhat2(item).slice(-ADDRESS_HEX_LENGTH);
}

function normalizeAddress(address: string): string {
  return stripHexPrefix(address).toLowerCase();
}

/**
 * Tracks the storage that Hardhat 2 reported on every step.
 *
 * EDR reports storage only on SLOAD and SSTORE steps. Each report holds every
 * slot the executing contract has accessed so far in the transaction. This
 * class repeats that snapshot on every step, keyed by the storage context of
 * each call frame. The context of a CALL or STATICCALL is its target
 * address, read from the stack. DELEGATECALL and CALLCODE keep the caller's
 * context. A CREATE context is renamed to the created address once the frame
 * returns. Without the stack, each called frame gets a new context, so its
 * storage values can be stale until the next SLOAD or SSTORE.
 */
class StorageTracker {
  private readonly _storageByContext = new Map<
    string,
    Record<string, string>
  >();

  // The storage context of each active call frame, indexed by depth - 1.
  private readonly _contexts: string[];

  // The storage context of the frame the previous step entered, if any.
  private _nextContext: string | undefined;

  // The context of each CREATE awaiting its address, keyed by the depth of
  // the CREATE step.
  private readonly _pendingCreateContexts = new Map<number, string>();

  constructor(rootContext: string) {
    this._contexts = [rootContext];
  }

  public storageAt(
    log: EdrGethStructLog,
    stepIndex: number
  ): Record<string, string> {
    this._enterOrLeaveFrames(log, stepIndex);

    const context = this._contexts[this._contexts.length - 1];
    if (log.storage !== undefined) {
      this._storageByContext.set(context, edrStorageToHardhat2(log.storage));
    }

    this._nextContext = this._childContext(log, context, stepIndex);

    return { ...(this._storageByContext.get(context) ?? {}) };
  }

  private _enterOrLeaveFrames(log: EdrGethStructLog, stepIndex: number): void {
    if (log.depth > this._contexts.length) {
      // Without the stack, the frame's storage context is unknown.
      this._contexts.push(this._nextContext ?? `frame:${stepIndex}`);
      return;
    }

    while (log.depth < this._contexts.length) {
      this._contexts.pop();
    }

    const createContext = this._pendingCreateContexts.get(log.depth);
    if (createContext !== undefined) {
      this._pendingCreateContexts.delete(log.depth);
      this._renameCreateContext(createContext, log.stack);
    }
  }

  private _renameCreateContext(
    createContext: string,
    stack: string[] | undefined
  ): void {
    const createdStackItem = stack?.[stack.length - 1];
    const storage = this._storageByContext.get(createContext);
    if (createdStackItem === undefined || storage === undefined) {
      return;
    }

    const createdAddress = stackItemToAddress(createdStackItem);
    if (createdAddress === FAILED_CREATE_ADDRESS) {
      return;
    }

    this._storageByContext.delete(createContext);
    this._storageByContext.set(createdAddress, storage);
  }

  private _childContext(
    log: EdrGethStructLog,
    context: string,
    stepIndex: number
  ): string | undefined {
    if (CALL_OPCODES_WITH_CALLER_STORAGE.has(log.op)) {
      return context;
    }

    if (CALL_OPCODES_WITH_OWN_STORAGE.has(log.op)) {
      const target = log.stack?.[log.stack.length - CALL_ADDRESS_STACK_OFFSET];
      return target === undefined ? undefined : stackItemToAddress(target);
    }

    if (CREATE_OPCODES.has(log.op)) {
      const createContext = `create:${stepIndex}`;
      this._pendingCreateContexts.set(log.depth, createContext);
      return createContext;
    }

    return undefined;
  }
}

/**
 * Converts EDR's geth-style default tracer output to Hardhat 2's debug trace
 * format.
 *
 * @param trace The output of `debug_traceTransaction` or `debug_traceCall`.
 * @param storageEnabled Whether the request captured storage.
 * @param rootAddress The address whose code the transaction runs. Omit it for
 * a contract creation, whose constructor cannot be re-entered.
 */
export function edrRpcDebugTraceToHardhat2(
  trace: EdrGethDefaultTrace,
  storageEnabled: boolean,
  rootAddress?: string
): RpcDebugTraceOutput {
  const storageTracker = storageEnabled
    ? new StorageTracker(
        rootAddress !== undefined ? normalizeAddress(rootAddress) : "root"
      )
    : undefined;

  const structLogs = trace.structLogs.map((log, stepIndex) => {
    const result: RpcStructLog = {
      depth: log.depth,
      gas: log.gas,
      gasCost: log.gasCost,
      op: log.op,
      pc: log.pc,
    };

    if (log.memory !== undefined) {
      result.memory = log.memory.map(stripHexPrefix);
    }

    if (log.stack !== undefined) {
      result.stack = log.stack.map(edrStackItemToHardhat2);
    }

    if (storageTracker !== undefined) {
      result.storage = storageTracker.storageAt(log, stepIndex);
    }

    if (log.error !== undefined) {
      result.error = { message: log.error };
    }

    if (log.returnData !== undefined) {
      result.returnData = log.returnData;
    }

    return result;
  });

  return {
    failed: trace.failed,
    gas: trace.gas,
    returnValue: trace.returnValue === HEX_PREFIX ? "" : trace.returnValue,
    structLogs,
  };
}

/**
 * Converts `networks.hardhat.chains` to EDR chain overrides.
 *
 * An empty hardfork history is omitted, so that EDR keeps its built-in
 * activations for that chain.
 */
export function hardhatChainsToEdrChainOverrides(
  chains: HardhatNetworkChainsConfig
): ChainOverride[] {
  return Array.from(chains, ([chainId, { hardforkHistory }]) => {
    const chainOverride: ChainOverride = {
      chainId: BigInt(chainId),
      name: "Unknown",
    };

    if (hardforkHistory.size > 0) {
      // EDR assumes activations in ascending order.
      chainOverride.hardforkActivationOverrides = Array.from(hardforkHistory)
        .sort(([hardforkA, blockA], [hardforkB, blockB]) =>
          blockA !== blockB
            ? blockA - blockB
            : HARDFORKS_ORDER.indexOf(hardforkA) -
              HARDFORKS_ORDER.indexOf(hardforkB)
        )
        .map(([hardfork, blockNumber]) => ({
          condition: { blockNumber: BigInt(blockNumber) },
          hardfork: getHardforkName(hardfork),
        }));
    }

    return chainOverride;
  });
}
