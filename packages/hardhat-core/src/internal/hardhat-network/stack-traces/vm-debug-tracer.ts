import VM from "@nomiclabs/ethereumjs-vm";
import { EVMResult } from "@nomiclabs/ethereumjs-vm/dist/evm/evm";
import { InterpreterStep } from "@nomiclabs/ethereumjs-vm/dist/evm/interpreter";
import { Transaction } from "ethereumjs-tx";
import { BN } from "ethereumjs-util";

import { RpcDebugTraceOutput, RpcStructLog } from "../provider/output";

// tslint:disable only-hardhat-error

export class VMDebugTracer {
  private _enabled = false;
  private _structLogs: RpcStructLog[] = [];
  private _lastTrace?: RpcDebugTraceOutput;

  constructor(private readonly _vm: VM) {
    this._beforeTxHandler = this._beforeTxHandler.bind(this);
    this._stepHandler = this._stepHandler.bind(this);
    this._afterTxHandler = this._afterTxHandler.bind(this);
  }

  public enableTracing() {
    if (this._enabled) {
      return;
    }
    this._vm.on("beforeTx", this._beforeTxHandler);
    this._vm.on("step", this._stepHandler);
    this._vm.on("afterTx", this._afterTxHandler);
    this._enabled = true;
  }

  public disableTracing() {
    if (!this._enabled) {
      return;
    }
    this._vm.removeListener("beforeTx", this._beforeTxHandler);
    this._vm.removeListener("step", this._stepHandler);
    this._vm.removeListener("afterTx", this._afterTxHandler);
    this._enabled = false;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public getDebugTrace(): RpcDebugTraceOutput {
    if (this._lastTrace === undefined) {
      throw new Error(
        "No debug trace available. Please run the transaction first"
      );
    }
    return this._lastTrace;
  }

  private async _beforeTxHandler(_tx: Transaction, next: any) {
    this._structLogs = [];
    next();
  }

  private async _stepHandler(step: InterpreterStep, next: any) {
    const structLog = await this._stepToStructLog(step);
    this._structLogs.push(structLog);
    next();
  }

  private async _afterTxHandler(result: EVMResult, next: any) {
    this._lastTrace = {
      gas: result.gasUsed.toNumber(),
      failed: result.execResult.exceptionError !== undefined,
      returnValue: result.execResult.returnValue.toString("hex"),
      structLogs: this._structLogs,
    };
    next();
  }

  private async _stepToStructLog(step: InterpreterStep): Promise<RpcStructLog> {
    return new Promise((resolve) => {
      step.stateManager.dumpStorage(
        step.address,
        async (storage: Record<string, string>) => {
          const mapValues = await require("lodash/mapValues");
          const memory = Buffer.from(step.memory)
            .toString("hex")
            .match(/.{1,64}/g);
          const paddedStorage = mapValues(storage, (storageValue: string) =>
            storageValue.padStart(64, "0")
          );
          const structLog: RpcStructLog = {
            pc: step.pc,
            op: step.opcode.name,
            gas: step.gasLeft.toNumber(),
            gasCost: step.opcode.fee,
            depth: step.depth + 1,
            stack: step.stack
              .slice()
              .map((el: BN) => el.toString("hex").padStart(64, "0")),
            memory: memory === null ? [] : memory,
            storage: paddedStorage,
            memSize: step.memoryWordCount.toNumber(),
          };
          resolve(structLog);
        }
      );
    });
  }
}
