import { MessageTrace } from "./message-trace";
import { SolidityStackTrace } from "./solidity-stack-trace";
export declare const SUPPORTED_SOLIDITY_VERSION_RANGE = "<=0.8.9";
export declare const FIRST_SOLC_VERSION_SUPPORTED = "0.5.1";
export declare class SolidityTracer {
    private _errorInferrer;
    getStackTrace(maybeDecodedMessageTrace: MessageTrace): SolidityStackTrace;
    private _getCallMessageStackTrace;
    private _getUnrecognizedMessageStackTrace;
    private _getCreateMessageStackTrace;
    private _getPrecompileMessageStackTrace;
    private _traceEvmExecution;
    private _rawTraceEvmExecution;
    private _getLastSubtrace;
}
//# sourceMappingURL=solidityTracer.d.ts.map