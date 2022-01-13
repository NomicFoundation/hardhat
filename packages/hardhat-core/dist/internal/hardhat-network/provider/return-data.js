"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnData = void 0;
const ethereumjs_abi_1 = require("ethereumjs-abi");
const errors_1 = require("../../core/errors");
// selector of Error(string)
const ERROR_SELECTOR = "08c379a0";
// selector of Panic(uint256)
const PANIC_SELECTOR = "4e487b71";
/**
 * Represents the returnData of a transaction, whose contents are unknown.
 */
class ReturnData {
    constructor(value) {
        this.value = value;
        if (value.length >= 4) {
            this._selector = value.slice(0, 4).toString("hex");
        }
    }
    isEmpty() {
        return this.value.length === 0;
    }
    matchesSelector(selector) {
        if (this._selector === undefined) {
            return false;
        }
        return this._selector === selector.toString("hex");
    }
    isErrorReturnData() {
        return this._selector === ERROR_SELECTOR;
    }
    isPanicReturnData() {
        return this._selector === PANIC_SELECTOR;
    }
    decodeError() {
        if (this.isEmpty()) {
            return "";
        }
        (0, errors_1.assertHardhatInvariant)(this._selector === ERROR_SELECTOR, "Expected return data to be a Error(string)");
        const decoded = (0, ethereumjs_abi_1.rawDecode)(["string"], this.value.slice(4));
        return decoded.toString("utf8");
    }
    decodePanic() {
        (0, errors_1.assertHardhatInvariant)(this._selector === PANIC_SELECTOR, "Expected return data to be a Panic(uint256)");
        const [errorCode] = (0, ethereumjs_abi_1.rawDecode)(["uint256"], this.value.slice(4));
        return errorCode;
    }
}
exports.ReturnData = ReturnData;
//# sourceMappingURL=return-data.js.map