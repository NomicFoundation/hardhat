import type { Bytecode } from "./model";
import type { Exit } from "../provider/vm/exit";
import {
  CallOutput,
  CreateOutput,
  HaltResult,
  RevertResult,
  SuccessResult,
} from "rethnet-evm";

export type MessageTrace =
  | CreateMessageTrace
  | CallMessageTrace
  | PrecompileMessageTrace;

export type EvmMessageTrace = CreateMessageTrace | CallMessageTrace;

export type DecodedEvmMessageTrace =
  | DecodedCreateMessageTrace
  | DecodedCallMessageTrace;

export interface BaseMessageTrace {
  value: bigint;
  returnData: Buffer;
  exit: Exit;
  gasUsed: bigint;
  depth: number;
}

export interface PrecompileMessageTrace extends BaseMessageTrace {
  precompile: number;
  calldata: Buffer;
}

export interface BaseEvmMessageTrace extends BaseMessageTrace {
  code: Buffer;
  value: bigint;
  returnData: Buffer;
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
  codeAddress: Buffer;
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
  return !("logs" in result);
}
