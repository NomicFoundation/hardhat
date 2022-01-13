"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForkBlockchain = void 0;
const block_1 = require("@ethereumjs/block");
const ethereumjs_util_1 = require("ethereumjs-util");
const errors_1 = require("../../../core/providers/errors");
const BlockchainData_1 = require("../BlockchainData");
const output_1 = require("../output");
const ReadOnlyValidEIP2930Transaction_1 = require("../transactions/ReadOnlyValidEIP2930Transaction");
const ReadOnlyValidTransaction_1 = require("../transactions/ReadOnlyValidTransaction");
const ReadOnlyValidEIP1559Transaction_1 = require("../transactions/ReadOnlyValidEIP1559Transaction");
const rpcToBlockData_1 = require("./rpcToBlockData");
const rpcToTxData_1 = require("./rpcToTxData");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
class ForkBlockchain {
    constructor(_jsonRpcClient, _forkBlockNumber, _common) {
        this._jsonRpcClient = _jsonRpcClient;
        this._forkBlockNumber = _forkBlockNumber;
        this._common = _common;
        this._data = new BlockchainData_1.BlockchainData();
        this._latestBlockNumber = this._forkBlockNumber;
    }
    async getLatestBlock() {
        const block = await this.getBlock(this._latestBlockNumber);
        if (block === null) {
            throw new Error("Block not found");
        }
        return block;
    }
    async getBlock(blockHashOrNumber) {
        let block;
        if (Buffer.isBuffer(blockHashOrNumber)) {
            block = await this._getBlockByHash(blockHashOrNumber);
            return block !== null && block !== void 0 ? block : null;
        }
        block = await this._getBlockByNumber(new ethereumjs_util_1.BN(blockHashOrNumber));
        return block !== null && block !== void 0 ? block : null;
    }
    async addBlock(block) {
        const blockNumber = new ethereumjs_util_1.BN(block.header.number);
        if (!blockNumber.eq(this._latestBlockNumber.addn(1))) {
            throw new Error("Invalid block number");
        }
        // When forking a network whose consensus is not the classic PoW,
        // we can't calculate the hash correctly.
        // Thus, we avoid this check for the first block after the fork.
        if (blockNumber.gt(this._forkBlockNumber.addn(1))) {
            const parent = await this.getLatestBlock();
            if (!block.header.parentHash.equals(parent.hash())) {
                throw new Error("Invalid parent hash");
            }
        }
        this._latestBlockNumber = this._latestBlockNumber.addn(1);
        const totalDifficulty = await this._computeTotalDifficulty(block);
        this._data.addBlock(block, totalDifficulty);
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
        const blockNumber = new ethereumjs_util_1.BN(block.header.number);
        const savedBlock = this._data.getBlockByNumber(blockNumber);
        if (savedBlock === undefined || !savedBlock.hash().equals(block.hash())) {
            throw new Error("Invalid block");
        }
        const nextBlockNumber = blockNumber.addn(1);
        if (this._forkBlockNumber.gte(nextBlockNumber)) {
            throw new Error("Cannot delete remote block");
        }
        const nextBlock = this._data.getBlockByNumber(nextBlockNumber);
        if (nextBlock !== undefined) {
            return this._delBlock(nextBlock);
        }
    }
    async getTotalDifficulty(blockHash) {
        let td = this._data.getTotalDifficulty(blockHash);
        if (td !== undefined) {
            return td;
        }
        const block = await this.getBlock(blockHash);
        if (block === null) {
            throw new Error("Block not found");
        }
        td = this._data.getTotalDifficulty(blockHash);
        if (td === undefined) {
            throw new Error("This should never happen");
        }
        return td;
    }
    async getTransaction(transactionHash) {
        const tx = this.getLocalTransaction(transactionHash);
        if (tx === undefined) {
            const remote = await this._jsonRpcClient.getTransactionByHash(transactionHash);
            return this._processRemoteTransaction(remote);
        }
        return tx;
    }
    getLocalTransaction(transactionHash) {
        return this._data.getTransaction(transactionHash);
    }
    async getBlockByTransactionHash(transactionHash) {
        let block = this._data.getBlockByTransactionHash(transactionHash);
        if (block === undefined) {
            const remote = await this._jsonRpcClient.getTransactionByHash(transactionHash);
            this._processRemoteTransaction(remote);
            if (remote !== null && remote.blockHash !== null) {
                await this.getBlock(remote.blockHash);
                block = this._data.getBlockByTransactionHash(transactionHash);
            }
        }
        return block !== null && block !== void 0 ? block : null;
    }
    async getTransactionReceipt(transactionHash) {
        const local = this._data.getTransactionReceipt(transactionHash);
        if (local !== undefined) {
            return local;
        }
        const remote = await this._jsonRpcClient.getTransactionReceipt(transactionHash);
        if (remote !== null) {
            const receipt = await this._processRemoteReceipt(remote);
            return receipt !== null && receipt !== void 0 ? receipt : null;
        }
        return null;
    }
    addTransactionReceipts(receipts) {
        for (const receipt of receipts) {
            this._data.addTransactionReceipt(receipt);
        }
    }
    getForkBlockNumber() {
        return this._forkBlockNumber;
    }
    async getLogs(filterParams) {
        if (filterParams.fromBlock.lte(this._forkBlockNumber)) {
            let toBlock = filterParams.toBlock;
            let localLogs = [];
            if (toBlock.gt(this._forkBlockNumber)) {
                toBlock = this._forkBlockNumber;
                localLogs = this._data.getLogs(Object.assign(Object.assign({}, filterParams), { fromBlock: this._forkBlockNumber.addn(1) }));
            }
            const remoteLogs = await this._jsonRpcClient.getLogs({
                fromBlock: filterParams.fromBlock,
                toBlock,
                address: filterParams.addresses.length === 1
                    ? filterParams.addresses[0]
                    : filterParams.addresses,
                topics: filterParams.normalizedTopics,
            });
            return remoteLogs.map(output_1.toRpcLogOutput).concat(localLogs);
        }
        return this._data.getLogs(filterParams);
    }
    iterator(_name, _onBlock) {
        throw new Error("Method not implemented.");
    }
    async getBaseFee() {
        const latestBlock = await this.getLatestBlock();
        return latestBlock.header.calcNextBaseFee();
    }
    async _getBlockByHash(blockHash) {
        const block = this._data.getBlockByHash(blockHash);
        if (block !== undefined) {
            return block;
        }
        const rpcBlock = await this._jsonRpcClient.getBlockByHash(blockHash, true);
        return this._processRemoteBlock(rpcBlock);
    }
    async _getBlockByNumber(blockNumber) {
        if (blockNumber.gt(this._latestBlockNumber)) {
            return undefined;
        }
        const block = this._data.getBlockByNumber(blockNumber);
        if (block !== undefined) {
            return block;
        }
        const rpcBlock = await this._jsonRpcClient.getBlockByNumber(blockNumber, true);
        return this._processRemoteBlock(rpcBlock);
    }
    async _processRemoteBlock(rpcBlock) {
        if (rpcBlock === null ||
            rpcBlock.hash === null ||
            rpcBlock.number === null ||
            rpcBlock.number.gt(this._forkBlockNumber)) {
            return undefined;
        }
        // We copy the common and set it to London or Berlin if the remote block
        // had EIP-1559 activated or not. The reason for this is that ethereumjs
        // throws if we have a base fee for an older hardfork, and set a default
        // one for London.
        const common = this._common.copy();
        if (rpcBlock.baseFeePerGas !== undefined) {
            common.setHardfork("london"); // TODO: consider changing this to "latest hardfork"
        }
        else {
            common.setHardfork("berlin");
        }
        // we don't include the transactions to add our own custom tx objects,
        // otherwise they are recreated with upstream classes
        const blockData = (0, rpcToBlockData_1.rpcToBlockData)(Object.assign(Object.assign({}, rpcBlock), { transactions: [] }));
        const block = block_1.Block.fromBlockData(blockData, {
            common,
            // We use freeze false here because we add the transactions manually
            freeze: false,
        });
        for (const transaction of rpcBlock.transactions) {
            let tx;
            if (transaction.type === undefined || transaction.type.eqn(0)) {
                tx = new ReadOnlyValidTransaction_1.ReadOnlyValidTransaction(new ethereumjs_util_1.Address(transaction.from), (0, rpcToTxData_1.rpcToTxData)(transaction));
            }
            else if (transaction.type.eqn(1)) {
                tx = new ReadOnlyValidEIP2930Transaction_1.ReadOnlyValidEIP2930Transaction(new ethereumjs_util_1.Address(transaction.from), (0, rpcToTxData_1.rpcToTxData)(transaction));
            }
            else if (transaction.type.eqn(2)) {
                tx = new ReadOnlyValidEIP1559Transaction_1.ReadOnlyValidEIP1559Transaction(new ethereumjs_util_1.Address(transaction.from), (0, rpcToTxData_1.rpcToTxData)(transaction));
            }
            else {
                throw new errors_1.InternalError(`Unknown transaction type ${transaction.type}`);
            }
            block.transactions.push(tx);
        }
        this._data.addBlock(block, rpcBlock.totalDifficulty);
        return block;
    }
    async _computeTotalDifficulty(block) {
        var _a;
        const difficulty = new ethereumjs_util_1.BN(block.header.difficulty);
        const blockNumber = new ethereumjs_util_1.BN(block.header.number);
        if (blockNumber.eqn(0)) {
            return difficulty;
        }
        const parentBlock = (_a = this._data.getBlockByNumber(blockNumber.subn(1))) !== null && _a !== void 0 ? _a : (await this.getBlock(blockNumber.subn(1)));
        if (parentBlock === null) {
            throw new Error("Block not found");
        }
        const parentHash = parentBlock.hash();
        const parentTD = this._data.getTotalDifficulty(parentHash);
        if (parentTD === undefined) {
            throw new Error("This should never happen");
        }
        return parentTD.add(difficulty);
    }
    _delBlock(block) {
        if (new ethereumjs_util_1.BN(block.header.number).lte(this._forkBlockNumber)) {
            throw new Error("Cannot delete remote block");
        }
        const blockNumber = block.header.number.toNumber();
        for (let i = blockNumber; this._latestBlockNumber.gten(i); i++) {
            const current = this._data.getBlockByNumber(new ethereumjs_util_1.BN(i));
            if (current !== undefined) {
                this._data.removeBlock(current);
            }
        }
        this._latestBlockNumber = new ethereumjs_util_1.BN(blockNumber).subn(1);
    }
    _processRemoteTransaction(rpcTransaction) {
        if (rpcTransaction === null ||
            rpcTransaction.blockNumber === null ||
            rpcTransaction.blockNumber.gt(this._forkBlockNumber)) {
            return undefined;
        }
        const transaction = new ReadOnlyValidTransaction_1.ReadOnlyValidTransaction(new ethereumjs_util_1.Address(rpcTransaction.from), (0, rpcToTxData_1.rpcToTxData)(rpcTransaction));
        this._data.addTransaction(transaction);
        return transaction;
    }
    async _processRemoteReceipt(txReceipt) {
        if (txReceipt === null || txReceipt.blockNumber.gt(this._forkBlockNumber)) {
            return undefined;
        }
        const tx = await this.getTransaction(txReceipt.transactionHash);
        const receipt = (0, output_1.remoteReceiptToRpcReceiptOutput)(txReceipt, tx, (0, output_1.shouldShowTransactionTypeForHardfork)(this._common), (0, output_1.shouldShowEffectiveGasPriceForHardfork)(this._common));
        this._data.addTransactionReceipt(receipt);
        return receipt;
    }
}
exports.ForkBlockchain = ForkBlockchain;
//# sourceMappingURL=ForkBlockchain.js.map