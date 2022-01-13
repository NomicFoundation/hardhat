"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardhatBlockchain = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const BlockchainData_1 = require("./BlockchainData");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
class HardhatBlockchain {
    constructor() {
        this._data = new BlockchainData_1.BlockchainData();
        this._length = 0;
    }
    async getLatestBlock() {
        const block = this._data.getBlockByNumber(new ethereumjs_util_1.BN(this._length - 1));
        if (block === undefined) {
            throw new Error("No block available");
        }
        return block;
    }
    async getBlock(blockHashOrNumber) {
        var _a, _b, _c;
        if (typeof blockHashOrNumber === "number") {
            return (_a = this._data.getBlockByNumber(new ethereumjs_util_1.BN(blockHashOrNumber))) !== null && _a !== void 0 ? _a : null;
        }
        if (ethereumjs_util_1.BN.isBN(blockHashOrNumber)) {
            return (_b = this._data.getBlockByNumber(blockHashOrNumber)) !== null && _b !== void 0 ? _b : null;
        }
        return (_c = this._data.getBlockByHash(blockHashOrNumber)) !== null && _c !== void 0 ? _c : null;
    }
    async addBlock(block) {
        this._validateBlock(block);
        const totalDifficulty = this._computeTotalDifficulty(block);
        this._data.addBlock(block, totalDifficulty);
        this._length += 1;
        return block;
    }
    async putBlock(block) {
        await this.addBlock(block);
    }
    deleteBlock(blockHash) {
        const block = this._data.getBlockByHash(blockHash);
        if (block === undefined) {
            throw new Error("Block not found");
        }
        this._delBlock(block);
    }
    async delBlock(blockHash) {
        this.deleteBlock(blockHash);
    }
    deleteLaterBlocks(block) {
        const actual = this._data.getBlockByHash(block.hash());
        if (actual === undefined) {
            throw new Error("Invalid block");
        }
        const nextBlock = this._data.getBlockByNumber(new ethereumjs_util_1.BN(actual.header.number).addn(1));
        if (nextBlock !== undefined) {
            this._delBlock(nextBlock);
        }
    }
    async getTotalDifficulty(blockHash) {
        const totalDifficulty = this._data.getTotalDifficulty(blockHash);
        if (totalDifficulty === undefined) {
            throw new Error("Block not found");
        }
        return totalDifficulty;
    }
    async getTransaction(transactionHash) {
        return this.getLocalTransaction(transactionHash);
    }
    getLocalTransaction(transactionHash) {
        return this._data.getTransaction(transactionHash);
    }
    async getBlockByTransactionHash(transactionHash) {
        const block = this._data.getBlockByTransactionHash(transactionHash);
        return block !== null && block !== void 0 ? block : null;
    }
    async getTransactionReceipt(transactionHash) {
        var _a;
        return (_a = this._data.getTransactionReceipt(transactionHash)) !== null && _a !== void 0 ? _a : null;
    }
    addTransactionReceipts(receipts) {
        for (const receipt of receipts) {
            this._data.addTransactionReceipt(receipt);
        }
    }
    async getLogs(filterParams) {
        return this._data.getLogs(filterParams);
    }
    iterator(_name, _onBlock) {
        throw new Error("Method not implemented.");
    }
    async getBaseFee() {
        const latestBlock = await this.getLatestBlock();
        return latestBlock.header.calcNextBaseFee();
    }
    _validateBlock(block) {
        const blockNumber = block.header.number.toNumber();
        const parentHash = block.header.parentHash;
        const parent = this._data.getBlockByNumber(new ethereumjs_util_1.BN(blockNumber - 1));
        if (this._length !== blockNumber) {
            throw new Error("Invalid block number");
        }
        if ((blockNumber === 0 && !parentHash.equals((0, ethereumjs_util_1.zeros)(32))) ||
            (blockNumber > 0 &&
                parent !== undefined &&
                !parentHash.equals(parent.hash()))) {
            throw new Error("Invalid parent hash");
        }
    }
    _computeTotalDifficulty(block) {
        const difficulty = new ethereumjs_util_1.BN(block.header.difficulty);
        if (block.header.parentHash.equals((0, ethereumjs_util_1.zeros)(32))) {
            return difficulty;
        }
        const parentTD = this._data.getTotalDifficulty(block.header.parentHash);
        if (parentTD === undefined) {
            throw new Error("This should never happen");
        }
        return parentTD.add(difficulty);
    }
    _delBlock(block) {
        const blockNumber = block.header.number.toNumber();
        for (let i = blockNumber; i < this._length; i++) {
            const current = this._data.getBlockByNumber(new ethereumjs_util_1.BN(i));
            if (current !== undefined) {
                this._data.removeBlock(current);
            }
        }
        this._length = blockNumber;
    }
}
exports.HardhatBlockchain = HardhatBlockchain;
//# sourceMappingURL=HardhatBlockchain.js.map