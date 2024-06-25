import type { Bytecode } from "./model";
import type {
  CallOutput,
  CreateOutput,
  HaltResult,
  RevertResult,
  SuccessResult,
  PrecompileMessageTrace,
  CreateMessageTrace,
  CallMessageTrace,
} from "@nomicfoundation/edr";

export { PrecompileMessageTrace, CreateMessageTrace, CallMessageTrace };

export type MessageTrace =
  | CreateMessageTrace
  | CallMessageTrace
  | PrecompileMessageTrace;

export type EvmMessageTrace = CreateMessageTrace | CallMessageTrace;

export type DecodedEvmMessageTrace =
  | DecodedCreateMessageTrace
  | DecodedCallMessageTrace;

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

export function isCallOutput(
  output: CallOutput | CreateOutput
): output is CallOutput {
  return !isCreateOutput(output);
}

export function isCreateOutput(
  output: CallOutput | CreateOutput
): output is CreateOutput {
  return "address" in output;
}

export function isSuccessResult(
  result: SuccessResult | RevertResult | HaltResult
): result is SuccessResult {
  // Only need to check for one unique field
  return "gasRefunded" in result;
}

export function isRevertResult(
  result: SuccessResult | RevertResult | HaltResult
): result is RevertResult {
  return !("reason" in result);
}

export function isHaltResult(
  result: SuccessResult | RevertResult | HaltResult
): result is HaltResult {
  return !("output" in result);
}
