"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VmTraceDecoder = void 0;
const message_trace_1 = require("./message-trace");
class VmTraceDecoder {
    constructor(_contractsIdentifier) {
        this._contractsIdentifier = _contractsIdentifier;
    }
    tryToDecodeMessageTrace(messageTrace) {
        if ((0, message_trace_1.isPrecompileTrace)(messageTrace)) {
            return messageTrace;
        }
        return Object.assign(Object.assign({}, messageTrace), { bytecode: this._contractsIdentifier.getBytecodeFromMessageTrace(messageTrace), steps: messageTrace.steps.map((s) => (0, message_trace_1.isEvmStep)(s) ? s : this.tryToDecodeMessageTrace(s)) });
    }
    addBytecode(bytecode) {
        this._contractsIdentifier.addBytecode(bytecode);
    }
}
exports.VmTraceDecoder = VmTraceDecoder;
//# sourceMappingURL=vm-trace-decoder.js.map