/* eslint "@typescript-eslint/no-non-null-assertion": "error" */

import { ErrorInferrer as ErrorInferrerRs } from "@nomicfoundation/edr";

import {
  DecodedCallMessageTrace,
  DecodedCreateMessageTrace,
  DecodedEvmMessageTrace,
  MessageTrace,
} from "./message-trace";
import { Instruction } from "./model";
import { SolidityStackTrace } from "./solidity-stack-trace";

export { instructionToCallstackStackTraceEntry } from "@nomicfoundation/edr";

export interface SubmessageData {
  messageTrace: MessageTrace;
  stacktrace: SolidityStackTrace;
  stepIndex: number;
}

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class ErrorInferrer {
  public inferBeforeTracingCallMessage(
    trace: DecodedCallMessageTrace
  ): SolidityStackTrace | undefined {
    return ErrorInferrerRs.inferBeforeTracingCallMessage(trace);
  }

  public inferBeforeTracingCreateMessage(
    trace: DecodedCreateMessageTrace
  ): SolidityStackTrace | undefined {
    return ErrorInferrerRs.inferBeforeTracingCreateMessage(trace);
  }

  public inferAfterTracing(
    trace: DecodedEvmMessageTrace,
    stacktrace: SolidityStackTrace,
    functionJumpdests: Instruction[],
    jumpedIntoFunction: boolean,
    lastSubmessageData: SubmessageData | undefined
  ): SolidityStackTrace {
    const res = ErrorInferrerRs.inferAfterTracing(
      trace,
      stacktrace,
      functionJumpdests,
      jumpedIntoFunction,
      lastSubmessageData
    );

    return (
      ErrorInferrerRs.checkLastSubmessage(
        trace,
        stacktrace,
        lastSubmessageData
      ) ??
      // res ??
      ErrorInferrerRs.checkFailedLastCall(trace, stacktrace) ??
      ErrorInferrerRs.checkLastInstruction(
        trace,
        stacktrace,
        functionJumpdests,
        jumpedIntoFunction
      ) ??
      ErrorInferrerRs.checkNonContractCalled(trace, stacktrace) ??
      ErrorInferrerRs.checkSolidity063UnmappedRevert(trace, stacktrace) ??
      ErrorInferrerRs.checkContractTooLarge(trace) ??
      ErrorInferrerRs.otherExecutionErrorStacktrace(trace, stacktrace)
    );
  }

  public filterRedundantFrames(
    stacktrace: SolidityStackTrace
  ): SolidityStackTrace {
    return ErrorInferrerRs.filterRedundantFrames(stacktrace);
  }
}
