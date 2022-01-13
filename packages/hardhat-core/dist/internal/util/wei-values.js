"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weiToHumanReadableString = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
/**
 * This function turns a wei value in a human readable string. It shows values
 * in ETH, gwei or wei, depending on how large it is.
 *
 * It never show more than 99999 wei or gwei, moving to the larger denominator
 * when necessary.
 *
 * It never shows more than 4 decimal digits. Adapting denominator and
 * truncating as necessary.
 */
function weiToHumanReadableString(wei) {
    if (typeof wei === "number") {
        wei = new ethereumjs_util_1.BN(wei);
    }
    if (wei.eqn(0)) {
        return "0 ETH";
    }
    if (wei.lt(new ethereumjs_util_1.BN(10).pow(new ethereumjs_util_1.BN(5)))) {
        return `${wei} wei`;
    }
    if (wei.lt(new ethereumjs_util_1.BN(10).pow(new ethereumjs_util_1.BN(14)))) {
        return `${toDecimalString(wei, 9, 4)} gwei`;
    }
    return `${toDecimalString(wei, 18, 4)} ETH`;
}
exports.weiToHumanReadableString = weiToHumanReadableString;
function toDecimalString(value, digitsToInteger, decimalDigits = 4) {
    const oneUnit = new ethereumjs_util_1.BN(10).pow(new ethereumjs_util_1.BN(digitsToInteger));
    const oneDecimal = new ethereumjs_util_1.BN(10).pow(new ethereumjs_util_1.BN(digitsToInteger - decimalDigits));
    const integer = value.div(oneUnit);
    const decimals = value.mod(oneUnit).div(oneDecimal);
    if (decimals.eqn(0)) {
        return integer.toString(10);
    }
    const decimalsString = removeRightZeros(decimals.toString(10).padStart(decimalDigits, "0"));
    return `${integer.toString(10)}.${decimalsString}`;
}
function removeRightZeros(str) {
    let zeros = 0;
    for (let i = str.length - 1; i >= 0; i--) {
        if (str.charAt(i) !== "0") {
            break;
        }
        zeros += 1;
    }
    return str.substr(0, str.length - zeros);
}
//# sourceMappingURL=wei-values.js.map