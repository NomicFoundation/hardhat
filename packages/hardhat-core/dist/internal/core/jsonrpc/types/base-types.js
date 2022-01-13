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
exports.rpcDataToBuffer = exports.bufferToRpcData = exports.rpcDataToBN = exports.rpcDataToNumber = exports.numberToRpcQuantity = exports.rpcQuantityToBN = exports.rpcQuantityToNumber = exports.rpcFloat = exports.rpcQuantityAsNumber = exports.rpcUnsignedInteger = exports.rpcAddress = exports.rpcHash = exports.rpcData = exports.rpcQuantity = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const t = __importStar(require("io-ts"));
const errors_1 = require("../../errors");
const errors_list_1 = require("../../errors-list");
const ADDRESS_LENGTH_BYTES = 20;
const HASH_LENGTH_BYTES = 32;
exports.rpcQuantity = new t.Type("QUANTITY", ethereumjs_util_1.BN.isBN, (u, c) => isRpcQuantityString(u) ? t.success(new ethereumjs_util_1.BN((0, ethereumjs_util_1.toBuffer)(u))) : t.failure(u, c), t.identity);
exports.rpcData = new t.Type("DATA", Buffer.isBuffer, (u, c) => (isRpcDataString(u) ? t.success((0, ethereumjs_util_1.toBuffer)(u)) : t.failure(u, c)), t.identity);
exports.rpcHash = new t.Type("HASH", (v) => Buffer.isBuffer(v) && v.length === HASH_LENGTH_BYTES, (u, c) => (isRpcHashString(u) ? t.success((0, ethereumjs_util_1.toBuffer)(u)) : t.failure(u, c)), t.identity);
exports.rpcAddress = new t.Type("ADDRESS", (v) => Buffer.isBuffer(v) && v.length === ADDRESS_LENGTH_BYTES, (u, c) => (isRpcAddressString(u) ? t.success((0, ethereumjs_util_1.toBuffer)(u)) : t.failure(u, c)), t.identity);
exports.rpcUnsignedInteger = new t.Type("Unsigned integer", isInteger, (u, c) => (isInteger(u) && u >= 0 ? t.success(u) : t.failure(u, c)), t.identity);
exports.rpcQuantityAsNumber = new t.Type("Integer", ethereumjs_util_1.BN.isBN, (u, c) => (isInteger(u) ? t.success(new ethereumjs_util_1.BN(u)) : t.failure(u, c)), t.identity);
exports.rpcFloat = new t.Type("Float number", isNumber, (u, c) => (typeof u === "number" ? t.success(u) : t.failure(u, c)), t.identity);
// Conversion functions
/**
 * Transforms a QUANTITY into a number. It should only be used if you are 100% sure that the value
 * fits in a number.
 */
function rpcQuantityToNumber(quantity) {
    return rpcQuantityToBN(quantity).toNumber();
}
exports.rpcQuantityToNumber = rpcQuantityToNumber;
function rpcQuantityToBN(quantity) {
    // We validate it in case a value gets here through a cast or any
    if (!isRpcQuantityString(quantity)) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE, {
            value: quantity,
        });
    }
    const buffer = (0, ethereumjs_util_1.toBuffer)(quantity);
    return new ethereumjs_util_1.BN(buffer);
}
exports.rpcQuantityToBN = rpcQuantityToBN;
function numberToRpcQuantity(n) {
    (0, errors_1.assertHardhatInvariant)(typeof n === "number" || ethereumjs_util_1.BN.isBN(n), "Expected number");
    return `0x${n.toString(16)}`;
}
exports.numberToRpcQuantity = numberToRpcQuantity;
/**
 * Transforms a DATA into a number. It should only be used if you are 100% sure that the data
 * represents a value fits in a number.
 */
function rpcDataToNumber(data) {
    return rpcDataToBN(data).toNumber();
}
exports.rpcDataToNumber = rpcDataToNumber;
function rpcDataToBN(data) {
    return new ethereumjs_util_1.BN(rpcDataToBuffer(data));
}
exports.rpcDataToBN = rpcDataToBN;
function bufferToRpcData(buffer, padToBytes = 0) {
    let s = (0, ethereumjs_util_1.bufferToHex)(buffer);
    if (padToBytes > 0 && s.length < padToBytes * 2 + 2) {
        s = `0x${"0".repeat(padToBytes * 2 + 2 - s.length)}${s.slice(2)}`;
    }
    return s;
}
exports.bufferToRpcData = bufferToRpcData;
function rpcDataToBuffer(data) {
    // We validate it in case a value gets here through a cast or any
    if (!isRpcDataString(data)) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.INVALID_RPC_DATA_VALUE, {
            value: data,
        });
    }
    return (0, ethereumjs_util_1.toBuffer)(data);
}
exports.rpcDataToBuffer = rpcDataToBuffer;
// Type guards
function isRpcQuantityString(u) {
    return (typeof u === "string" &&
        u.match(/^0x(?:0|(?:[1-9a-fA-F][0-9a-fA-F]*))$/) !== null);
}
function isRpcDataString(u) {
    return typeof u === "string" && u.match(/^0x(?:[0-9a-fA-F]{2})*$/) !== null;
}
function isRpcHashString(u) {
    return typeof u === "string" && u.length === 66 && isRpcDataString(u);
}
function isRpcAddressString(u) {
    return typeof u === "string" && (0, ethereumjs_util_1.isValidAddress)(u);
}
function isInteger(num) {
    return Number.isInteger(num);
}
function isNumber(num) {
    return typeof num === "number";
}
//# sourceMappingURL=base-types.js.map