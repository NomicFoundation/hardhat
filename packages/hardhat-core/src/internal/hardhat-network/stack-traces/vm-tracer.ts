import { EVM, EVMResult } from "@ethereumjs/evm";
import { InterpreterStep } from "@ethereumjs/evm/dist/interpreter";
import { Message } from "@ethereumjs/evm/dist/message";
import { precompiles } from "@ethereumjs/evm/dist/precompiles";
import { Address, bufferToBigInt } from "@ethereumjs/util";
import { VM } from "@ethereumjs/vm";

import {
  CallMessageTrace,
  CreateMessageTrace,
  isCreateTrace,
  isPrecompileTrace,
  MessageTrace,
  PrecompileMessageTrace,
} from "./message-trace";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

// ETHJSTODO: can we use getActivePrecompiles here? If not, ask the ethjs
// team to export `precompiles` in index
const MAX_PRECOMPILE_NUMBER = Object.keys(precompiles).length + 1;
const DUMMY_RETURN_DATA = Buffer.from([]);
const DUMMY_GAS_USED = 0n;

export class VMTracer {
  private _messageTraces: MessageTrace[] = [];
  private _enabled = false;
  private _lastError: Error | undefined;

  constructor(
    private readonly _vm: VM,
    private readonly _getContractCode: (address: Address) => Promise<Buffer>,
    private readonly _throwErrors = true
  ) {
    this._beforeMessageHandler = this._beforeMessageHandler.bind(this);
    this._stepHandler = this._stepHandler.bind(this);
    this._afterMessageHandler = this._afterMessageHandler.bind(this);
  }

  public enableTracing() {
    if (this._enabled) {
      return;
    }
    (this._vm.evm as EVM).on("beforeMessage", this._beforeMessageHandler);
    (this._vm.evm as EVM).on("step", this._stepHandler);
    (this._vm.evm as EVM).on("afterMessage", this._afterMessageHandler);
    this._enabled = true;
  }

  public disableTracing() {
    if (!this._enabled) {
      return;
    }
    (this._vm.evm as EVM).removeListener(
      "beforeMessage",
      this._beforeMessageHandler
    );
    (this._vm.evm as EVM).removeListener("step", this._stepHandler);
    (this._vm.evm as EVM).removeListener(
      "afterMessage",
      this._afterMessageHandler
    );
    this._enabled = false;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public getLastTopLevelMessageTrace(): MessageTrace | undefined {
    if (!this._enabled) {
      throw new Error("You can't get a vm trace if the VMTracer is disabled");
    }

    return this._messageTraces[0];
  }

  public getLastError(): Error | undefined {
    return this._lastError;
  }

  public clearLastError() {
    this._lastError = undefined;
  }

  private _shouldKeepTracing() {
    return this._throwErrors || this._lastError === undefined;
  }

  private async _beforeMessageHandler(message: Message, next: any) {
    if (!this._shouldKeepTracing()) {
      next();
      return;
    }

    try {
      let trace: MessageTrace;

      if (message.depth === 0) {
        this._messageTraces = [];
      }

      if (message.to === undefined) {
        const createTrace: CreateMessageTrace = {
          code: message.data,
          steps: [],
          value: message.value,
          returnData: DUMMY_RETURN_DATA,
          numberOfSubtraces: 0,
          depth: message.depth,
          deployedContract: undefined,
          gasUsed: DUMMY_GAS_USED,
        };

        trace = createTrace;
      } else {
        const toAsNumber = bufferToBigInt(message.to.toBuffer());

        if (toAsNumber > 0 && toAsNumber <= MAX_PRECOMPILE_NUMBER) {
          const precompileTrace: PrecompileMessageTrace = {
            precompile: Number(toAsNumber),
            calldata: message.data,
            value: message.value,
            returnData: DUMMY_RETURN_DATA,
            depth: message.depth,
            gasUsed: DUMMY_GAS_USED,
          };

          trace = precompileTrace;
        } else {
          const codeAddress = message.codeAddress;

          const code = await this._getContractCode(codeAddress);

          const callTrace: CallMessageTrace = {
            code,
            calldata: message.data,
            steps: [],
            value: message.value,
            returnData: DUMMY_RETURN_DATA,
            address: message.to.toBuffer(),
            numberOfSubtraces: 0,
            depth: message.depth,
            gasUsed: DUMMY_GAS_USED,
            codeAddress: codeAddress.toBuffer(),
          };

          trace = callTrace;
        }
      }

      if (this._messageTraces.length > 0) {
        const parentTrace = this._messageTraces[this._messageTraces.length - 1];

        if (isPrecompileTrace(parentTrace)) {
          throw new Error(
            "This should not happen: message execution started while a precompile was executing"
          );
        }

        parentTrace.steps.push(trace);
        parentTrace.numberOfSubtraces += 1;
      }

      this._messageTraces.push(trace);
      next();
    } catch (error) {
      if (this._throwErrors) {
        next(error);
      } else {
        this._lastError = error as Error;
        next();
      }
    }
  }

  private async _stepHandler(step: InterpreterStep, next: any) {
    if (!this._shouldKeepTracing()) {
      next();
      return;
    }

    try {
      const trace = this._messageTraces[this._messageTraces.length - 1];

      if (isPrecompileTrace(trace)) {
        throw new Error(
          "This should not happen: step event fired while a precompile was executing"
        );
      }

      trace.steps.push({ pc: step.pc });
      next();
    } catch (error) {
      if (this._throwErrors) {
        next(error);
      } else {
        this._lastError = error as Error;
        next();
      }
    }
  }

  private async _afterMessageHandler(result: EVMResult, next: any) {
    if (!this._shouldKeepTracing()) {
      next();
      return;
    }

    try {
      const trace = this._messageTraces[this._messageTraces.length - 1];

      trace.error = result.execResult.exceptionError;
      trace.returnData = result.execResult.returnValue;
      // ETHJSTODO double-check
      trace.gasUsed = result.execResult.executionGasUsed;

      if (isCreateTrace(trace)) {
        trace.deployedContract = result?.createdAddress?.toBuffer();
      }

      if (this._messageTraces.length > 1) {
        this._messageTraces.pop();
      }

      next();
    } catch (error) {
      if (this._throwErrors) {
        next(error);
      } else {
        this._lastError = error as Error;
        next();
      }
    }
  }
}
