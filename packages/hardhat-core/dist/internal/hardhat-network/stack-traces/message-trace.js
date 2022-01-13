"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEvmStep = exports.isDecodedCallTrace = exports.isCallTrace = exports.isDecodedCreateTrace = exports.isCreateTrace = exports.isPrecompileTrace = void 0;
function isPrecompileTrace(trace) {
    return "precompile" in trace;
}
exports.isPrecompileTrace = isPrecompileTrace;
function isCreateTrace(trace) {
    return "code" in trace && !isCallTrace(trace);
}
exports.isCreateTrace = isCreateTrace;
function isDecodedCreateTrace(trace) {
    return isCreateTrace(trace) && trace.bytecode !== undefined;
}
exports.isDecodedCreateTrace = isDecodedCreateTrace;
function isCallTrace(trace) {
    return "code" in trace && "calldata" in trace;
}
exports.isCallTrace = isCallTrace;
function isDecodedCallTrace(trace) {
    return isCallTrace(trace) && trace.bytecode !== undefined;
}
exports.isDecodedCallTrace = isDecodedCallTrace;
function isEvmStep(step) {
    return "pc" in step && step.pc !== undefined;
}
exports.isEvmStep = isEvmStep;
//# sourceMappingURL=message-trace.js.map