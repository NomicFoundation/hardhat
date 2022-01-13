"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePoolState = exports.makeSerializedTransaction = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const immutable_1 = require("immutable");
const bnToHex_1 = require("./utils/bnToHex");
exports.makeSerializedTransaction = (0, immutable_1.Record)({
    orderId: 0,
    fakeFrom: undefined,
    data: "",
    txType: 0,
});
exports.makePoolState = (0, immutable_1.Record)({
    pendingTransactions: (0, immutable_1.Map)(),
    queuedTransactions: (0, immutable_1.Map)(),
    hashToTransaction: (0, immutable_1.Map)(),
    blockGasLimit: (0, bnToHex_1.bnToHex)(new ethereumjs_util_1.BN(9500000)),
});
//# sourceMappingURL=PoolState.js.map