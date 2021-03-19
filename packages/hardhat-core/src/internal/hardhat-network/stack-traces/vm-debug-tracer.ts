import VM from "@nomiclabs/ethereumjs-vm";
import { EVMResult } from "@nomiclabs/ethereumjs-vm/dist/evm/evm";
import { InterpreterStep } from "@nomiclabs/ethereumjs-vm/dist/evm/interpreter";
import Message from "@nomiclabs/ethereumjs-vm/dist/evm/message";
import { Transaction } from "ethereumjs-tx";
import { BN, setLength, toBuffer } from "ethereumjs-util";

import { assertHardhatInvariant } from "../../core/errors";
import { RpcDebugTracingConfig } from "../provider/input";
import { RpcDebugTraceOutput, RpcStructLog } from "../provider/output";

// tslint:disable only-hardhat-error

type Storage = Record<string, string>;

interface DebugMessage {
  structLogs: Array<RpcStructLog | DebugMessage>;
  storage: Storage;
  to: string;
  result?: EVMResult;
}

type NestedStructLogs = Array<RpcStructLog | NestedStructLogs>;

function isStructLog(
  message: RpcStructLog | DebugMessage | undefined
): message is RpcStructLog {
  return message !== undefined && !("structLogs" in message);
}

export class VMDebugTracer {
  private _enabled = false;
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
   * Run the `cb` callback and trace its execution
   */
  public async trace(
    action: () => Promise<void>,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    try {
      this._enableTracing(config);
      await action();
      return this._getDebugTrace();
    } finally {
      this._disableTracing();
    }
  }

  private _enableTracing(config: RpcDebugTracingConfig) {
    if (this._enabled) {
      return;
    }
    this._vm.on("beforeTx", this._beforeTxHandler);
    this._vm.on("beforeMessage", this._beforeMessageHandler);
    this._vm.on("step", this._stepHandler);
    this._vm.on("afterMessage", this._afterMessageHandler);
    this._vm.on("afterTx", this._afterTxHandler);
    this._enabled = true;
    this._config = config;
  }

  private _disableTracing() {
    if (!this._enabled) {
      return;
    }
    this._vm.removeListener("beforeTx", this._beforeTxHandler);
    this._vm.removeListener("beforeMessage", this._beforeMessageHandler);
    this._vm.removeListener("step", this._stepHandler);
    this._vm.removeListener("afterTx", this._afterTxHandler);
    this._vm.removeListener("afterMessage", this._afterMessageHandler);
    this._enabled = false;
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

  private async _beforeTxHandler(_tx: Transaction, next: any) {
    this._messages = [];
    next();
  }

  private async _beforeMessageHandler(message: Message, next: any) {
    const debugMessage: DebugMessage = {
      structLogs: [],
      storage: {},
      to: message.to?.toString("hex") ?? "",
    };

    if (this._messages.length > 0) {
      const previousMessage = this._messages[this._messages.length - 1];

      previousMessage.structLogs.push(debugMessage);
    }

    this._messages.push(debugMessage);

    next();
  }

  private async _stepHandler(step: InterpreterStep, next: any) {
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
    const _ = await import("lodash");
    const topLevelMessage = this._messages[0];

    const nestedStructLogs = await this._messageToNestedStructLogs(
      topLevelMessage,
      topLevelMessage.to
    );

    const structLogs = _.flattenDeep(nestedStructLogs);

    // geth does this for some reason
    if (result.execResult.exceptionError?.error === "out of gas") {
      structLogs[structLogs.length - 1].error = {};
    }

    this._lastTrace = {
      gas: result.gasUsed.toNumber(),
      failed: result.execResult.exceptionError !== undefined,
      returnValue: result.execResult.returnValue.toString("hex"),
      structLogs,
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
        const structLog: RpcStructLog = messageOrStructLog;

        nestedStructLogs.push(structLog);

        // update the storage of the current address
        if (structLog.storage !== undefined) {
          const addressStorage = this._addressToStorage[address] ?? {};
          structLog.storage = {
            ...addressStorage,
            ...structLog.storage,
          };
          this._addressToStorage[address] = {
            ...structLog.storage,
          };
        }

        // reverts have tobe handled like this because they don't
        // have a next step
        if (structLog.op === "REVERT") {
          if (structLog.memory !== undefined && structLog.stack !== undefined) {
            const [lengthHex, offsetHex] = structLog.stack.slice(-2);
            const length = new BN(toBuffer(`0x${lengthHex}`));
            const offset = new BN(toBuffer(`0x${offsetHex}`));
            if (length.add(offset).gtn(structLog.memory.length * 32)) {
              structLog.memory.push("0".repeat(64));
              structLog.gasCost = 3;
            }
          }
        }

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

        if (
          structLog.op !== "REVERT" &&
          structLog.memory !== undefined &&
          previousStructLog.memory !== undefined
        ) {
          const memoryLengthDifference =
            structLog.memory.length - previousStructLog.memory.length;
          for (let k = 0; k < memoryLengthDifference; k++) {
            previousStructLog.memory.push("0".repeat(64));
          }
        }
      } else {
        const subMessage: DebugMessage = messageOrStructLog;

        const lastStructLog = nestedStructLogs[
          nestedStructLogs.length - 1
        ] as RpcStructLog;

        assertHardhatInvariant(
          !Array.isArray(lastStructLog),
          "There shouldn't be two messages one after another"
        );

        const isDelegateCall = lastStructLog.op === "DELEGATECALL";
        const isCall = lastStructLog.op === "CALL";

        const messageNestedStructLogs = await this._messageToNestedStructLogs(
          subMessage,
          isDelegateCall ? address : subMessage.to
        );

        const nextStructLog = message.structLogs[i + 1] as RpcStructLog;

        const isPrecompile =
          subMessage.to === "0000000000000000000000000000000000000001";

        const assignedGasHex = lastStructLog.stack.slice(-1)[0];
        const assignedGas = new BN(toBuffer(`0x${assignedGasHex}`));

        const gasDifference = lastStructLog.gas - nextStructLog.gas;

        if (isPrecompile) {
          lastStructLog.gasCost += assignedGas.toNumber();
        } else {
          // TODO
        }

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

    if (step.memoryWordCount.toNumber() > result.length) {
      const wordsToAdd = step.memoryWordCount.toNumber() - result.length;
      for (let i = 0; i < wordsToAdd; i++) {
        result.push("0".repeat(64));
      }
    }

    return result;
  }

  private _getStack(step: InterpreterStep): string[] {
    const stack = step.stack
      .slice()
      .map((el: BN) => el.toString("hex").padStart(64, "0"));
    return stack;
  }

  private async _stepToStructLog(step: InterpreterStep): Promise<RpcStructLog> {
    const memory = this._getMemory(step);

    const gasCost = step.opcode.fee;

    const storage: Storage = {};

    if (step.opcode.name === "SLOAD" && step.stack.length >= 1) {
      const address = step.address;
      const key = setLength(toBuffer(step.stack[step.stack.length - 1]), 32);

      const storageValue = await new Promise<Buffer>((resolve, reject) => {
        step.stateManager.getContractStorage(
          address,
          key,
          (err: Error | null, result: Buffer) => {
            if (err !== null) {
              return reject(result);
            }

            return resolve(result);
          }
        );
      });

      storage[key.toString("hex").padStart(64, "0")] = storageValue
        .toString("hex")
        .padStart(64, "0");
    } else if (step.opcode.name === "SSTORE" && step.stack.length >= 2) {
      const key = toBuffer(step.stack[step.stack.length - 1]);
      const storageValue = toBuffer(step.stack[step.stack.length - 2]);

      storage[key.toString("hex").padStart(64, "0")] = storageValue
        .toString("hex")
        .padStart(64, "0");
    }

    const structLog: RpcStructLog = {
      pc: step.pc,
      op: step.opcode.name,
      gas: step.gasLeft.toNumber(),
      gasCost,
      depth: step.depth + 1,
      stack: this._getStack(step),
      memory,
      storage,
      // memSize: step.memoryWordCount.toNumber(),
    };

    return structLog;
  }
}
