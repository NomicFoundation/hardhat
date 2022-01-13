"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VMTracer = void 0;
const precompiles_1 = require("@ethereumjs/vm/dist/evm/precompiles");
const ethereumjs_util_1 = require("ethereumjs-util");
const message_trace_1 = require("./message-trace");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
const MAX_PRECOMPILE_NUMBER = Object.keys(precompiles_1.precompiles).length + 1;
const DUMMY_RETURN_DATA = Buffer.from([]);
const DUMMY_GAS_USED = new ethereumjs_util_1.BN(0);
class VMTracer {
    constructor(_vm, _getContractCode, _throwErrors = true) {
        this._vm = _vm;
        this._getContractCode = _getContractCode;
        this._throwErrors = _throwErrors;
        this._messageTraces = [];
        this._enabled = false;
        this._beforeMessageHandler = this._beforeMessageHandler.bind(this);
        this._stepHandler = this._stepHandler.bind(this);
        this._afterMessageHandler = this._afterMessageHandler.bind(this);
    }
    enableTracing() {
        if (this._enabled) {
            return;
        }
        this._vm.on("beforeMessage", this._beforeMessageHandler);
        this._vm.on("step", this._stepHandler);
        this._vm.on("afterMessage", this._afterMessageHandler);
        this._enabled = true;
    }
    disableTracing() {
        if (!this._enabled) {
            return;
        }
        this._vm.removeListener("beforeMessage", this._beforeMessageHandler);
        this._vm.removeListener("step", this._stepHandler);
        this._vm.removeListener("afterMessage", this._afterMessageHandler);
        this._enabled = false;
    }
    get enabled() {
        return this._enabled;
    }
    getLastTopLevelMessageTrace() {
        if (!this._enabled) {
            throw new Error("You can't get a vm trace if the VMTracer is disabled");
        }
        return this._messageTraces[0];
    }
    getLastError() {
        return this._lastError;
    }
    clearLastError() {
        this._lastError = undefined;
    }
    _shouldKeepTracing() {
        return this._throwErrors || this._lastError === undefined;
    }
    async _beforeMessageHandler(message, next) {
        if (!this._shouldKeepTracing()) {
            next();
            return;
        }
        try {
            let trace;
            if (message.depth === 0) {
                this._messageTraces = [];
            }
            if (message.to === undefined) {
                const createTrace = {
                    code: message.data,
                    steps: [],
                    value: message.value,
                    returnData: DUMMY_RETURN_DATA,
                    numberOfSubtraces: 0,
                    depth: message.depth,
                    deployedContract: undefined,
                    gasUsed: DUMMY_GAS_USED,
                };
                trace = createTrace;
            }
            else {
                const toAsBn = new ethereumjs_util_1.BN(message.to.toBuffer());
                if (toAsBn.gtn(0) && toAsBn.lten(MAX_PRECOMPILE_NUMBER)) {
                    const precompileTrace = {
                        precompile: toAsBn.toNumber(),
                        calldata: message.data,
                        value: message.value,
                        returnData: DUMMY_RETURN_DATA,
                        depth: message.depth,
                        gasUsed: DUMMY_GAS_USED,
                    };
                    trace = precompileTrace;
                }
                else {
                    const codeAddress = message.codeAddress;
                    const code = await this._getContractCode(codeAddress);
                    const callTrace = {
                        code,
                        calldata: message.data,
                        steps: [],
                        value: message.value,
                        returnData: DUMMY_RETURN_DATA,
                        address: message.to.toBuffer(),
                        numberOfSubtraces: 0,
                        depth: message.depth,
                        gasUsed: DUMMY_GAS_USED,
                        codeAddress: codeAddress.toBuffer(),
                    };
                    trace = callTrace;
                }
            }
            if (this._messageTraces.length > 0) {
                const parentTrace = this._messageTraces[this._messageTraces.length - 1];
                if ((0, message_trace_1.isPrecompileTrace)(parentTrace)) {
                    throw new Error("This should not happen: message execution started while a precompile was executing");
                }
                parentTrace.steps.push(trace);
                parentTrace.numberOfSubtraces += 1;
            }
            this._messageTraces.push(trace);
            next();
        }
        catch (error) {
            if (this._throwErrors) {
                next(error);
            }
            else {
                this._lastError = error;
                next();
            }
        }
    }
    async _stepHandler(step, next) {
        if (!this._shouldKeepTracing()) {
            next();
            return;
        }
        try {
            const trace = this._messageTraces[this._messageTraces.length - 1];
            if ((0, message_trace_1.isPrecompileTrace)(trace)) {
                throw new Error("This should not happen: step event fired while a precompile was executing");
            }
            trace.steps.push({ pc: step.pc });
            next();
        }
        catch (error) {
            if (this._throwErrors) {
                next(error);
            }
            else {
                this._lastError = error;
                next();
            }
        }
    }
    async _afterMessageHandler(result, next) {
        var _a;
        if (!this._shouldKeepTracing()) {
            next();
            return;
        }
        try {
            const trace = this._messageTraces[this._messageTraces.length - 1];
            trace.error = result.execResult.exceptionError;
            trace.returnData = result.execResult.returnValue;
            trace.gasUsed = result.gasUsed;
            if ((0, message_trace_1.isCreateTrace)(trace)) {
                trace.deployedContract = (_a = result === null || result === void 0 ? void 0 : result.createdAddress) === null || _a === void 0 ? void 0 : _a.toBuffer();
            }
            if (this._messageTraces.length > 1) {
                this._messageTraces.pop();
            }
            next();
        }
        catch (error) {
            if (this._throwErrors) {
                next(error);
            }
            else {
                this._lastError = error;
                next();
            }
        }
    }
}
exports.VMTracer = VMTracer;
//# sourceMappingURL=vm-tracer.js.map