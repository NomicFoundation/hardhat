"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomAddressBuffer = exports.randomAddressString = exports.randomAddress = exports.randomHashBuffer = exports.randomHash = void 0;
const randomHash = () => {
    const { bufferToHex } = require("ethereumjs-util");
    return bufferToHex((0, exports.randomHashBuffer)());
};
exports.randomHash = randomHash;
let next;
const randomHashBuffer = () => {
    const { keccakFromString, keccak256 } = require("ethereumjs-util");
    if (next === undefined) {
        next = keccakFromString("seed");
    }
    const result = next;
    next = keccak256(next);
    return result;
};
exports.randomHashBuffer = randomHashBuffer;
const randomAddress = () => {
    const { Address } = require("ethereumjs-util");
    return new Address((0, exports.randomAddressBuffer)());
};
exports.randomAddress = randomAddress;
const randomAddressString = () => {
    const { bufferToHex } = require("ethereumjs-util");
    return bufferToHex((0, exports.randomAddressBuffer)());
};
exports.randomAddressString = randomAddressString;
const randomAddressBuffer = () => (0, exports.randomHashBuffer)().slice(0, 20);
exports.randomAddressBuffer = randomAddressBuffer;
//# sourceMappingURL=random.js.map