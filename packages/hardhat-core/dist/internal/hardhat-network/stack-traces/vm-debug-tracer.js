"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VMDebugTracer = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const errors_1 = require("../../core/errors");
const errors_2 = require("../../core/providers/errors");
function isStructLog(message) {
    return message !== undefined && !("structLogs" in message);
}
const EMPTY_MEMORY_WORD = "0".repeat(64);
class VMDebugTracer {
    constructor(_vm) {
        this._vm = _vm;
        this._messages = [];
        this._addressToStorage = {};
        this._beforeMessageHandler = this._beforeMessageHandler.bind(this);
        this._afterMessageHandler = this._afterMessageHandler.bind(this);
        this._beforeTxHandler = this._beforeTxHandler.bind(this);
        this._stepHandler = this._stepHandler.bind(this);
        this._afterTxHandler = this._afterTxHandler.bind(this);
    }
    /**
     * Run the `action` callback and trace its execution
     */
    async trace(action, config) {
        try {
            this._enableTracing(config);
            this._config = config;
            await action();
            return this._getDebugTrace();
        }
        finally {
            this._disableTracing();
        }
    }
    _enableTracing(config) {
        this._vm.on("beforeTx", this._beforeTxHandler);
        this._vm.on("beforeMessage", this._beforeMessageHandler);
        this._vm.on("step", this._stepHandler);
        this._vm.on("afterMessage", this._afterMessageHandler);
        this._vm.on("afterTx", this._afterTxHandler);
        this._config = config;
    }
    _disableTracing() {
        this._vm.removeListener("beforeTx", this._beforeTxHandler);
        this._vm.removeListener("beforeMessage", this._beforeMessageHandler);
        this._vm.removeListener("step", this._stepHandler);
        this._vm.removeListener("afterTx", this._afterTxHandler);
        this._vm.removeListener("afterMessage", this._afterMessageHandler);
        this._config = undefined;
    }
    _getDebugTrace() {
        if (this._lastTrace === undefined) {
            throw new Error("No debug trace available. Please run the transaction first");
        }
        return this._lastTrace;
    }
    async _beforeTxHandler(_tx, next) {
        this._lastTrace = undefined;
        this._messages = [];
        this._addressToStorage = {};
        next();
    }
    async _beforeMessageHandler(message, next) {
        var _a, _b;
        const debugMessage = {
            structLogs: [],
            to: (_b = (_a = message.to) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
        };
        if (this._messages.length > 0) {
            const previousMessage = this._messages[this._messages.length - 1];
            previousMessage.structLogs.push(debugMessage);
        }
        this._messages.push(debugMessage);
        next();
    }
    async _stepHandler(step, next) {
        (0, errors_1.assertHardhatInvariant)(this._messages.length > 0, "Step handler should be called after at least one beforeMessage handler");
        const structLog = await this._stepToStructLog(step);
        this._messages[this._messages.length - 1].structLogs.push(structLog);
        next();
    }
    async _afterMessageHandler(result, next) {
        const lastMessage = this._messages[this._messages.length - 1];
        lastMessage.result = result;
        if (this._messages.length > 1) {
            this._messages.pop();
        }
        next();
    }
    async _afterTxHandler(result, next) {
        var _a;
        const { default: flattenDeep } = await Promise.resolve().then(() => __importStar(require("lodash/flattenDeep")));
        const topLevelMessage = this._messages[0];
        const nestedStructLogs = await this._messageToNestedStructLogs(topLevelMessage, topLevelMessage.to);
        const rpcStructLogs = flattenDeep(nestedStructLogs).map((structLog) => {
            var _a, _b, _c;
            const rpcStructLog = structLog;
            // geth doesn't return this value
            delete rpcStructLog.memSize;
            if (((_a = this._config) === null || _a === void 0 ? void 0 : _a.disableMemory) === true) {
                delete rpcStructLog.memory;
            }
            if (((_b = this._config) === null || _b === void 0 ? void 0 : _b.disableStack) === true) {
                delete rpcStructLog.stack;
            }
            if (((_c = this._config) === null || _c === void 0 ? void 0 : _c.disableStorage) === true) {
                delete rpcStructLog.storage;
            }
            return rpcStructLog;
        });
        // geth does this for some reason
        if (((_a = result.execResult.exceptionError) === null || _a === void 0 ? void 0 : _a.error) === "out of gas") {
            rpcStructLogs[rpcStructLogs.length - 1].error = {};
        }
        this._lastTrace = {
            gas: result.gasUsed.toNumber(),
            failed: result.execResult.exceptionError !== undefined,
            returnValue: result.execResult.returnValue.toString("hex"),
            structLogs: rpcStructLogs,
        };
        next();
    }
    async _messageToNestedStructLogs(message, address) {
        var _a;
        const nestedStructLogs = [];
        for (const [i, messageOrStructLog] of message.structLogs.entries()) {
            if (isStructLog(messageOrStructLog)) {
                const structLog = messageOrStructLog;
                nestedStructLogs.push(structLog);
                // update the storage of the current address
                const addressStorage = (_a = this._addressToStorage[address]) !== null && _a !== void 0 ? _a : {};
                structLog.storage = Object.assign(Object.assign({}, addressStorage), structLog.storage);
                this._addressToStorage[address] = Object.assign({}, structLog.storage);
                // sometimes the memSize has the correct value
                // for the memory length, in those cases we increase
                // the memory to reflect this
                if (structLog.memSize > structLog.memory.length) {
                    const wordsToAdd = structLog.memSize - structLog.memory.length;
                    for (let k = 0; k < wordsToAdd; k++) {
                        structLog.memory.push(EMPTY_MEMORY_WORD);
                    }
                }
                if (i === 0) {
                    continue;
                }
                let previousStructLog = nestedStructLogs[nestedStructLogs.length - 2];
                if (Array.isArray(previousStructLog)) {
                    previousStructLog = nestedStructLogs[nestedStructLogs.length - 3];
                }
                else {
                    // if the previous log is not a message, we update its gasCost
                    // using the gas difference between both steps
                    previousStructLog.gasCost = previousStructLog.gas - structLog.gas;
                }
                (0, errors_1.assertHardhatInvariant)(!Array.isArray(previousStructLog), "There shouldn't be two messages one after another");
                // the increase in memory size of a revert is immediately
                // reflected, so we don't treat it as a memory expansion
                // of the previous step
                if (structLog.op !== "REVERT") {
                    const memoryLengthDifference = structLog.memory.length - previousStructLog.memory.length;
                    for (let k = 0; k < memoryLengthDifference; k++) {
                        previousStructLog.memory.push(EMPTY_MEMORY_WORD);
                    }
                }
            }
            else {
                const subMessage = messageOrStructLog;
                const lastStructLog = nestedStructLogs[nestedStructLogs.length - 1];
                (0, errors_1.assertHardhatInvariant)(!Array.isArray(lastStructLog), "There shouldn't be two messages one after another");
                const isDelegateCall = lastStructLog.op === "DELEGATECALL";
                const messageNestedStructLogs = await this._messageToNestedStructLogs(subMessage, isDelegateCall ? address : subMessage.to);
                nestedStructLogs.push(messageNestedStructLogs);
            }
        }
        return nestedStructLogs;
    }
    _getMemory(step) {
        const memory = Buffer.from(step.memory)
            .toString("hex")
            .match(/.{1,64}/g);
        const result = memory === null ? [] : [...memory];
        return result;
    }
    _getStack(step) {
        const stack = step.stack
            .slice()
            .map((el) => el.toString("hex").padStart(64, "0"));
        return stack;
    }
    async _stepToStructLog(step) {
        const memory = this._getMemory(step);
        const stack = this._getStack(step);
        let gasCost = step.opcode.fee;
        let op = step.opcode.name;
        let error;
        const storage = {};
        if (step.opcode.name === "SLOAD") {
            const address = step.address;
            const [keyBuffer] = this._getFromStack(stack, 1);
            const key = (0, ethereumjs_util_1.setLengthLeft)(keyBuffer, 32);
            const storageValue = await this._getContractStorage(address, key);
            storage[toWord(key)] = toWord(storageValue);
        }
        else if (step.opcode.name === "SSTORE") {
            const [keyBuffer, valueBuffer] = this._getFromStack(stack, 2);
            const key = toWord(keyBuffer);
            const storageValue = toWord(valueBuffer);
            storage[key] = storageValue;
        }
        else if (step.opcode.name === "REVERT") {
            const [offsetBuffer, lengthBuffer] = this._getFromStack(stack, 2);
            const length = new ethereumjs_util_1.BN(lengthBuffer);
            const offset = new ethereumjs_util_1.BN(offsetBuffer);
            const [gasIncrease, addedWords] = this._memoryExpansion(memory.length, length.add(offset));
            gasCost += gasIncrease;
            for (let i = 0; i < addedWords; i++) {
                memory.push(EMPTY_MEMORY_WORD);
            }
        }
        else if (step.opcode.name === "CREATE2") {
            const [, , memoryUsedBuffer] = this._getFromStack(stack, 3);
            const memoryUsed = new ethereumjs_util_1.BN(memoryUsedBuffer);
            const sha3ExtraCost = divUp(memoryUsed, 32)
                .muln(this._sha3WordGas())
                .toNumber();
            gasCost += sha3ExtraCost;
        }
        else if (step.opcode.name === "CALL" ||
            step.opcode.name === "STATICCALL" ||
            step.opcode.name === "DELEGATECALL") {
            // this is a port of what geth does to compute the
            // gasCost of a *CALL step, with some simplifications
            // because we don't support pre-spuriousDragon hardforks
            let valueBuffer = Buffer.from([]);
            let [callCostBuffer, recipientAddressBuffer, inBuffer, inSizeBuffer, outBuffer, outSizeBuffer,] = this._getFromStack(stack, 6);
            // CALL has 7 parameters
            if (step.opcode.name === "CALL") {
                [
                    callCostBuffer,
                    recipientAddressBuffer,
                    valueBuffer,
                    inBuffer,
                    inSizeBuffer,
                    outBuffer,
                    outSizeBuffer,
                ] = this._getFromStack(stack, 7);
            }
            const callCost = new ethereumjs_util_1.BN(callCostBuffer);
            const value = new ethereumjs_util_1.BN(valueBuffer);
            const memoryLength = memory.length;
            const inBN = new ethereumjs_util_1.BN(inBuffer);
            const inSizeBN = new ethereumjs_util_1.BN(inSizeBuffer);
            const inPosition = inSizeBN.isZero() ? inSizeBN : inBN.add(inSizeBN);
            const outBN = new ethereumjs_util_1.BN(outBuffer);
            const outSizeBN = new ethereumjs_util_1.BN(outSizeBuffer);
            const outPosition = outSizeBN.isZero() ? outSizeBN : outBN.add(outSizeBN);
            const memSize = inPosition.gt(outPosition) ? inPosition : outPosition;
            const toAddress = new ethereumjs_util_1.Address(recipientAddressBuffer.slice(-20));
            const constantGas = this._callConstantGas();
            const availableGas = step.gasLeft.toNumber() - constantGas;
            const [memoryGas] = this._memoryExpansion(memoryLength, memSize);
            const dynamicGas = await this._callDynamicGas(toAddress, value, availableGas, memoryGas, callCost);
            gasCost = constantGas + dynamicGas;
        }
        else if (step.opcode.name === "CALLCODE") {
            // finding an existing tx that uses CALLCODE or compiling a contract
            // so that it uses tihs opcode is hard,
            // so we just throw
            throw new errors_2.InvalidInputError("Transactions that use CALLCODE are not supported by Hardhat's debug_traceTransaction");
        }
        else if (step.opcode.name === "INVALID") {
            const code = await this._getContractCode(step.codeAddress);
            const opcodeHex = code[step.pc].toString(16);
            op = `opcode 0x${opcodeHex} not defined`;
            error = {};
        }
        const structLog = {
            pc: step.pc,
            op,
            gas: step.gasLeft.toNumber(),
            gasCost,
            depth: step.depth + 1,
            stack,
            memory,
            storage,
            memSize: step.memoryWordCount.toNumber(),
        };
        if (error !== undefined) {
            structLog.error = error;
        }
        return structLog;
    }
    _memoryGas() {
        return this._vm._common.param("gasPrices", "memory");
    }
    _sha3WordGas() {
        return this._vm._common.param("gasPrices", "sha3Word");
    }
    _callConstantGas() {
        if (this._vm._common.gteHardfork("berlin")) {
            return this._vm._common.param("gasPrices", "warmstorageread");
        }
        return this._vm._common.param("gasPrices", "call");
    }
    _callNewAccountGas() {
        return this._vm._common.param("gasPrices", "callNewAccount");
    }
    _callValueTransferGas() {
        return this._vm._common.param("gasPrices", "callValueTransfer");
    }
    _quadCoeffDiv() {
        return this._vm._common.param("gasPrices", "quadCoeffDiv");
    }
    _isAddressEmpty(address) {
        return this._vm.stateManager.accountIsEmpty(address);
    }
    _getContractStorage(address, key) {
        return this._vm.stateManager.getContractStorage(address, key);
    }
    _getContractCode(address) {
        return this._vm.stateManager.getContractCode(address);
    }
    async _callDynamicGas(address, value, availableGas, memoryGas, callCost) {
        // The available gas is reduced when the address is cold
        if (this._vm._common.gteHardfork("berlin")) {
            const stateManager = this._vm.stateManager;
            (0, errors_1.assertHardhatInvariant)("isWarmedAddress" in stateManager, "The VM should have an EIP2929StateManger when berlin is enabled");
            const isWarmed = stateManager.isWarmedAddress(address.toBuffer());
            const coldCost = this._vm._common.param("gasPrices", "coldaccountaccess") -
                this._vm._common.param("gasPrices", "warmstorageread");
            // This comment is copied verbatim from geth:
            // The WarmStorageReadCostEIP2929 (100) is already deducted in the form of a constant cost, so
            // the cost to charge for cold access, if any, is Cold - Warm
            if (!isWarmed) {
                availableGas -= coldCost;
            }
        }
        let gas = 0;
        const transfersValue = !value.isZero();
        const addressIsEmpty = await this._isAddressEmpty(address);
        if (transfersValue && addressIsEmpty) {
            gas += this._callNewAccountGas();
        }
        if (transfersValue) {
            gas += this._callValueTransferGas();
        }
        gas += memoryGas;
        gas += this._callGas(availableGas, gas, callCost);
        return gas;
    }
    _callGas(availableGas, base, callCost) {
        availableGas -= base;
        const gas = availableGas - Math.floor(availableGas / 64);
        if (callCost.gtn(gas)) {
            return gas;
        }
        return callCost.toNumber();
    }
    /**
     * Returns the increase in gas and the number of added words
     */
    _memoryExpansion(currentWords, newSize) {
        const currentSize = new ethereumjs_util_1.BN(currentWords).muln(32);
        const currentWordsLength = currentSize.addn(31).divn(32);
        const newWordsLength = newSize.addn(31).divn(32);
        const wordsDiff = newWordsLength.sub(currentWordsLength);
        if (newSize.gt(currentSize)) {
            const newTotalFee = this._memoryFee(newWordsLength);
            const currentTotalFee = this._memoryFee(currentWordsLength);
            const fee = newTotalFee.sub(currentTotalFee);
            return [fee.toNumber(), wordsDiff.toNumber()];
        }
        return [0, 0];
    }
    _getFromStack(stack, count) {
        return stack
            .slice(-count)
            .reverse()
            .map((value) => `0x${value}`)
            .map(ethereumjs_util_1.toBuffer);
    }
    _memoryFee(words) {
        const square = words.mul(words);
        const linCoef = words.muln(this._memoryGas());
        const quadCoef = square.divn(this._quadCoeffDiv());
        const newTotalFee = linCoef.add(quadCoef);
        return newTotalFee;
    }
}
exports.VMDebugTracer = VMDebugTracer;
function divUp(x, y) {
    y = new ethereumjs_util_1.BN(y);
    let result = x.div(y);
    if (!x.mod(y).eqn(0)) {
        result = result.addn(1);
    }
    return result;
}
function toWord(b) {
    return b.toString("hex").padStart(64, "0");
}
//# sourceMappingURL=vm-debug-tracer.js.map