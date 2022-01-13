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
exports.HardhatModule = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const t = __importStar(require("io-ts"));
const base_types_1 = require("../../../core/jsonrpc/types/base-types");
const hardhat_network_1 = require("../../../core/jsonrpc/types/input/hardhat-network");
const solc_1 = require("../../../core/jsonrpc/types/input/solc");
const validation_1 = require("../../../core/jsonrpc/types/input/validation");
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
class HardhatModule {
    constructor(_node, _resetCallback, _setLoggingEnabledCallback, _logger, _experimentalHardhatNetworkMessageTraceHooks = []) {
        this._node = _node;
        this._resetCallback = _resetCallback;
        this._setLoggingEnabledCallback = _setLoggingEnabledCallback;
        this._logger = _logger;
        this._experimentalHardhatNetworkMessageTraceHooks = _experimentalHardhatNetworkMessageTraceHooks;
    }
    async processRequest(method, params = []) {
        switch (method) {
            case "hardhat_getStackTraceFailuresCount":
                return this._getStackTraceFailuresCountAction(...this._getStackTraceFailuresCountParams(params));
            case "hardhat_addCompilationResult":
                return this._addCompilationResultAction(...this._addCompilationResultParams(params));
            case "hardhat_impersonateAccount":
                return this._impersonateAction(...this._impersonateParams(params));
            case "hardhat_intervalMine":
                return this._intervalMineAction(...this._intervalMineParams(params));
            case "hardhat_getAutomine":
                return this._getAutomine();
            case "hardhat_stopImpersonatingAccount":
                return this._stopImpersonatingAction(...this._stopImpersonatingParams(params));
            case "hardhat_reset":
                return this._resetAction(...this._resetParams(params));
            case "hardhat_setLoggingEnabled":
                return this._setLoggingEnabledAction(...this._setLoggingEnabledParams(params));
            case "hardhat_setMinGasPrice":
                return this._setMinGasPriceAction(...this._setMinGasPriceParams(params));
            case "hardhat_dropTransaction":
                return this._dropTransactionAction(...this._dropTransactionParams(params));
            case "hardhat_setBalance":
                return this._setBalanceAction(...this._setBalanceParams(params));
            case "hardhat_setCode":
                return this._setCodeAction(...this._setCodeParams(params));
            case "hardhat_setNonce":
                return this._setNonceAction(...this._setNonceParams(params));
            case "hardhat_setStorageAt":
                return this._setStorageAtAction(...this._setStorageAtParams(params));
            case "hardhat_setNextBlockBaseFeePerGas":
                return this._setNextBlockBaseFeePerGasAction(...this._setNextBlockBaseFeePerGasParams(params));
            case "hardhat_setCoinbase":
                return this._setCoinbaseAction(...this._setCoinbaseParams(params));
        }
        throw new errors_1.MethodNotFoundError(`Method ${method} not found`);
    }
    // hardhat_getStackTraceFailuresCount
    _getStackTraceFailuresCountParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _getStackTraceFailuresCountAction() {
        return this._node.getStackTraceFailuresCount();
    }
    // hardhat_addCompilationResult
    _addCompilationResultParams(params) {
        return (0, validation_1.validateParams)(params, t.string, solc_1.rpcCompilerInput, solc_1.rpcCompilerOutput);
    }
    async _addCompilationResultAction(solcVersion, compilerInput, compilerOutput) {
        return this._node.addCompilationResult(solcVersion, compilerInput, compilerOutput);
    }
    // hardhat_impersonateAccount
    _impersonateParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress);
    }
    _impersonateAction(address) {
        return this._node.addImpersonatedAccount(address);
    }
    // hardhat_intervalMine
    _intervalMineParams(_params) {
        return [];
    }
    async _intervalMineAction() {
        const result = await this._node.mineBlock();
        const blockNumber = result.block.header.number.toNumber();
        const isEmpty = result.block.transactions.length === 0;
        if (isEmpty) {
            this._logger.printMinedBlockNumber(blockNumber, isEmpty, result.block.header.baseFeePerGas);
        }
        else {
            await this._logBlock(result);
            this._logger.printMinedBlockNumber(blockNumber, isEmpty);
            const printedSomething = this._logger.printLogs();
            if (printedSomething) {
                this._logger.printEmptyLine();
            }
        }
        return true;
    }
    // hardhat_getAutomine
    async _getAutomine() {
        return this._node.getAutomine();
    }
    // hardhat_stopImpersonatingAccount
    _stopImpersonatingParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress);
    }
    _stopImpersonatingAction(address) {
        return this._node.removeImpersonatedAccount(address);
    }
    // hardhat_reset
    _resetParams(params) {
        return (0, validation_1.validateParams)(params, hardhat_network_1.optionalRpcHardhatNetworkConfig);
    }
    async _resetAction(networkConfig) {
        await this._resetCallback(networkConfig === null || networkConfig === void 0 ? void 0 : networkConfig.forking);
        return true;
    }
    // hardhat_setLoggingEnabled
    _setLoggingEnabledParams(params) {
        return (0, validation_1.validateParams)(params, t.boolean);
    }
    async _setLoggingEnabledAction(loggingEnabled) {
        this._setLoggingEnabledCallback(loggingEnabled);
        return true;
    }
    // hardhat_setMinGasPrice
    _setMinGasPriceParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcQuantity);
    }
    async _setMinGasPriceAction(minGasPrice) {
        if (minGasPrice.lt(new ethereumjs_util_1.BN(0))) {
            throw new errors_1.InvalidInputError("Minimum gas price cannot be negative");
        }
        if (this._node.isEip1559Active()) {
            throw new errors_1.InvalidInputError("hardhat_setMinGasPrice is not supported when EIP-1559 is active");
        }
        await this._node.setMinGasPrice(minGasPrice);
        return true;
    }
    // hardhat_dropTransaction
    _dropTransactionParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcHash);
    }
    async _dropTransactionAction(hash) {
        return this._node.dropTransaction(hash);
    }
    // hardhat_setBalance
    _setBalanceParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, base_types_1.rpcQuantity);
    }
    async _setBalanceAction(address, newBalance) {
        await this._node.setAccountBalance(new ethereumjs_util_1.Address(address), newBalance);
        return true;
    }
    // hardhat_setCode
    _setCodeParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, base_types_1.rpcData);
    }
    async _setCodeAction(address, newCode) {
        await this._node.setAccountCode(new ethereumjs_util_1.Address(address), newCode);
        return true;
    }
    // hardhat_setNonce
    _setNonceParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, base_types_1.rpcQuantity);
    }
    async _setNonceAction(address, newNonce) {
        await this._node.setNextConfirmedNonce(new ethereumjs_util_1.Address(address), newNonce);
        return true;
    }
    // hardhat_setStorageAt
    _setStorageAtParams(params) {
        const [address, positionIndex, value] = (0, validation_1.validateParams)(params, base_types_1.rpcAddress, base_types_1.rpcQuantity, base_types_1.rpcData);
        const MAX_WORD_VALUE = new ethereumjs_util_1.BN(2).pow(new ethereumjs_util_1.BN(256));
        if (positionIndex.gte(MAX_WORD_VALUE)) {
            throw new errors_1.InvalidInputError(`Storage key must not be greater than or equal to 2^256. Received ${positionIndex.toString()}.`);
        }
        if (value.length !== 32) {
            throw new errors_1.InvalidInputError(`Storage value must be exactly 32 bytes long. Received ${(0, base_types_1.bufferToRpcData)(value)}, which is ${value.length} bytes long.`);
        }
        return [address, positionIndex, value];
    }
    async _setStorageAtAction(address, positionIndex, value) {
        await this._node.setStorageAt(new ethereumjs_util_1.Address(address), positionIndex, value);
        return true;
    }
    // hardhat_setNextBlockBaseFeePerGas
    _setNextBlockBaseFeePerGasParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcQuantity);
    }
    _setNextBlockBaseFeePerGasAction(baseFeePerGas) {
        if (!this._node.isEip1559Active()) {
            throw new errors_1.InvalidInputError("hardhat_setNextBlockBaseFeePerGas is disabled because EIP-1559 is not active");
        }
        this._node.setUserProvidedNextBlockBaseFeePerGas(baseFeePerGas);
        return true;
    }
    // hardhat_setCoinbase
    _setCoinbaseParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress);
    }
    async _setCoinbaseAction(address) {
        await this._node.setCoinbase(new ethereumjs_util_1.Address(address));
        return true;
    }
    async _logBlock(result) {
        const { block, traces } = result;
        const codes = [];
        for (const txTrace of traces) {
            const code = await this._node.getCodeFromTrace(txTrace.trace, new ethereumjs_util_1.BN(block.header.number));
            codes.push(code);
        }
        this._logger.logIntervalMinedBlock(result, codes);
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
exports.HardhatModule = HardhatModule;
//# sourceMappingURL=hardhat.js.map