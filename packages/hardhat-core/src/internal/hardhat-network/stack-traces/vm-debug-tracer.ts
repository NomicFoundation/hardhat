import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { AfterTxEvent, VM } from "@nomicfoundation/ethereumjs-vm";
import { EVMResult } from "@nomicfoundation/ethereumjs-evm";
import { InterpreterStep } from "@nomicfoundation/ethereumjs-evm/dist/interpreter";
import { Message } from "@nomicfoundation/ethereumjs-evm/dist/message";
import {
  Address,
  bufferToBigInt,
  setLengthLeft,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";

import { assertHardhatInvariant } from "../../core/errors";
import { RpcDebugTracingConfig } from "../../core/jsonrpc/types/input/debugTraceTransaction";
import { InvalidInputError } from "../../core/providers/errors";
import { RpcDebugTraceOutput, RpcStructLog } from "../provider/output";
import * as BigIntUtils from "../../util/bigint";

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

  private _error: any;

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

      if (this._error !== undefined) {
        throw this._error;
      }

      return this._getDebugTrace();
    } finally {
      this._disableTracing();
    }
  }

  private _enableTracing(config: RpcDebugTracingConfig) {
    assertHardhatInvariant(
      this._vm.evm.events !== undefined,
      "EVM should have an 'events' property"
    );

    this._vm.events.on("beforeTx", this._beforeTxHandler);

    this._vm.evm.events.on("beforeMessage", this._beforeMessageHandler);
    this._vm.evm.events.on("step", this._stepHandler);
    this._vm.evm.events.on("afterMessage", this._afterMessageHandler);

    this._vm.events.on("afterTx", this._afterTxHandler);

    this._config = config;
  }

  private _disableTracing() {
    assertHardhatInvariant(
      this._vm.evm.events !== undefined,
      "EVM should have an 'events' property"
    );

    this._vm.events.removeListener("beforeTx", this._beforeTxHandler);

    this._vm.evm.events.removeListener(
      "beforeMessage",
      this._beforeMessageHandler
    );
    this._vm.evm.events.removeListener("step", this._stepHandler);
    this._vm.evm.events.removeListener(
      "afterMessage",
      this._afterMessageHandler
    );
    this._vm.events.removeListener("afterTx", this._afterTxHandler);
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
    try {
      assertHardhatInvariant(
        this._messages.length > 0,
        "Step handler should be called after at least one beforeMessage handler"
      );

      const structLog = await this._stepToStructLog(step);
      this._messages[this._messages.length - 1].structLogs.push(structLog);
    } catch (e: any) {
      // errors thrown in event handlers are lost, so we save this error to
      // re-throw it in the `trace` function
      this._error = e;
      this._disableTracing();
    }

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

  private async _afterTxHandler(result: AfterTxEvent, next: any) {
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
    if (
      rpcStructLogs.length > 0 &&
      result.execResult.exceptionError?.error === "out of gas"
    ) {
      rpcStructLogs[rpcStructLogs.length - 1].error = {};
    }

    this._lastTrace = {
      gas: Number(result.totalGasSpent),
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
      .map((el: bigint) => el.toString(16).padStart(64, "0"));
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
      const [offsetBuffer, lengthBuffer] = this._getFromStack(stack, 2);
      const length = bufferToBigInt(lengthBuffer);
      const offset = bufferToBigInt(offsetBuffer);

      const [gasIncrease, addedWords] = this._memoryExpansion(
        BigInt(memory.length),
        length + offset
      );

      gasCost += Number(gasIncrease);

      for (let i = 0; i < addedWords; i++) {
        memory.push(EMPTY_MEMORY_WORD);
      }
    } else if (step.opcode.name === "CREATE2") {
      const [, , memoryUsedBuffer] = this._getFromStack(stack, 3);
      const memoryUsed = bufferToBigInt(memoryUsedBuffer);
      const sha3ExtraCost =
        BigIntUtils.divUp(memoryUsed, 32n) * this._sha3WordGas();
      gasCost += Number(sha3ExtraCost);
    } else if (
      step.opcode.name === "CALL" ||
      step.opcode.name === "STATICCALL" ||
      step.opcode.name === "DELEGATECALL"
    ) {
      // this is a port of what geth does to compute the
      // gasCost of a *CALL step, with some simplifications
      // because we don't support pre-spuriousDragon hardforks
      let valueBuffer = Buffer.from([]);
      let [
        callCostBuffer,
        recipientAddressBuffer,
        inBuffer,
        inSizeBuffer,
        outBuffer,
        outSizeBuffer,
      ] = this._getFromStack(stack, 6);

      // CALL has 7 parameters
      if (step.opcode.name === "CALL") {
        [
          callCostBuffer,
          recipientAddressBuffer,
          valueBuffer,
          inBuffer,
          inSizeBuffer,
          outBuffer,
          outSizeBuffer,
        ] = this._getFromStack(stack, 7);
      }

      const callCost = bufferToBigInt(callCostBuffer);

      const value = bufferToBigInt(valueBuffer);

      const memoryLength = BigInt(memory.length);
      const inBN = bufferToBigInt(inBuffer);
      const inSizeBN = bufferToBigInt(inSizeBuffer);
      const inPosition = inSizeBN === 0n ? inSizeBN : inBN + inSizeBN;
      const outBN = bufferToBigInt(outBuffer);
      const outSizeBN = bufferToBigInt(outSizeBuffer);
      const outPosition = outSizeBN === 0n ? outSizeBN : outBN + outSizeBN;
      const memSize = inPosition > outPosition ? inPosition : outPosition;
      const toAddress = new Address(recipientAddressBuffer.slice(-20));

      const constantGas = this._callConstantGas();
      const availableGas = step.gasLeft - constantGas;

      const [memoryGas] = this._memoryExpansion(memoryLength, memSize);

      const dynamicGas = await this._callDynamicGas(
        toAddress,
        value,
        availableGas,
        memoryGas,
        callCost
      );

      gasCost = Number(constantGas + dynamicGas);
    } else if (step.opcode.name === "CALLCODE") {
      // finding an existing tx that uses CALLCODE or compiling a contract
      // so that it uses this opcode is hard,
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
      gas: Number(step.gasLeft),
      gasCost,
      depth: step.depth + 1,
      stack,
      memory,
      storage,
      memSize: Number(step.memoryWordCount),
    };

    if (error !== undefined) {
      structLog.error = error;
    }

    return structLog;
  }

  private _memoryGas(): bigint {
    return this._vm._common.param("gasPrices", "memory");
  }

  private _sha3WordGas(): bigint {
    return this._vm._common.param("gasPrices", "sha3Word");
  }

  private _callConstantGas(): bigint {
    if (this._vm._common.gteHardfork("berlin")) {
      return this._vm._common.param("gasPrices", "warmstorageread");
    }

    return this._vm._common.param("gasPrices", "call");
  }

  private _callNewAccountGas(): bigint {
    return this._vm._common.param("gasPrices", "callNewAccount");
  }

  private _callValueTransferGas(): bigint {
    return this._vm._common.param("gasPrices", "callValueTransfer");
  }

  private _quadCoeffDiv(): bigint {
    return this._vm._common.param("gasPrices", "quadCoeffDiv");
  }

  private _isAddressEmpty(address: Address): Promise<boolean> {
    return this._vm.stateManager.accountIsEmpty(address);
  }

  private _getContractStorage(address: Address, key: Buffer): Promise<Buffer> {
    return this._vm.stateManager.getContractStorage(address, key);
  }

  private _getContractCode(address: Address): Promise<Buffer> {
    return this._vm.stateManager.getContractCode(address);
  }

  private async _callDynamicGas(
    address: Address,
    value: bigint,
    availableGas: bigint,
    memoryGas: bigint,
    callCost: bigint
  ): Promise<bigint> {
    // The available gas is reduced when the address is cold
    if (this._vm._common.gteHardfork("berlin")) {
      const isWarmed = this._vm.eei.isWarmedAddress(address.toBuffer());

      const coldCost =
        this._vm._common.param("gasPrices", "coldaccountaccess") -
        this._vm._common.param("gasPrices", "warmstorageread");

      // This comment is copied verbatim from geth:
      // The WarmStorageReadCostEIP2929 (100) is already deducted in the form of a constant cost, so
      // the cost to charge for cold access, if any, is Cold - Warm
      if (!isWarmed) {
        availableGas -= coldCost;
      }
    }

    let gas = 0n;

    const transfersValue = value !== 0n;
    const addressIsEmpty = await this._isAddressEmpty(address);

    if (transfersValue && addressIsEmpty) {
      gas += this._callNewAccountGas();
    }

    if (transfersValue) {
      gas += this._callValueTransferGas();
    }

    gas += memoryGas;

    gas += this._callGas(availableGas, gas, callCost);

    return gas;
  }

  private _callGas(
    availableGas: bigint,
    base: bigint,
    callCost: bigint
  ): bigint {
    availableGas -= base;

    const gas = availableGas - availableGas / 64n;

    if (callCost > gas) {
      return gas;
    }

    return callCost;
  }

  /**
   * Returns the increase in gas and the number of added words
   */
  private _memoryExpansion(
    currentWords: bigint,
    newSize: bigint
  ): [bigint, bigint] {
    const currentSize = currentWords * 32n;
    const currentWordsLength = (currentSize + 31n) / 32n;
    const newWordsLength = (newSize + 31n) / 32n;

    const wordsDiff = newWordsLength - currentWordsLength;

    if (newSize > currentSize) {
      const newTotalFee = this._memoryFee(newWordsLength);
      const currentTotalFee = this._memoryFee(currentWordsLength);

      const fee = newTotalFee - currentTotalFee;

      return [fee, wordsDiff];
    }

    return [0n, 0n];
  }

  private _getFromStack(stack: string[], count: number): Buffer[] {
    return stack
      .slice(-count)
      .reverse()
      .map((value) => `0x${value}`)
      .map(toBuffer);
  }

  private _memoryFee(words: bigint): bigint {
    const square = words * words;
    const linCoef = words * this._memoryGas();
    const quadCoef = square / this._quadCoeffDiv();
    const newTotalFee = linCoef + quadCoef;

    return newTotalFee;
  }
}

function toWord(b: Buffer): string {
  return b.toString("hex").padStart(64, "0");
}
