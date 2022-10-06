import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";
import debug from "debug";
import { ReturnData } from "../provider/return-data";

import {
  ErrorInferrer,
  instructionToCallstackStackTraceEntry,
  SubmessageData,
} from "./error-inferrer";
import {
  adjustStackTrace,
  stackTraceMayRequireAdjustments,
} from "./mapped-inlined-internal-functions-heuristics";
import {
  DecodedCallMessageTrace,
  DecodedCreateMessageTrace,
  DecodedEvmMessageTrace,
  EvmMessageTrace,
  EvmStep,
  isCreateTrace,
  isDecodedCallTrace,
  isDecodedCreateTrace,
  isEvmStep,
  isPrecompileTrace,
  MessageTrace,
  PrecompileMessageTrace,
} from "./message-trace";
import { Instruction, JumpType } from "./model";
import { Opcode } from "./opcodes";
import {
  SolidityStackTrace,
  SolidityStackTraceEntry,
  StackTraceEntryType,
} from "./solidity-stack-trace";

const log = debug("hardhat:core:hardhat-network:errors:solidity-tracer");

export class SolidityTracer {
  private _errorInferrer = new ErrorInferrer();

  public getStackTrace(
    maybeDecodedMessageTrace: MessageTrace
  ): SolidityStackTrace {
    if (maybeDecodedMessageTrace.error === undefined) {
      log("No error object in trace");
      return [];
    }

    if (isPrecompileTrace(maybeDecodedMessageTrace)) {
      log("Trace is a precompile trace");
      return this._getPrecompileMessageStackTrace(maybeDecodedMessageTrace);
    }

    if (isDecodedCreateTrace(maybeDecodedMessageTrace)) {
      log("Trace is a decoded create trace");
      return this._getCreateMessageStackTrace(maybeDecodedMessageTrace);
    }

    if (isDecodedCallTrace(maybeDecodedMessageTrace)) {
      log("Trace is a decoded call trace");
      return this._getCallMessageStackTrace(maybeDecodedMessageTrace);
    }

    log("Trace is not decoded");
    return this._getUnrecognizedMessageStackTrace(maybeDecodedMessageTrace);
  }

  private _getCallMessageStackTrace(
    trace: DecodedCallMessageTrace
  ): SolidityStackTrace {
    const inferredError =
      this._errorInferrer.inferBeforeTracingCallMessage(trace);

    if (inferredError !== undefined) {
      log("Got an inferred error");
      return inferredError;
    }

    log("No inferred error");
    return this._traceEvmExecution(trace);
  }

  private _getUnrecognizedMessageStackTrace(
    trace: EvmMessageTrace
  ): SolidityStackTrace {
    const subtrace = this._getLastSubtrace(trace);

    if (subtrace !== undefined) {
      // This is not a very exact heuristic, but most of the time it will be right, as solidity
      // reverts if a call fails, and most contracts are in solidity
      if (
        subtrace.error !== undefined &&
        trace.returnData.equals(subtrace.returnData)
      ) {
        let unrecognizedEntry: SolidityStackTraceEntry;

        if (isCreateTrace(trace)) {
          unrecognizedEntry = {
            type: StackTraceEntryType.UNRECOGNIZED_CREATE_CALLSTACK_ENTRY,
          };
        } else {
          unrecognizedEntry = {
            type: StackTraceEntryType.UNRECOGNIZED_CONTRACT_CALLSTACK_ENTRY,
            address: trace.address,
          };
        }

        return [unrecognizedEntry, ...this.getStackTrace(subtrace)];
      }
    }

    if (trace.error?.error === ERROR.CODESIZE_EXCEEDS_MAXIMUM) {
      return [
        {
          type: StackTraceEntryType.CONTRACT_TOO_LARGE_ERROR,
        },
      ];
    }

    const isInvalidOpcodeError = trace.error?.error === ERROR.INVALID_OPCODE;

    if (isCreateTrace(trace)) {
      return [
        {
          type: StackTraceEntryType.UNRECOGNIZED_CREATE_ERROR,
          message: new ReturnData(trace.returnData),
          isInvalidOpcodeError,
        },
      ];
    }

    return [
      {
        type: StackTraceEntryType.UNRECOGNIZED_CONTRACT_ERROR,
        address: trace.address,
        message: new ReturnData(trace.returnData),
        isInvalidOpcodeError,
      },
    ];
  }

  private _getCreateMessageStackTrace(
    trace: DecodedCreateMessageTrace
  ): SolidityStackTrace {
    const inferredError =
      this._errorInferrer.inferBeforeTracingCreateMessage(trace);

    if (inferredError !== undefined) {
      return inferredError;
    }

    return this._traceEvmExecution(trace);
  }

  private _getPrecompileMessageStackTrace(
    trace: PrecompileMessageTrace
  ): SolidityStackTrace {
    return [
      {
        type: StackTraceEntryType.PRECOMPILE_ERROR,
        precompile: trace.precompile,
      },
    ];
  }

  private _traceEvmExecution(
    trace: DecodedEvmMessageTrace
  ): SolidityStackTrace {
    const stackTrace = this._rawTraceEvmExecution(trace);

    if (stackTraceMayRequireAdjustments(stackTrace, trace)) {
      return adjustStackTrace(stackTrace, trace);
    }

    return stackTrace;
  }

  private _rawTraceEvmExecution(
    trace: DecodedEvmMessageTrace
  ): SolidityStackTrace {
    const stacktrace: SolidityStackTrace = [];

    let subtracesSeen = 0;

    // There was a jump into a function according to the sourcemaps
    let jumpedIntoFunction = false;

    // There was a jump into a function, according to the previous opcodes.
    // We have a separate flag for this because each flag is used by different
    // heuristics.
    let enteredFunction = false;

    const functionJumpdests: Instruction[] = [];

    let lastSubmessageData: SubmessageData | undefined;

    for (let stepIndex = 0; stepIndex < trace.steps.length; stepIndex++) {
      const step = trace.steps[stepIndex];
      const nextStep = trace.steps[stepIndex + 1];

      if (isEvmStep(step)) {
        const inst = trace.bytecode.getInstruction(step.pc);

        if (inst.jumpType === JumpType.INTO_FUNCTION) {
          const nextEvmStep = nextStep as EvmStep; // A jump can't be followed by a subtrace
          const nextInst = trace.bytecode.getInstruction(nextEvmStep.pc);

          if (nextInst !== undefined && nextInst.opcode === Opcode.JUMPDEST) {
            stacktrace.push(
              instructionToCallstackStackTraceEntry(trace.bytecode, inst)
            );
            if (nextInst.location !== undefined) {
              jumpedIntoFunction = true;
            }
            functionJumpdests.push(nextInst);
          }
        } else if (inst.jumpType === JumpType.OUTOF_FUNCTION) {
          stacktrace.pop();
          functionJumpdests.pop();
        } else if (inst.opcode === Opcode.JUMPDEST && stepIndex - 4 >= 0) {
          // If we are in a JUMPDEST and there was a "close" PUSH4, we interpret
          // it as having jumped into a function after checking its selector.
          const maybePush4Step = trace.steps[stepIndex - 4];
          if (isEvmStep(maybePush4Step)) {
            const maybePush4Inst = trace.bytecode.getInstruction(
              maybePush4Step.pc
            );
            if (maybePush4Inst.opcode === Opcode.PUSH4) {
              enteredFunction = true;
            }
          }
        }
      } else {
        subtracesSeen += 1;

        // If there are more subtraces, this one didn't terminate the execution
        if (subtracesSeen < trace.numberOfSubtraces) {
          continue;
        }

        const submessageTrace = this.getStackTrace(step);

        lastSubmessageData = {
          messageTrace: step,
          stepIndex,
          stacktrace: submessageTrace,
        };
      }
    }

    const stacktraceWithInferredError = this._errorInferrer.inferAfterTracing(
      trace,
      stacktrace,
      functionJumpdests,
      jumpedIntoFunction,
      enteredFunction,
      lastSubmessageData
    );

    return this._errorInferrer.filterRedundantFrames(
      stacktraceWithInferredError
    );
  }

  private _getLastSubtrace(trace: EvmMessageTrace): MessageTrace | undefined {
    if (trace.numberOfSubtraces < 1) {
      return undefined;
    }

    let i = trace.steps.length - 1;

    while (isEvmStep(trace.steps[i])) {
      i -= 1;
    }

    return trace.steps[i] as MessageTrace;
  }
}
