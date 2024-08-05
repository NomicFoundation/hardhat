import type {
  CreateOutput,
  ExecutionResult,
  TracingMessage,
  TracingStep,
} from "@nomicfoundation/edr";

import { bytesToBigInt } from "@nomicfoundation/ethereumjs-util";

import { assertHardhatInvariant } from "../../core/errors";
import { Exit, ExitCode } from "../provider/vm/exit";

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

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

const DUMMY_RETURN_DATA = Buffer.from([]);
const DUMMY_GAS_USED = 0n;

/**
 * Consumes the incoming VM trace events, until an error occurs, to keep track
 * of the last top level message trace/error.
 */
export class VMTracer {
  public tracingSteps: TracingStep[] = [];

  private _messageTraces: MessageTrace[] = [];
  private _lastError: Error | undefined;
  private _maxPrecompileNumber;

  constructor() {
    // TODO: temporarily hardcoded to remove the need of using ethereumjs' common and evm here
    this._maxPrecompileNumber = 10;
  }

  public getLastTopLevelMessageTrace(): MessageTrace | undefined {
    return this._messageTraces[0];
  }

  public getLastError(): Error | undefined {
    return this._lastError;
  }

  private _shouldKeepTracing() {
    return this._lastError === undefined;
  }

  public addBeforeMessage(message: TracingMessage) {
    if (!this._shouldKeepTracing()) {
      return;
    }

    try {
      let trace: MessageTrace;

      if (message.depth === 0) {
        this._messageTraces = [];
        this.tracingSteps = [];
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
        const toAsBigInt = bytesToBigInt(message.to);

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
          // `codeAddress` and `code` should be defined
          assertHardhatInvariant(
            codeAddress !== undefined,
            "codeAddress should be defined"
          );
          assertHardhatInvariant(
            message.code !== undefined,
            "code should be defined"
          );

          const callTrace: CallMessageTrace = {
            code: message.code,
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
    } catch (error) {
      this._lastError = error as Error;
    }
  }

  public addStep(step: TracingStep) {
    if (!this._shouldKeepTracing()) {
      return;
    }

    this.tracingSteps.push(step);

    try {
      const trace = this._messageTraces[this._messageTraces.length - 1];

      if (isPrecompileTrace(trace)) {
        throw new Error(
          "This should not happen: step event fired while a precompile was executing"
        );
      }

      trace.steps.push({ pc: Number(step.pc) });
    } catch (error) {
      this._lastError = error as Error;
    }
  }

  public addAfterMessage(result: ExecutionResult) {
    if (!this._shouldKeepTracing()) {
      return;
    }

    try {
      const trace = this._messageTraces[this._messageTraces.length - 1];
      trace.gasUsed = result.result.gasUsed;

      const executionResult = result.result;
      if (isSuccessResult(executionResult)) {
        trace.exit = Exit.fromEdrSuccessReason(executionResult.reason);
        trace.returnData = executionResult.output.returnValue;

        if (isCreateTrace(trace)) {
          trace.deployedContract = (
            executionResult.output as CreateOutput
          ).address;
        }
      } else if (isHaltResult(executionResult)) {
        trace.exit = Exit.fromEdrExceptionalHalt(executionResult.reason);

        trace.returnData = Buffer.from([]);
      } else {
        trace.exit = new Exit(ExitCode.REVERT);

        trace.returnData = executionResult.output;
      }

      if (this._messageTraces.length > 1) {
        this._messageTraces.pop();
      }
    } catch (error) {
      this._lastError = error as Error;
    }
  }
}
