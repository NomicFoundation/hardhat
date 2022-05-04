import { TypedTransaction } from "@ethereumjs/tx";
import VM from "@ethereumjs/vm";
import { EVMResult } from "@ethereumjs/vm/dist/evm/evm";
import { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import Message from "@ethereumjs/vm/dist/evm/message";
import { Address, BN, setLengthLeft, toBuffer } from "ethereumjs-util";

import { assertHardhatInvariant } from "../../core/errors";
import { RpcDebugTracingConfig } from "../../core/jsonrpc/types/input/debugTraceTransaction";
import { InvalidInputError } from "../../core/providers/errors";
import { RpcDebugTraceOutput, RpcStructLog } from "../provider/output";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

interface StructLog {
  depth: number;
  gas: number;
  gasCost: number;
  op: string;
  pc: number;
  memory: string[];
  stack: string[];
  storage: Record<string, string>;
  memSize: number;
  error?: object;
}

type Storage = Record<string, string>;

interface DebugMessage {
  structLogs: Array<StructLog | DebugMessage>;
  to: string;
  result?: EVMResult;
}

type NestedStructLogs = Array<StructLog | NestedStructLogs>;

function isStructLog(
  message: StructLog | DebugMessage | undefined
): message is StructLog {
  return message !== undefined && !("structLogs" in message);
}

const EMPTY_MEMORY_WORD = "0".repeat(64);

export class VMDebugTracer {
  private _lastTrace?: RpcDebugTraceOutput;
  private _config: RpcDebugTracingConfig;

  private _messages: DebugMessage[] = [];
  private _addressToStorage: Record<string, Storage> = {};

  constructor(private readonly _vm: VM) {
    this._beforeMessageHandler = this._beforeMessageHandler.bind(this);
    this._afterMessageHandler = this._afterMessageHandler.bind(this);
    this._beforeTxHandler = this._beforeTxHandler.bind(this);
    this._stepHandler = this._stepHandler.bind(this);
    this._afterTxHandler = this._afterTxHandler.bind(this);
  }

  /**
   * Run the `action` callback and trace its execution
   */
  public async trace(
    action: () => Promise<void>,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    try {
      this._enableTracing(config);
      this._config = config;

      await action();

      return this._getDebugTrace();
    } finally {
      this._disableTracing();
    }
  }

  private _enableTracing(config: RpcDebugTracingConfig) {
    this._vm.on("beforeTx", this._beforeTxHandler);
    this._vm.on("beforeMessage", this._beforeMessageHandler);
    this._vm.on("step", this._stepHandler);
    this._vm.on("afterMessage", this._afterMessageHandler);
    this._vm.on("afterTx", this._afterTxHandler);
    this._config = config;
  }

  private _disableTracing() {
    this._vm.removeListener("beforeTx", this._beforeTxHandler);
    this._vm.removeListener("beforeMessage", this._beforeMessageHandler);
    this._vm.removeListener("step", this._stepHandler);
    this._vm.removeListener("afterTx", this._afterTxHandler);
    this._vm.removeListener("afterMessage", this._afterMessageHandler);
    this._config = undefined;
  }

  private _getDebugTrace(): RpcDebugTraceOutput {
    if (this._lastTrace === undefined) {
      throw new Error(
        "No debug trace available. Please run the transaction first"
      );
    }
    return this._lastTrace;
  }

  private async _beforeTxHandler(_tx: TypedTransaction, next: any) {
    this._lastTrace = undefined;
    this._messages = [];
    this._addressToStorage = {};
    next();
  }

  private async _beforeMessageHandler(message: Message, next: any) {
    const debugMessage: DebugMessage = {
      structLogs: [],
      to: message.to?.toString() ?? "",
    };

    if (this._messages.length > 0) {
      const previousMessage = this._messages[this._messages.length - 1];

      previousMessage.structLogs.push(debugMessage);
    }

    this._messages.push(debugMessage);

    next();
  }

  private async _stepHandler(step: InterpreterStep, next: any) {
    assertHardhatInvariant(
      this._messages.length > 0,
      "Step handler should be called after at least one beforeMessage handler"
    );

    const structLog = await this._stepToStructLog(step);
    this._messages[this._messages.length - 1].structLogs.push(structLog);

    next();
  }

  private async _afterMessageHandler(result: EVMResult, next: any) {
    const lastMessage = this._messages[this._messages.length - 1];

    lastMessage.result = result;

    if (this._messages.length > 1) {
      this._messages.pop();
    }

    next();
  }

  private async _afterTxHandler(result: EVMResult, next: any) {
    const { default: flattenDeep } = await import("lodash/flattenDeep");
    const topLevelMessage = this._messages[0];

    const nestedStructLogs = await this._messageToNestedStructLogs(
      topLevelMessage,
      topLevelMessage.to
    );

    const rpcStructLogs: RpcStructLog[] = flattenDeep(nestedStructLogs).map(
      (structLog) => {
        const rpcStructLog: RpcStructLog = structLog;

        // geth doesn't return this value
        delete rpcStructLog.memSize;

        if (this._config?.disableMemory === true) {
          delete rpcStructLog.memory;
        }
        if (this._config?.disableStack === true) {
          delete rpcStructLog.stack;
        }
        if (this._config?.disableStorage === true) {
          delete rpcStructLog.storage;
        }

        return rpcStructLog;
      }
    );

    // geth does this for some reason
    if (result.execResult.exceptionError?.error === "out of gas") {
      rpcStructLogs[rpcStructLogs.length - 1].error = {};
    }

    this._lastTrace = {
      gas: result.gasUsed.toNumber(),
      failed: result.execResult.exceptionError !== undefined,
      returnValue: result.execResult.returnValue.toString("hex"),
      structLogs: rpcStructLogs,
    };

    next();
  }

  private async _messageToNestedStructLogs(
    message: DebugMessage,
    address: string
  ): Promise<NestedStructLogs> {
    const nestedStructLogs: NestedStructLogs = [];

    for (const [i, messageOrStructLog] of message.structLogs.entries()) {
      if (isStructLog(messageOrStructLog)) {
        const structLog: StructLog = messageOrStructLog;

        nestedStructLogs.push(structLog);

        // update the storage of the current address
        const addressStorage = this._addressToStorage[address] ?? {};
        structLog.storage = {
          ...addressStorage,
          ...structLog.storage,
        };
        this._addressToStorage[address] = {
          ...structLog.storage,
        };

        if (i === 0) {
          continue;
        }

        let previousStructLog = nestedStructLogs[nestedStructLogs.length - 2];

        if (Array.isArray(previousStructLog)) {
          previousStructLog = nestedStructLogs[nestedStructLogs.length - 3];
        } else {
          // if the previous log is not a message, we update its gasCost
          // using the gas difference between both steps
          previousStructLog.gasCost = previousStructLog.gas - structLog.gas;
        }

        assertHardhatInvariant(
          !Array.isArray(previousStructLog),
          "There shouldn't be two messages one after another"
        );

        // the increase in memory size of a revert is immediately
        // reflected, so we don't treat it as a memory expansion
        // of the previous step
        if (structLog.op !== "REVERT") {
          const memoryLengthDifference =
            structLog.memory.length - previousStructLog.memory.length;
          for (let k = 0; k < memoryLengthDifference; k++) {
            previousStructLog.memory.push(EMPTY_MEMORY_WORD);
          }
        }
      } else {
        const subMessage: DebugMessage = messageOrStructLog;

        const lastStructLog = nestedStructLogs[nestedStructLogs.length - 1];

        assertHardhatInvariant(
          !Array.isArray(lastStructLog),
          "There shouldn't be two messages one after another"
        );

        const isDelegateCall = lastStructLog.op === "DELEGATECALL";

        const messageNestedStructLogs = await this._messageToNestedStructLogs(
          subMessage,
          isDelegateCall ? address : subMessage.to
        );

        nestedStructLogs.push(messageNestedStructLogs);
      }
    }

    return nestedStructLogs;
  }

  private _getMemory(step: InterpreterStep): string[] {
    const memory = Buffer.from(step.memory)
      .toString("hex")
      .match(/.{1,64}/g);

    const result = memory === null ? [] : [...memory];

    return result;
  }

  private _getStack(step: InterpreterStep): string[] {
    const stack = step.stack
      .slice()
      .map((el: BN) => el.toString("hex").padStart(64, "0"));
    return stack;
  }

  private async _stepToStructLog(step: InterpreterStep): Promise<StructLog> {
    const memory = this._getMemory(step);
    const stack = this._getStack(step);

    let gasCost = step.opcode.fee;

    let op = step.opcode.name;
    let error: object | undefined;

    const storage: Storage = {};

    if (step.opcode.name === "SLOAD") {
      const address = step.address;
      const [keyBuffer] = this._getFromStack(stack, 1);
      const key: Buffer = setLengthLeft(keyBuffer, 32);

      const storageValue = await this._getContractStorage(address, key);

      storage[toWord(key)] = toWord(storageValue);
    } else if (step.opcode.name === "SSTORE") {
      const [keyBuffer, valueBuffer] = this._getFromStack(stack, 2);
      const key = toWord(keyBuffer);
      const storageValue = toWord(valueBuffer);

      storage[key] = storageValue;
    } else if (step.opcode.name === "REVERT") {
      gasCost = step.opcode.dynamicFee!.toNumber();
    } else if (step.opcode.name === "CREATE2") {
      gasCost = step.opcode.dynamicFee!.toNumber();
    } else if (
      step.opcode.name === "CALL" ||
      step.opcode.name === "STATICCALL" ||
      step.opcode.name === "DELEGATECALL"
    ) {
      gasCost = step.opcode.dynamicFee!.toNumber();
    } else if (step.opcode.name === "CALLCODE") {
      // finding an existing tx that uses CALLCODE or compiling a contract
      // so that it uses tihs opcode is hard,
      // so we just throw
      throw new InvalidInputError(
        "Transactions that use CALLCODE are not supported by Hardhat's debug_traceTransaction"
      );
    } else if (step.opcode.name === "INVALID") {
      const code = await this._getContractCode(step.codeAddress);

      const opcodeHex = code[step.pc].toString(16);
      op = `opcode 0x${opcodeHex} not defined`;
      error = {};
    }

    const structLog: StructLog = {
      pc: step.pc,
      op,
      gas: step.gasLeft.toNumber(),
      gasCost,
      depth: step.depth + 1,
      stack,
      memory,
      storage,
      memSize: step.memoryWordCount.toNumber(),
    };

    if (error !== undefined) {
      structLog.error = error;
    }

    return structLog;
  }

  private _getContractStorage(address: Address, key: Buffer): Promise<Buffer> {
    return this._vm.stateManager.getContractStorage(address, key);
  }

  private _getContractCode(address: Address): Promise<Buffer> {
    return this._vm.stateManager.getContractCode(address);
  }

  private _getFromStack(stack: string[], count: number): Buffer[] {
    return stack
      .slice(-count)
      .reverse()
      .map((value) => `0x${value}`)
      .map(toBuffer);
  }
}

function toWord(b: Buffer): string {
  return b.toString("hex").padStart(64, "0");
}
