import type { Common } from "@nomicfoundation/ethereumjs-common";
import {
  CreateOutput,
  TracingMessage,
  TracingMessageResult,
  TracingStep,
} from "rethnet-evm";

import { getActivePrecompiles } from "@nomicfoundation/ethereumjs-evm";
import { Address, bufferToBigInt } from "@nomicfoundation/ethereumjs-util";

import { assertHardhatInvariant } from "../../core/errors";
import { Exit, ExitCode } from "../provider/vm/exit";
import { VMAdapter } from "../provider/vm/vm-adapter";

import {
  CallMessageTrace,
  CreateMessageTrace,
  isCreateTrace,
  isHaltResult,
  isPrecompileTrace,
  isSuccessResult,
  MessageTrace,
  PrecompileMessageTrace,
} from "./message-trace";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

const DUMMY_RETURN_DATA = Buffer.from([]);
const DUMMY_GAS_USED = 0n;

export class VMTracer {
  private _messageTraces: MessageTrace[] = [];
  private _enabled = false;
  private _lastError: Error | undefined;
  private _maxPrecompileNumber;

  constructor(
    private readonly _vm: VMAdapter,
    common: Common,
    private readonly _throwErrors = true
  ) {
    this._beforeMessageHandler = this._beforeMessageHandler.bind(this);
    this._stepHandler = this._stepHandler.bind(this);
    this._afterMessageHandler = this._afterMessageHandler.bind(this);
    this._maxPrecompileNumber = getActivePrecompiles(common).size;
  }

  public enableTracing() {
    if (this._enabled) {
      return;
    }

    this._vm.enableTracing({
      beforeMessage: this._beforeMessageHandler,
      step: this._stepHandler,
      afterMessage: this._afterMessageHandler,
    });

    this._enabled = true;
  }

  public disableTracing() {
    if (!this._enabled) {
      return;
    }

    this._vm.disableTracing();

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

  private async _beforeMessageHandler(message: TracingMessage, next: any) {
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
          exit: new Exit(ExitCode.SUCCESS),
          returnData: DUMMY_RETURN_DATA,
          numberOfSubtraces: 0,
          depth: message.depth,
          deployedContract: undefined,
          gasUsed: DUMMY_GAS_USED,
        };

        trace = createTrace;
      } else {
        const toAsBigInt = bufferToBigInt(message.to);

        if (toAsBigInt > 0 && toAsBigInt <= this._maxPrecompileNumber) {
          const precompileTrace: PrecompileMessageTrace = {
            precompile: Number(toAsBigInt),
            calldata: message.data,
            value: message.value,
            exit: new Exit(ExitCode.SUCCESS),
            returnData: DUMMY_RETURN_DATA,
            depth: message.depth,
            gasUsed: DUMMY_GAS_USED,
          };

          trace = precompileTrace;
        } else {
          const codeAddress = message.codeAddress;

          // if we enter here, then `to` is not undefined, therefore
          // `codeAddress` should be defined
          assertHardhatInvariant(
            codeAddress !== undefined,
            "codeAddress should be defined"
          );

          const code = await this._vm.getContractCode(
            new Address(codeAddress),
            true // ethJsOnly, temporary fix
          );

          const callTrace: CallMessageTrace = {
            code,
            calldata: message.data,
            steps: [],
            value: message.value,
            exit: new Exit(ExitCode.SUCCESS),
            returnData: DUMMY_RETURN_DATA,
            address: message.to,
            numberOfSubtraces: 0,
            depth: message.depth,
            gasUsed: DUMMY_GAS_USED,
            codeAddress,
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

  private async _stepHandler(step: TracingStep, next: any) {
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

      trace.steps.push({ pc: Number(step.pc) });
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

  private async _afterMessageHandler(result: TracingMessageResult, next: any) {
    if (!this._shouldKeepTracing()) {
      next();
      return;
    }

    try {
      const trace = this._messageTraces[this._messageTraces.length - 1];
      trace.gasUsed = result.executionResult.result.gasUsed;

      const executionResult = result.executionResult.result;
      if (isSuccessResult(executionResult)) {
        trace.exit = Exit.fromRethnetSuccessReason(executionResult.reason);
        trace.returnData = executionResult.output.returnValue;

        if (isCreateTrace(trace)) {
          trace.deployedContract = (
            executionResult.output as CreateOutput
          ).address;
        }
      } else if (isHaltResult(executionResult)) {
        trace.exit = Exit.fromRethnetExceptionalHalt(executionResult.reason);
      } else {
        trace.exit = new Exit(ExitCode.REVERT);
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
