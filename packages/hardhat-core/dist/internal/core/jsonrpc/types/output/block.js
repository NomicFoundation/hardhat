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
exports.rpcBlockWithTransactions = exports.rpcBlock = void 0;
const t = __importStar(require("io-ts"));
const io_ts_1 = require("../../../../util/io-ts");
const base_types_1 = require("../base-types");
const transaction_1 = require("./transaction");
const baseBlockResponse = {
    number: (0, io_ts_1.nullable)(base_types_1.rpcQuantity),
    hash: (0, io_ts_1.nullable)(base_types_1.rpcHash),
    parentHash: base_types_1.rpcHash,
    nonce: (0, io_ts_1.optional)(base_types_1.rpcData),
    sha3Uncles: base_types_1.rpcHash,
    logsBloom: base_types_1.rpcData,
    transactionsRoot: base_types_1.rpcHash,
    stateRoot: base_types_1.rpcHash,
    receiptsRoot: base_types_1.rpcHash,
    miner: base_types_1.rpcAddress,
    difficulty: base_types_1.rpcQuantity,
    totalDifficulty: base_types_1.rpcQuantity,
    extraData: base_types_1.rpcData,
    size: base_types_1.rpcQuantity,
    gasLimit: base_types_1.rpcQuantity,
    gasUsed: base_types_1.rpcQuantity,
    timestamp: base_types_1.rpcQuantity,
    uncles: t.array(base_types_1.rpcHash, "HASH Array"),
    mixHash: (0, io_ts_1.optional)(base_types_1.rpcHash),
    baseFeePerGas: (0, io_ts_1.optional)(base_types_1.rpcQuantity),
};
exports.rpcBlock = t.type(Object.assign(Object.assign({}, baseBlockResponse), { transactions: t.array(base_types_1.rpcHash, "HASH Array") }), "RpcBlock");
exports.rpcBlockWithTransactions = t.type(Object.assign(Object.assign({}, baseBlockResponse), { transactions: t.array(transaction_1.rpcTransaction, "RpcTransaction Array") }), "RpcBlockWithTransactions");
//# sourceMappingURL=block.js.map