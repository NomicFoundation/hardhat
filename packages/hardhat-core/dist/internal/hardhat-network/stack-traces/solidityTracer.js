"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolidityTracer = exports.FIRST_SOLC_VERSION_SUPPORTED = exports.SUPPORTED_SOLIDITY_VERSION_RANGE = void 0;
const return_data_1 = require("../provider/return-data");
const error_inferrer_1 = require("./error-inferrer");
const mapped_inlined_internal_functions_heuristics_1 = require("./mapped-inlined-internal-functions-heuristics");
const message_trace_1 = require("./message-trace");
const model_1 = require("./model");
const opcodes_1 = require("./opcodes");
const solidity_stack_trace_1 = require("./solidity-stack-trace");
exports.SUPPORTED_SOLIDITY_VERSION_RANGE = "<=0.8.9";
exports.FIRST_SOLC_VERSION_SUPPORTED = "0.5.1";
class SolidityTracer {
    constructor() {
        this._errorInferrer = new error_inferrer_1.ErrorInferrer();
    }
    getStackTrace(maybeDecodedMessageTrace) {
        if (maybeDecodedMessageTrace.error === undefined) {
            return [];
        }
        if ((0, message_trace_1.isPrecompileTrace)(maybeDecodedMessageTrace)) {
            return this._getPrecompileMessageStackTrace(maybeDecodedMessageTrace);
        }
        if ((0, message_trace_1.isDecodedCreateTrace)(maybeDecodedMessageTrace)) {
            return this._getCreateMessageStackTrace(maybeDecodedMessageTrace);
        }
        if ((0, message_trace_1.isDecodedCallTrace)(maybeDecodedMessageTrace)) {
            return this._getCallMessageStackTrace(maybeDecodedMessageTrace);
        }
        return this._getUnrecognizedMessageStackTrace(maybeDecodedMessageTrace);
    }
    _getCallMessageStackTrace(trace) {
        const inferredError = this._errorInferrer.inferBeforeTracingCallMessage(trace);
        if (inferredError !== undefined) {
            return inferredError;
        }
        return this._traceEvmExecution(trace);
    }
    _getUnrecognizedMessageStackTrace(trace) {
        const subtrace = this._getLastSubtrace(trace);
        if (subtrace !== undefined) {
            // This is not a very exact heuristic, but most of the time it will be right, as solidity
            // reverts if a call fails, and most contracts are in solidity
            if (subtrace.error !== undefined &&
                trace.returnData.equals(subtrace.returnData)) {
                let unrecognizedEntry;
                if ((0, message_trace_1.isCreateTrace)(trace)) {
                    unrecognizedEntry = {
                        type: solidity_stack_trace_1.StackTraceEntryType.UNRECOGNIZED_CREATE_CALLSTACK_ENTRY,
                    };
                }
                else {
                    unrecognizedEntry = {
                        type: solidity_stack_trace_1.StackTraceEntryType.UNRECOGNIZED_CONTRACT_CALLSTACK_ENTRY,
                        address: trace.address,
                    };
                }
                return [unrecognizedEntry, ...this.getStackTrace(subtrace)];
            }
        }
        if ((0, message_trace_1.isCreateTrace)(trace)) {
            return [
                {
                    type: solidity_stack_trace_1.StackTraceEntryType.UNRECOGNIZED_CREATE_ERROR,
                    message: new return_data_1.ReturnData(trace.returnData),
                },
            ];
        }
        return [
            {
                type: solidity_stack_trace_1.StackTraceEntryType.UNRECOGNIZED_CONTRACT_ERROR,
                address: trace.address,
                message: new return_data_1.ReturnData(trace.returnData),
            },
        ];
    }
    _getCreateMessageStackTrace(trace) {
        const inferredError = this._errorInferrer.inferBeforeTracingCreateMessage(trace);
        if (inferredError !== undefined) {
            return inferredError;
        }
        return this._traceEvmExecution(trace);
    }
    _getPrecompileMessageStackTrace(trace) {
        return [
            {
                type: solidity_stack_trace_1.StackTraceEntryType.PRECOMPILE_ERROR,
                precompile: trace.precompile,
            },
        ];
    }
    _traceEvmExecution(trace) {
        const stackTrace = this._rawTraceEvmExecution(trace);
        if ((0, mapped_inlined_internal_functions_heuristics_1.stackTraceMayRequireAdjustments)(stackTrace, trace)) {
            return (0, mapped_inlined_internal_functions_heuristics_1.adjustStackTrace)(stackTrace, trace);
        }
        return stackTrace;
    }
    _rawTraceEvmExecution(trace) {
        const stacktrace = [];
        let subtracesSeen = 0;
        let jumpedIntoFunction = false;
        const functionJumpdests = [];
        let lastSubmessageData;
        for (let stepIndex = 0; stepIndex < trace.steps.length; stepIndex++) {
            const step = trace.steps[stepIndex];
            const nextStep = trace.steps[stepIndex + 1];
            if ((0, message_trace_1.isEvmStep)(step)) {
                const inst = trace.bytecode.getInstruction(step.pc);
                if (inst.jumpType === model_1.JumpType.INTO_FUNCTION) {
                    const nextEvmStep = nextStep; // A jump can't be followed by a subtrace
                    const nextInst = trace.bytecode.getInstruction(nextEvmStep.pc);
                    if (nextInst !== undefined && nextInst.opcode === opcodes_1.Opcode.JUMPDEST) {
                        stacktrace.push((0, error_inferrer_1.instructionToCallstackStackTraceEntry)(trace.bytecode, inst));
                        if (nextInst.location !== undefined) {
                            jumpedIntoFunction = true;
                        }
                        functionJumpdests.push(nextInst);
                    }
                }
                else if (inst.jumpType === model_1.JumpType.OUTOF_FUNCTION) {
                    stacktrace.pop();
                    functionJumpdests.pop();
                }
            }
            else {
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
        const stacktraceWithInferredError = this._errorInferrer.inferAfterTracing(trace, stacktrace, functionJumpdests, jumpedIntoFunction, lastSubmessageData);
        return this._errorInferrer.filterRedundantFrames(stacktraceWithInferredError);
    }
    _getLastSubtrace(trace) {
        if (trace.numberOfSubtraces < 1) {
            return undefined;
        }
        let i = trace.steps.length - 1;
        while ((0, message_trace_1.isEvmStep)(trace.steps[i])) {
            i -= 1;
        }
        return trace.steps[i];
    }
}
exports.SolidityTracer = SolidityTracer;
//# sourceMappingURL=solidityTracer.js.map