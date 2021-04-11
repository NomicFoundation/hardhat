import type { VmError } from "@ethereumjs/vm/dist/exceptions";
import type { BN } from "ethereumjs-util";

import type { Bytecode } from "./model";

export type MessageTrace =
  | CreateMessageTrace
  | CallMessageTrace
  | PrecompileMessageTrace;

export type EvmMessageTrace = CreateMessageTrace | CallMessageTrace;

export type DecodedEvmMessageTrace =
  | DecodedCreateMessageTrace
  | DecodedCallMessageTrace;

export interface BaseMessageTrace {
  value: BN;
  returnData: Buffer;
  error?: VmError;
  gasUsed: BN;
  depth: number;
}

export interface PrecompileMessageTrace extends BaseMessageTrace {
  precompile: number;
  calldata: Buffer;
}

export interface BaseEvmMessageTrace extends BaseMessageTrace {
  code: Buffer;
  value: BN;
  returnData: Buffer;
  error?: VmError;
  steps: MessageTraceStep[];
  bytecode?: Bytecode;
  // The following is just an optimization: When processing this traces it's useful to know ahead of
  // time how many subtraces there are.
  numberOfSubtraces: number;
}

export interface CreateMessageTrace extends BaseEvmMessageTrace {
  deployedContract: Buffer | undefined;
}

export interface CallMessageTrace extends BaseEvmMessageTrace {
  calldata: Buffer;
  address: Buffer;
}

export interface DecodedCreateMessageTrace extends CreateMessageTrace {
  bytecode: Bytecode;
}

export interface DecodedCallMessageTrace extends CallMessageTrace {
  bytecode: Bytecode;
}

export function isPrecompileTrace(
  trace: MessageTrace
): trace is PrecompileMessageTrace {
  return "precompile" in trace;
}

export function isCreateTrace(
  trace: MessageTrace
): trace is CreateMessageTrace {
  return "code" in trace && !isCallTrace(trace);
}

export function isDecodedCreateTrace(
  trace: MessageTrace
): trace is DecodedCreateMessageTrace {
  return isCreateTrace(trace) && trace.bytecode !== undefined;
}

export function isCallTrace(trace: MessageTrace): trace is CallMessageTrace {
  return "code" in trace && "calldata" in trace;
}

export function isDecodedCallTrace(
  trace: MessageTrace
): trace is DecodedCallMessageTrace {
  return isCallTrace(trace) && trace.bytecode !== undefined;
}

export function isEvmStep(step: MessageTraceStep): step is EvmStep {
  return "pc" in step && step.pc !== undefined;
}

export type MessageTraceStep = MessageTrace | EvmStep;

export interface EvmStep {
  pc: number;
}
