"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainData = void 0;
const bloom_1 = __importDefault(require("@ethereumjs/vm/dist/bloom"));
const ethereumjs_util_1 = require("ethereumjs-util");
const filter_1 = require("./filter");
class BlockchainData {
    constructor() {
        this._blocksByNumber = new Map();
        this._blocksByHash = new Map();
        this._blocksByTransactions = new Map();
        this._transactions = new Map();
        this._transactionReceipts = new Map();
        this._totalDifficulty = new Map();
    }
    getBlockByNumber(blockNumber) {
        return this._blocksByNumber.get(blockNumber.toNumber());
    }
    getBlockByHash(blockHash) {
        return this._blocksByHash.get((0, ethereumjs_util_1.bufferToHex)(blockHash));
    }
    getBlockByTransactionHash(transactionHash) {
        return this._blocksByTransactions.get((0, ethereumjs_util_1.bufferToHex)(transactionHash));
    }
    getTransaction(transactionHash) {
        return this._transactions.get((0, ethereumjs_util_1.bufferToHex)(transactionHash));
    }
    getTransactionReceipt(transactionHash) {
        return this._transactionReceipts.get((0, ethereumjs_util_1.bufferToHex)(transactionHash));
    }
    getTotalDifficulty(blockHash) {
        return this._totalDifficulty.get((0, ethereumjs_util_1.bufferToHex)(blockHash));
    }
    getLogs(filterParams) {
        const logs = [];
        for (let i = filterParams.fromBlock; i.lte(filterParams.toBlock); i = i.addn(1)) {
            const block = this.getBlockByNumber(i);
            if (block === undefined ||
                !(0, filter_1.bloomFilter)(new bloom_1.default(block.header.bloom), filterParams.addresses, filterParams.normalizedTopics)) {
                continue;
            }
            for (const transaction of block.transactions) {
                const receipt = this.getTransactionReceipt(transaction.hash());
                if (receipt !== undefined) {
                    logs.push(...(0, filter_1.filterLogs)(receipt.logs, {
                        fromBlock: filterParams.fromBlock,
                        toBlock: filterParams.toBlock,
                        addresses: filterParams.addresses,
                        normalizedTopics: filterParams.normalizedTopics,
                    }));
                }
            }
        }
        return logs;
    }
    addBlock(block, totalDifficulty) {
        const blockHash = (0, ethereumjs_util_1.bufferToHex)(block.hash());
        const blockNumber = new ethereumjs_util_1.BN(block.header.number).toNumber();
        this._blocksByNumber.set(blockNumber, block);
        this._blocksByHash.set(blockHash, block);
        this._totalDifficulty.set(blockHash, totalDifficulty);
        for (const transaction of block.transactions) {
            const transactionHash = (0, ethereumjs_util_1.bufferToHex)(transaction.hash());
            this._transactions.set(transactionHash, transaction);
            this._blocksByTransactions.set(transactionHash, block);
        }
    }
    removeBlock(block) {
        const blockHash = (0, ethereumjs_util_1.bufferToHex)(block.hash());
        const blockNumber = new ethereumjs_util_1.BN(block.header.number).toNumber();
        this._blocksByNumber.delete(blockNumber);
        this._blocksByHash.delete(blockHash);
        this._totalDifficulty.delete(blockHash);
        for (const transaction of block.transactions) {
            const transactionHash = (0, ethereumjs_util_1.bufferToHex)(transaction.hash());
            this._transactions.delete(transactionHash);
            this._transactionReceipts.delete(transactionHash);
            this._blocksByTransactions.delete(transactionHash);
        }
    }
    addTransaction(transaction) {
        this._transactions.set((0, ethereumjs_util_1.bufferToHex)(transaction.hash()), transaction);
    }
    addTransactionReceipt(receipt) {
        this._transactionReceipts.set(receipt.transactionHash, receipt);
    }
}
exports.BlockchainData = BlockchainData;
//# sourceMappingURL=BlockchainData.js.map