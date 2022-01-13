/// <reference types="node" />
import type { VmError } from "@ethereumjs/vm/dist/exceptions";
import type { BN } from "ethereumjs-util";
import type { Bytecode } from "./model";
export declare type MessageTrace = CreateMessageTrace | CallMessageTrace | PrecompileMessageTrace;
export declare type EvmMessageTrace = CreateMessageTrace | CallMessageTrace;
export declare type DecodedEvmMessageTrace = DecodedCreateMessageTrace | DecodedCallMessageTrace;
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
export declare function isPrecompileTrace(trace: MessageTrace): trace is PrecompileMessageTrace;
export declare function isCreateTrace(trace: MessageTrace): trace is CreateMessageTrace;
export declare function isDecodedCreateTrace(trace: MessageTrace): trace is DecodedCreateMessageTrace;
export declare function isCallTrace(trace: MessageTrace): trace is CallMessageTrace;
export declare function isDecodedCallTrace(trace: MessageTrace): trace is DecodedCallMessageTrace;
export declare function isEvmStep(step: MessageTraceStep): step is EvmStep;
export declare type MessageTraceStep = MessageTrace | EvmStep;
export interface EvmStep {
    pc: number;
}
//# sourceMappingURL=message-trace.d.ts.map