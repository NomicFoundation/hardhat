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
exports.EvmModule = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const t = __importStar(require("io-ts"));
const base_types_1 = require("../../../core/jsonrpc/types/base-types");
const hardhat_network_1 = require("../../../core/jsonrpc/types/input/hardhat-network");
const validation_1 = require("../../../core/jsonrpc/types/input/validation");
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
// Type to accept decimal or hex-encoded params (for test rpc methods only)
const rpcQuantityOrNumber = t.union([base_types_1.rpcQuantity, t.number]);
class EvmModule {
    constructor(_node, _miningTimer, _logger, _experimentalHardhatNetworkMessageTraceHooks = []) {
        this._node = _node;
        this._miningTimer = _miningTimer;
        this._logger = _logger;
        this._experimentalHardhatNetworkMessageTraceHooks = _experimentalHardhatNetworkMessageTraceHooks;
    }
    async processRequest(method, params = []) {
        switch (method) {
            case "evm_increaseTime":
                return this._increaseTimeAction(...this._increaseTimeParams(params));
            case "evm_setNextBlockTimestamp":
                return this._setNextBlockTimestampAction(...this._setNextBlockTimestampParams(params));
            case "evm_mine":
                return this._mineAction(...this._mineParams(params));
            case "evm_revert":
                return this._revertAction(...this._revertParams(params));
            case "evm_snapshot":
                return this._snapshotAction(...this._snapshotParams(params));
            case "evm_setAutomine":
                return this._setAutomineAction(...this._setAutomineParams(params));
            case "evm_setIntervalMining":
                return this._setIntervalMiningAction(...this._setIntervalMiningParams(params));
            case "evm_setBlockGasLimit":
                return this._setBlockGasLimitAction(...this._setBlockGasLimitParams(params));
        }
        throw new errors_1.MethodNotFoundError(`Method ${method} not found`);
    }
    // evm_setNextBlockTimestamp
    _setNextBlockTimestampParams(params) {
        return (0, validation_1.validateParams)(params, rpcQuantityOrNumber);
    }
    async _setNextBlockTimestampAction(timestamp) {
        const latestBlock = await this._node.getLatestBlock();
        const increment = new ethereumjs_util_1.BN(timestamp).sub(new ethereumjs_util_1.BN(latestBlock.header.timestamp));
        if (increment.lte(new ethereumjs_util_1.BN(0))) {
            throw new errors_1.InvalidInputError(`Timestamp ${timestamp} is lower than or equal to previous block's timestamp` +
                ` ${new ethereumjs_util_1.BN(latestBlock.header.timestamp).toNumber()}`);
        }
        this._node.setNextBlockTimestamp(new ethereumjs_util_1.BN(timestamp));
        return timestamp.toString();
    }
    // evm_increaseTime
    _increaseTimeParams(params) {
        return (0, validation_1.validateParams)(params, rpcQuantityOrNumber);
    }
    async _increaseTimeAction(increment) {
        this._node.increaseTime(new ethereumjs_util_1.BN(increment));
        const totalIncrement = this._node.getTimeIncrement();
        // This RPC call is an exception: it returns a number in decimal
        return totalIncrement.toString();
    }
    // evm_mine
    _mineParams(params) {
        if (params.length === 0) {
            params.push(0);
        }
        return (0, validation_1.validateParams)(params, rpcQuantityOrNumber);
    }
    async _mineAction(timestamp) {
        // if timestamp is specified, make sure it is bigger than previous
        // block's timestamp
        if (timestamp !== 0) {
            const latestBlock = await this._node.getLatestBlock();
            const increment = new ethereumjs_util_1.BN(timestamp).sub(new ethereumjs_util_1.BN(latestBlock.header.timestamp));
            if (increment.lte(new ethereumjs_util_1.BN(0))) {
                throw new errors_1.InvalidInputError(`Timestamp ${timestamp} is lower than previous block's timestamp` +
                    ` ${new ethereumjs_util_1.BN(latestBlock.header.timestamp).toNumber()}`);
            }
        }
        const result = await this._node.mineBlock(new ethereumjs_util_1.BN(timestamp));
        await this._logBlock(result);
        return (0, base_types_1.numberToRpcQuantity)(0);
    }
    // evm_revert
    _revertParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcQuantity);
    }
    async _revertAction(snapshotId) {
        return this._node.revertToSnapshot(snapshotId.toNumber());
    }
    // evm_snapshot
    _snapshotParams(_params) {
        return [];
    }
    async _snapshotAction() {
        const snapshotId = await this._node.takeSnapshot();
        return (0, base_types_1.numberToRpcQuantity)(snapshotId);
    }
    // evm_setAutomine
    _setAutomineParams(params) {
        return (0, validation_1.validateParams)(params, t.boolean);
    }
    async _setAutomineAction(automine) {
        this._node.setAutomine(automine);
        return true;
    }
    // evm_setIntervalMining
    _setIntervalMiningParams(params) {
        return (0, validation_1.validateParams)(params, hardhat_network_1.rpcIntervalMining);
    }
    async _setIntervalMiningAction(blockTime) {
        this._miningTimer.setBlockTime(blockTime);
        return true;
    }
    // evm_setBlockGasLimit
    _setBlockGasLimitParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcQuantity);
    }
    async _setBlockGasLimitAction(blockGasLimit) {
        if (blockGasLimit.lte(new ethereumjs_util_1.BN(0))) {
            throw new errors_1.InvalidInputError("Block gas limit must be greater than 0");
        }
        await this._node.setBlockGasLimit(blockGasLimit);
        return true;
    }
    async _logBlock(result) {
        const { block, traces } = result;
        const codes = [];
        for (const txTrace of traces) {
            const code = await this._node.getCodeFromTrace(txTrace.trace, new ethereumjs_util_1.BN(block.header.number));
            codes.push(code);
        }
        this._logger.logMinedBlock(result, codes);
        for (const txTrace of traces) {
            await this._runHardhatNetworkMessageTraceHooks(txTrace.trace, false);
        }
    }
    async _runHardhatNetworkMessageTraceHooks(trace, isCall) {
        if (trace === undefined) {
            return;
        }
        for (const hook of this._experimentalHardhatNetworkMessageTraceHooks) {
            await hook(trace, isCall);
        }
    }
}
exports.EvmModule = EvmModule;
//# sourceMappingURL=evm.js.map