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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthModule = void 0;
const tx_1 = require("@ethereumjs/tx");
const ethereumjs_util_1 = require("ethereumjs-util");
const t = __importStar(require("io-ts"));
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const base_types_1 = require("../../../core/jsonrpc/types/base-types");
const blockTag_1 = require("../../../core/jsonrpc/types/input/blockTag");
const callRequest_1 = require("../../../core/jsonrpc/types/input/callRequest");
const filterRequest_1 = require("../../../core/jsonrpc/types/input/filterRequest");
const subscribeRequest_1 = require("../../../core/jsonrpc/types/input/subscribeRequest");
const transactionRequest_1 = require("../../../core/jsonrpc/types/input/transactionRequest");
const validation_1 = require("../../../core/jsonrpc/types/input/validation");
const errors_1 = require("../../../core/providers/errors");
const filter_1 = require("../filter");
const output_1 = require("../output");
const assertions_1 = require("../utils/assertions");
const io_ts_1 = require("../../../util/io-ts");
const EIP1559_MIN_HARDFORK = "london";
const ACCESS_LIST_MIN_HARDFORK = "berlin";
const EIP155_MIN_HARDFORK = "spuriousDragon";
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
class EthModule {
    constructor(_common, _node, _throwOnTransactionFailures, _throwOnCallFailures, _logger, _experimentalHardhatNetworkMessageTraceHooks = []) {
        this._common = _common;
        this._node = _node;
        this._throwOnTransactionFailures = _throwOnTransactionFailures;
        this._throwOnCallFailures = _throwOnCallFailures;
        this._logger = _logger;
        this._experimentalHardhatNetworkMessageTraceHooks = _experimentalHardhatNetworkMessageTraceHooks;
    }
    async processRequest(method, params = []) {
        switch (method) {
            case "eth_accounts":
                return this._accountsAction(...this._accountsParams(params));
            case "eth_blockNumber":
                return this._blockNumberAction(...this._blockNumberParams(params));
            case "eth_call":
                return this._callAction(...this._callParams(params));
            case "eth_chainId":
                return this._chainIdAction(...this._chainIdParams(params));
            case "eth_coinbase":
                return this._coinbaseAction(...this._coinbaseParams(params));
            case "eth_compileLLL":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_compileSerpent":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_compileSolidity":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_estimateGas":
                return this._estimateGasAction(...this._estimateGasParams(params));
            case "eth_gasPrice":
                return this._gasPriceAction(...this._gasPriceParams(params));
            case "eth_getBalance":
                return this._getBalanceAction(...this._getBalanceParams(params));
            case "eth_getBlockByHash":
                return this._getBlockByHashAction(...this._getBlockByHashParams(params));
            case "eth_getBlockByNumber":
                return this._getBlockByNumberAction(...this._getBlockByNumberParams(params));
            case "eth_getBlockTransactionCountByHash":
                return this._getBlockTransactionCountByHashAction(...this._getBlockTransactionCountByHashParams(params));
            case "eth_getBlockTransactionCountByNumber":
                return this._getBlockTransactionCountByNumberAction(...this._getBlockTransactionCountByNumberParams(params));
            case "eth_getCode":
                return this._getCodeAction(...this._getCodeParams(params));
            case "eth_getCompilers":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_getFilterChanges":
                return this._getFilterChangesAction(...this._getFilterChangesParams(params));
            case "eth_getFilterLogs":
                return this._getFilterLogsAction(...this._getFilterLogsParams(params));
            case "eth_getLogs":
                return this._getLogsAction(...this._getLogsParams(params));
            case "eth_getProof":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_getStorageAt":
                return this._getStorageAtAction(...this._getStorageAtParams(params));
            case "eth_getTransactionByBlockHashAndIndex":
                return this._getTransactionByBlockHashAndIndexAction(...this._getTransactionByBlockHashAndIndexParams(params));
            case "eth_getTransactionByBlockNumberAndIndex":
                return this._getTransactionByBlockNumberAndIndexAction(...this._getTransactionByBlockNumberAndIndexParams(params));
            case "eth_getTransactionByHash":
                return this._getTransactionByHashAction(...this._getTransactionByHashParams(params));
            case "eth_getTransactionCount":
                return this._getTransactionCountAction(...this._getTransactionCountParams(params));
            case "eth_getTransactionReceipt":
                return this._getTransactionReceiptAction(...this._getTransactionReceiptParams(params));
            case "eth_getUncleByBlockHashAndIndex":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_getUncleByBlockNumberAndIndex":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_getUncleCountByBlockHash":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_getUncleCountByBlockNumber":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_getWork":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_hashrate":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_mining":
                return this._miningAction(...this._miningParams(params));
            case "eth_newBlockFilter":
                return this._newBlockFilterAction(...this._newBlockFilterParams(params));
            case "eth_newFilter":
                return this._newFilterAction(...this._newFilterParams(params));
            case "eth_newPendingTransactionFilter":
                return this._newPendingTransactionAction(...this._newPendingTransactionParams(params));
            case "eth_pendingTransactions":
                return this._pendingTransactionsAction(...this._pendingTransactionsParams(params));
            case "eth_protocolVersion":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_sendRawTransaction":
                return this._sendRawTransactionAction(...this._sendRawTransactionParams(params));
            case "eth_sendTransaction":
                return this._sendTransactionAction(...this._sendTransactionParams(params));
            case "eth_sign":
                return this._signAction(...this._signParams(params));
            case "eth_signTransaction":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_signTypedData":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_signTypedData_v3":
                throw new errors_1.MethodNotSupportedError(method);
            // TODO: we're currently mimicking the MetaMask implementation here.
            // The EIP 712 is still a draft. It doesn't actually distinguish different versions
            // of the eth_signTypedData API.
            // Also, note that go-ethereum implemented this in a clef JSON-RPC API: account_signTypedData.
            case "eth_signTypedData_v4":
                return this._signTypedDataV4Action(...this._signTypedDataV4Params(params));
            case "eth_submitHashrate":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_submitWork":
                throw new errors_1.MethodNotSupportedError(method);
            case "eth_subscribe":
                return this._subscribeAction(...this._subscribeParams(params));
            case "eth_syncing":
                return this._syncingAction(...this._syncingParams(params));
            case "eth_uninstallFilter":
                return this._uninstallFilterAction(...this._uninstallFilterParams(params));
            case "eth_unsubscribe":
                return this._unsubscribeAction(...this._unsubscribeParams(params));
            case "eth_feeHistory":
                return this._feeHistoryAction(...this._feeHistoryParams(params));
        }
        throw new errors_1.MethodNotFoundError(`Method ${method} not found`);
    }
    // eth_accounts
    _accountsParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _accountsAction() {
        return this._node.getLocalAccountAddresses();
    }
    // eth_blockNumber
    _blockNumberParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _blockNumberAction() {
        const blockNumber = await this._node.getLatestBlockNumber();
        return (0, base_types_1.numberToRpcQuantity)(blockNumber);
    }
    // eth_call
    _callParams(params) {
        return (0, validation_1.validateParams)(params, callRequest_1.rpcCallRequest, blockTag_1.optionalRpcNewBlockTag);
    }
    async _callAction(rpcCall, blockTag) {
        this._validateTransactionAndCallRequest(rpcCall);
        const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);
        const callParams = await this._rpcCallRequestToNodeCallParams(rpcCall);
        const { result: returnData, trace, error, consoleLogMessages, } = await this._node.runCall(callParams, blockNumberOrPending);
        const code = await this._node.getCodeFromTrace(trace, blockNumberOrPending);
        this._logger.logCallTrace(callParams, code, trace, consoleLogMessages, error);
        await this._runHardhatNetworkMessageTraceHooks(trace, true);
        if (error !== undefined && this._throwOnCallFailures) {
            throw error;
        }
        return (0, base_types_1.bufferToRpcData)(returnData.value);
    }
    // eth_chainId
    _chainIdParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _chainIdAction() {
        return (0, base_types_1.numberToRpcQuantity)(this._common.chainId());
    }
    // eth_coinbase
    _coinbaseParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _coinbaseAction() {
        return this._node.getCoinbaseAddress().toString();
    }
    // eth_compileLLL
    // eth_compileSerpent
    // eth_compileSolidity
    // eth_estimateGas
    _estimateGasParams(params) {
        // Estimate gas uses a CallArgs in Geth, so we mimic it here
        return (0, validation_1.validateParams)(params, callRequest_1.rpcCallRequest, blockTag_1.optionalRpcNewBlockTag);
    }
    async _estimateGasAction(callRequest, blockTag) {
        this._validateTransactionAndCallRequest(callRequest);
        // estimateGas behaves differently when there's no blockTag
        // it uses "pending" as default instead of "latest"
        const blockNumberOrPending = await this._resolveNewBlockTag(blockTag, "pending");
        const callParams = await this._rpcCallRequestToNodeCallParams(callRequest);
        const { estimation, error, trace, consoleLogMessages } = await this._node.estimateGas(callParams, blockNumberOrPending);
        if (error !== undefined) {
            const code = await this._node.getCodeFromTrace(trace, blockNumberOrPending);
            this._logger.logEstimateGasTrace(callParams, code, trace, consoleLogMessages, error);
            throw error;
        }
        return (0, base_types_1.numberToRpcQuantity)(estimation);
    }
    // eth_gasPrice
    _gasPriceParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _gasPriceAction() {
        return (0, base_types_1.numberToRpcQuantity)(await this._node.getGasPrice());
    }
    // eth_getBalance
    _getBalanceParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, blockTag_1.optionalRpcNewBlockTag);
    }
    async _getBalanceAction(address, blockTag) {
        const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);
        return (0, base_types_1.numberToRpcQuantity)(await this._node.getAccountBalance(new ethereumjs_util_1.Address(address), blockNumberOrPending));
    }
    // eth_getBlockByHash
    _getBlockByHashParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcHash, t.boolean);
    }
    async _getBlockByHashAction(hash, includeTransactions) {
        const block = await this._node.getBlockByHash(hash);
        if (block === undefined) {
            return null;
        }
        const totalDifficulty = await this._node.getBlockTotalDifficulty(block);
        return (0, output_1.getRpcBlock)(block, totalDifficulty, (0, output_1.shouldShowTransactionTypeForHardfork)(this._common), includeTransactions);
    }
    // eth_getBlockByNumber
    _getBlockByNumberParams(params) {
        return (0, validation_1.validateParams)(params, blockTag_1.rpcOldBlockTag, t.boolean);
    }
    async _getBlockByNumberAction(oldBlockTag, includeTransactions) {
        const numberOrPending = await this._resolveOldBlockTag(oldBlockTag);
        if (numberOrPending === undefined) {
            return null;
        }
        let block;
        let totalDifficulty;
        if (numberOrPending === "pending") {
            [block, totalDifficulty] =
                await this._node.getPendingBlockAndTotalDifficulty();
        }
        else {
            block = await this._node.getBlockByNumber(numberOrPending);
            if (block === undefined) {
                return null;
            }
            totalDifficulty = await this._node.getBlockTotalDifficulty(block);
        }
        return (0, output_1.getRpcBlock)(block, totalDifficulty, (0, output_1.shouldShowTransactionTypeForHardfork)(this._common), includeTransactions, numberOrPending === "pending");
    }
    // eth_getBlockTransactionCountByHash
    _getBlockTransactionCountByHashParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcHash);
    }
    async _getBlockTransactionCountByHashAction(hash) {
        const block = await this._node.getBlockByHash(hash);
        if (block === undefined) {
            return null;
        }
        return (0, base_types_1.numberToRpcQuantity)(block.transactions.length);
    }
    // eth_getBlockTransactionCountByNumber
    _getBlockTransactionCountByNumberParams(params) {
        return (0, validation_1.validateParams)(params, blockTag_1.rpcOldBlockTag);
    }
    async _getBlockTransactionCountByNumberAction(oldBlockTag) {
        const numberOrPending = await this._resolveOldBlockTag(oldBlockTag);
        if (numberOrPending === undefined) {
            return null;
        }
        const block = await this._node.getBlockByNumber(numberOrPending);
        if (block === undefined) {
            return null;
        }
        return (0, base_types_1.numberToRpcQuantity)(block.transactions.length);
    }
    // eth_getCode
    _getCodeParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, blockTag_1.optionalRpcNewBlockTag);
    }
    async _getCodeAction(address, blockTag) {
        const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);
        return (0, base_types_1.bufferToRpcData)(await this._node.getCode(new ethereumjs_util_1.Address(address), blockNumberOrPending));
    }
    // eth_getCompilers
    // eth_getFilterChanges
    _getFilterChangesParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcQuantity);
    }
    async _getFilterChangesAction(filterId) {
        const changes = await this._node.getFilterChanges(filterId);
        if (changes === undefined) {
            return null;
        }
        return changes;
    }
    // eth_getFilterLogs
    _getFilterLogsParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcQuantity);
    }
    async _getFilterLogsAction(filterId) {
        const changes = await this._node.getFilterLogs(filterId);
        if (changes === undefined) {
            return null;
        }
        return changes;
    }
    // eth_getLogs
    _getLogsParams(params) {
        return (0, validation_1.validateParams)(params, filterRequest_1.rpcFilterRequest);
    }
    async _rpcFilterRequestToGetLogsParams(filter) {
        if (filter.blockHash !== undefined) {
            if (filter.fromBlock !== undefined || filter.toBlock !== undefined) {
                throw new errors_1.InvalidArgumentsError("blockHash is mutually exclusive with fromBlock/toBlock");
            }
            const block = await this._node.getBlockByHash(filter.blockHash);
            if (block === undefined) {
                throw new errors_1.InvalidArgumentsError("blockHash cannot be found");
            }
            filter.fromBlock = block.header.number;
            filter.toBlock = block.header.number;
        }
        const [fromBlock, toBlock] = await Promise.all([
            this._normalizeOldBlockTagForFilterRequest(filter.fromBlock),
            this._normalizeOldBlockTagForFilterRequest(filter.toBlock),
        ]);
        return {
            fromBlock,
            toBlock,
            normalizedTopics: this._extractNormalizedLogTopics(filter.topics),
            addresses: this._extractLogAddresses(filter.address),
        };
    }
    async _getLogsAction(filter) {
        const filterParams = await this._rpcFilterRequestToGetLogsParams(filter);
        const logs = await this._node.getLogs(filterParams);
        return (0, cloneDeep_1.default)(logs);
    }
    // eth_getProof
    // eth_getStorageAt
    _getStorageAtParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, base_types_1.rpcQuantity, blockTag_1.optionalRpcNewBlockTag);
    }
    async _getStorageAtAction(address, slot, blockTag) {
        const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);
        const data = await this._node.getStorageAt(new ethereumjs_util_1.Address(address), slot, blockNumberOrPending);
        return (0, base_types_1.bufferToRpcData)(data);
    }
    // eth_getTransactionByBlockHashAndIndex
    _getTransactionByBlockHashAndIndexParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcHash, base_types_1.rpcQuantity);
    }
    async _getTransactionByBlockHashAndIndexAction(hash, index) {
        const i = index.toNumber();
        const block = await this._node.getBlockByHash(hash);
        if (block === undefined) {
            return null;
        }
        const tx = block.transactions[i];
        if (tx === undefined) {
            return null;
        }
        return (0, output_1.getRpcTransaction)(tx, (0, output_1.shouldShowTransactionTypeForHardfork)(this._common), block, i);
    }
    // eth_getTransactionByBlockNumberAndIndex
    _getTransactionByBlockNumberAndIndexParams(params) {
        return (0, validation_1.validateParams)(params, blockTag_1.rpcOldBlockTag, base_types_1.rpcQuantity);
    }
    async _getTransactionByBlockNumberAndIndexAction(oldBlockTag, index) {
        const numberOrPending = await this._resolveOldBlockTag(oldBlockTag);
        if (numberOrPending === undefined) {
            return null;
        }
        const block = await this._node.getBlockByNumber(numberOrPending);
        const i = index.toNumber();
        if (block === undefined) {
            return null;
        }
        const tx = block.transactions[i];
        if (tx === undefined) {
            return null;
        }
        const showTransactionType = (0, output_1.shouldShowTransactionTypeForHardfork)(this._common);
        return numberOrPending === "pending"
            ? (0, output_1.getRpcTransaction)(tx, showTransactionType, "pending")
            : (0, output_1.getRpcTransaction)(tx, showTransactionType, block, i);
    }
    // eth_getTransactionByHash
    _getTransactionByHashParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcHash);
    }
    async _getTransactionByHashAction(hash) {
        const pendingTx = await this._node.getPendingTransaction(hash);
        if (pendingTx !== undefined) {
            return (0, output_1.getRpcTransaction)(pendingTx, (0, output_1.shouldShowTransactionTypeForHardfork)(this._common), "pending");
        }
        const block = await this._node.getBlockByTransactionHash(hash);
        if (block === undefined) {
            return null;
        }
        const index = block.transactions.findIndex((btx) => btx.hash().equals(hash));
        const tx = block.transactions[index];
        if (tx === undefined) {
            throw new Error("Transaction not found in the saved block, this should never happen");
        }
        return (0, output_1.getRpcTransaction)(tx, (0, output_1.shouldShowTransactionTypeForHardfork)(this._common), block, index);
    }
    // eth_getTransactionCount
    _getTransactionCountParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, blockTag_1.optionalRpcNewBlockTag);
    }
    async _getTransactionCountAction(address, blockTag) {
        const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);
        return (0, base_types_1.numberToRpcQuantity)(await this._node.getNextConfirmedNonce(new ethereumjs_util_1.Address(address), blockNumberOrPending));
    }
    // eth_getTransactionReceipt
    _getTransactionReceiptParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcHash);
    }
    async _getTransactionReceiptAction(hash) {
        const receipt = await this._node.getTransactionReceipt(hash);
        if (receipt === undefined) {
            return null;
        }
        return (0, cloneDeep_1.default)(receipt);
    }
    // eth_getUncleByBlockHashAndIndex
    // TODO: Implement
    // eth_getUncleByBlockNumberAndIndex
    // TODO: Implement
    // eth_getUncleCountByBlockHash
    // TODO: Implement
    // eth_getUncleCountByBlockNumber
    // TODO: Implement
    // eth_getWork
    // eth_hashrate
    // eth_mining
    _miningParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _miningAction() {
        return false;
    }
    // eth_newBlockFilter
    _newBlockFilterParams(_params) {
        return [];
    }
    async _newBlockFilterAction() {
        const filterId = await this._node.newBlockFilter(false);
        return (0, base_types_1.numberToRpcQuantity)(filterId);
    }
    // eth_newFilter
    _newFilterParams(params) {
        return (0, validation_1.validateParams)(params, filterRequest_1.rpcFilterRequest);
    }
    async _newFilterAction(filter) {
        const filterParams = await this._rpcFilterRequestToGetLogsParams(filter);
        const filterId = await this._node.newFilter(filterParams, false);
        return (0, base_types_1.numberToRpcQuantity)(filterId);
    }
    // eth_newPendingTransactionFilter
    _newPendingTransactionParams(_params) {
        return [];
    }
    async _newPendingTransactionAction() {
        const filterId = await this._node.newPendingTransactionFilter(false);
        return (0, base_types_1.numberToRpcQuantity)(filterId);
    }
    // eth_pendingTransactions
    _pendingTransactionsParams(_params) {
        return [];
    }
    async _pendingTransactionsAction() {
        const txs = await this._node.getPendingTransactions();
        return txs.map((tx) => (0, output_1.getRpcTransaction)(tx, (0, output_1.shouldShowTransactionTypeForHardfork)(this._common), "pending"));
    }
    // eth_protocolVersion
    // eth_sendRawTransaction
    _sendRawTransactionParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcData);
    }
    async _sendRawTransactionAction(rawTx) {
        this._validateRawTransactionHardforkRequirements(rawTx);
        let tx;
        try {
            tx = tx_1.TransactionFactory.fromSerializedData(rawTx, {
                common: this._common,
            });
        }
        catch (error) {
            // This section of the code is incredibly dependant of TransactionFactory.fromSerializedData
            // AccessListEIP2930Transaction.fromSerializedTx and Transaction.fromSerializedTx
            // Please keep it updated.
            if (error instanceof Error) {
                if (error.message === "invalid remainder") {
                    throw new errors_1.InvalidArgumentsError("Invalid transaction", error);
                }
                if (error.message.includes("Incompatible EIP155")) {
                    throw new errors_1.InvalidArgumentsError("Trying to send an incompatible EIP-155 transaction, signed for another chain.", error);
                }
                if (error.message.includes("TypedTransaction with ID") &&
                    error.message.includes(" unknown")) {
                    throw new errors_1.InvalidArgumentsError(`Invalid transaction`, error);
                }
                if (error.message.includes("The chain ID does not match")) {
                    throw new errors_1.InvalidArgumentsError(`Trying to send a raw transaction with an invalid chainId. The expected chainId is ${this._common.chainIdBN()}`, error);
                }
            }
            throw error;
        }
        if (!tx.isSigned()) {
            throw new errors_1.InvalidArgumentsError("Invalid Signature");
        }
        if (tx instanceof tx_1.Transaction) {
            this._validateEip155HardforkRequirement(tx);
        }
        return this._sendTransactionAndReturnHash(tx);
    }
    // eth_sendTransaction
    _sendTransactionParams(params) {
        return (0, validation_1.validateParams)(params, transactionRequest_1.rpcTransactionRequest);
    }
    async _sendTransactionAction(transactionRequest) {
        const expectedChainId = this._common.chainIdBN();
        if (transactionRequest.chainId !== undefined &&
            !transactionRequest.chainId.eq(expectedChainId)) {
            throw new errors_1.InvalidArgumentsError(`Invalid chainId ${transactionRequest.chainId.toString()} provided, expected ${expectedChainId} instead.`);
        }
        this._validateTransactionAndCallRequest(transactionRequest);
        const txParams = await this._rpcTransactionRequestToNodeTransactionParams(transactionRequest);
        const tx = await this._node.getSignedTransaction(txParams);
        return this._sendTransactionAndReturnHash(tx);
    }
    // eth_sign
    _signParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, base_types_1.rpcData);
    }
    async _signAction(address, data) {
        const signature = await this._node.signPersonalMessage(new ethereumjs_util_1.Address(address), data);
        return (0, ethereumjs_util_1.toRpcSig)(signature.v, signature.r, signature.s);
    }
    // eth_signTransaction
    // eth_signTypedData_v4
    _signTypedDataV4Params(params) {
        // Validation of the TypedData parameter is handled by eth-sig-util
        return (0, validation_1.validateParams)(params, base_types_1.rpcAddress, t.any);
    }
    async _signTypedDataV4Action(address, typedData) {
        let typedMessage = typedData;
        // According to the MetaMask implementation,
        // the message parameter may be JSON stringified in versions later than V1
        // See https://github.com/MetaMask/metamask-extension/blob/0dfdd44ae7728ed02cbf32c564c75b74f37acf77/app/scripts/metamask-controller.js#L1736
        // In fact, ethers.js JSON stringifies the message at the time of writing.
        if (typeof typedData === "string") {
            try {
                typedMessage = JSON.parse(typedData);
            }
            catch (_a) {
                throw new errors_1.InvalidInputError(`The message parameter is an invalid JSON. Either pass a valid JSON or a plain object conforming to EIP712 TypedData schema.`);
            }
        }
        return this._node.signTypedDataV4(new ethereumjs_util_1.Address(address), typedMessage);
    }
    // eth_submitHashrate
    // eth_submitWork
    _subscribeParams(params) {
        if (params.length === 0) {
            throw new errors_1.InvalidInputError("Expected subscription name as first argument");
        }
        return (0, validation_1.validateParams)(params, subscribeRequest_1.rpcSubscribeRequest, filterRequest_1.optionalRpcFilterRequest);
    }
    async _subscribeAction(subscribeRequest, optionalFilterRequest) {
        switch (subscribeRequest) {
            case "newHeads":
                return (0, base_types_1.numberToRpcQuantity)(await this._node.newBlockFilter(true));
            case "newPendingTransactions":
                return (0, base_types_1.numberToRpcQuantity)(await this._node.newPendingTransactionFilter(true));
            case "logs":
                if (optionalFilterRequest === undefined) {
                    throw new errors_1.InvalidArgumentsError("missing params argument");
                }
                const filterParams = await this._rpcFilterRequestToGetLogsParams(optionalFilterRequest);
                return (0, base_types_1.numberToRpcQuantity)(await this._node.newFilter(filterParams, true));
        }
    }
    // eth_syncing
    _syncingParams(params) {
        return (0, validation_1.validateParams)(params);
    }
    async _syncingAction() {
        return false;
    }
    // eth_uninstallFilter
    _uninstallFilterParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcQuantity);
    }
    async _uninstallFilterAction(filterId) {
        return this._node.uninstallFilter(filterId, false);
    }
    // eth_unsubscribe
    _unsubscribeParams(params) {
        return (0, validation_1.validateParams)(params, base_types_1.rpcQuantity);
    }
    async _unsubscribeAction(filterId) {
        return this._node.uninstallFilter(filterId, true);
    }
    // eth_feeHistory
    _feeHistoryParams(params) {
        const [blockCount, newestBlock, rewardPercentiles] = (0, validation_1.validateParams)(params, base_types_1.rpcQuantity, blockTag_1.rpcNewBlockTag, (0, io_ts_1.optional)(t.array(base_types_1.rpcFloat)));
        if (blockCount.ltn(1)) {
            throw new errors_1.InvalidInputError(`blockCount should be at least 1`);
        }
        if (blockCount.gtn(1024)) {
            throw new errors_1.InvalidInputError(`blockCount should be at most 1024`);
        }
        if (rewardPercentiles !== undefined) {
            for (const [i, p] of rewardPercentiles.entries()) {
                if (p < 0 || p > 100) {
                    throw new errors_1.InvalidInputError(`The reward percentile number ${i + 1} is invalid. It must be a float between 0 and 100, but is ${p} instead.`);
                }
                if (i !== 0) {
                    const prev = rewardPercentiles[i - 1];
                    if (prev > p) {
                        throw new errors_1.InvalidInputError(`The reward percentiles should be in non-decreasing order, but the percentile number ${i} is greater than the next one`);
                    }
                }
            }
        }
        return [blockCount, newestBlock, rewardPercentiles];
    }
    async _feeHistoryAction(blockCount, newestBlock, rewardPercentiles) {
        var _a;
        if (!this._node.isEip1559Active()) {
            throw new errors_1.InvalidInputError(`eth_feeHistory is disabled. It only works with the London hardfork or a later one.`);
        }
        const resolvedNewestBlock = await this._resolveNewBlockTag(newestBlock);
        const feeHistory = await this._node.getFeeHistory(blockCount, resolvedNewestBlock, rewardPercentiles !== null && rewardPercentiles !== void 0 ? rewardPercentiles : []);
        const oldestBlock = (0, base_types_1.numberToRpcQuantity)(feeHistory.oldestBlock);
        const baseFeePerGas = feeHistory.baseFeePerGas.map(base_types_1.numberToRpcQuantity);
        const gasUsedRatio = feeHistory.gasUsedRatio;
        const reward = (_a = feeHistory.reward) === null || _a === void 0 ? void 0 : _a.map((rs) => rs.map(base_types_1.numberToRpcQuantity));
        return {
            oldestBlock,
            baseFeePerGas,
            gasUsedRatio,
            reward,
        };
    }
    // Utility methods
    async _rpcCallRequestToNodeCallParams(rpcCall) {
        return {
            to: rpcCall.to,
            from: rpcCall.from !== undefined
                ? rpcCall.from
                : await this._getDefaultCallFrom(),
            data: rpcCall.data !== undefined ? rpcCall.data : (0, ethereumjs_util_1.toBuffer)([]),
            gasLimit: rpcCall.gas !== undefined ? rpcCall.gas : this._node.getBlockGasLimit(),
            value: rpcCall.value !== undefined ? rpcCall.value : new ethereumjs_util_1.BN(0),
            accessList: rpcCall.accessList !== undefined
                ? this._rpcAccessListToNodeAccessList(rpcCall.accessList)
                : undefined,
            gasPrice: rpcCall.gasPrice,
            maxFeePerGas: rpcCall.maxFeePerGas,
            maxPriorityFeePerGas: rpcCall.maxPriorityFeePerGas,
        };
    }
    async _rpcTransactionRequestToNodeTransactionParams(rpcTx) {
        var _a;
        const baseParams = {
            to: rpcTx.to,
            from: rpcTx.from,
            gasLimit: rpcTx.gas !== undefined ? rpcTx.gas : this._node.getBlockGasLimit(),
            value: rpcTx.value !== undefined ? rpcTx.value : new ethereumjs_util_1.BN(0),
            data: rpcTx.data !== undefined ? rpcTx.data : (0, ethereumjs_util_1.toBuffer)([]),
            nonce: rpcTx.nonce !== undefined
                ? rpcTx.nonce
                : await this._node.getAccountNextPendingNonce(new ethereumjs_util_1.Address(rpcTx.from)),
        };
        if (this._node.isEip1559Active() &&
            (rpcTx.maxFeePerGas !== undefined ||
                rpcTx.maxPriorityFeePerGas !== undefined ||
                rpcTx.gasPrice === undefined)) {
            const accessList = rpcTx.accessList !== undefined
                ? this._rpcAccessListToNodeAccessList(rpcTx.accessList)
                : [];
            if (rpcTx.maxPriorityFeePerGas === undefined) {
                rpcTx.maxPriorityFeePerGas = await this._node.getMaxPriorityFeePerGas();
                // If you only provide a maxFeePerGas, and the suggested tip is higher
                // than that, we adjust the tip to make the tx valid
                if (rpcTx.maxFeePerGas !== undefined &&
                    rpcTx.maxFeePerGas.lt(rpcTx.maxPriorityFeePerGas)) {
                    rpcTx.maxPriorityFeePerGas = rpcTx.maxFeePerGas;
                }
            }
            if (rpcTx.maxFeePerGas === undefined) {
                const baseFeePerGas = await this._node.getNextBlockBaseFeePerGas();
                (0, assertions_1.assertHardhatNetworkInvariant)(baseFeePerGas !== undefined, "EIP-1559 transactions should only be sent if the next block has baseFeePerGas");
                rpcTx.maxFeePerGas = baseFeePerGas
                    .muln(2)
                    .add(rpcTx.maxPriorityFeePerGas);
            }
            return Object.assign(Object.assign({}, baseParams), { maxFeePerGas: rpcTx.maxFeePerGas, maxPriorityFeePerGas: rpcTx.maxPriorityFeePerGas, accessList });
        }
        const gasPrice = (_a = rpcTx.gasPrice) !== null && _a !== void 0 ? _a : (await this._node.getGasPrice());
        // AccessList params
        if (rpcTx.accessList !== undefined) {
            return Object.assign(Object.assign({}, baseParams), { gasPrice, accessList: this._rpcAccessListToNodeAccessList(rpcTx.accessList) });
        }
        // Legacy params
        return Object.assign(Object.assign({}, baseParams), { gasPrice });
    }
    _rpcAccessListToNodeAccessList(rpcAccessList) {
        return rpcAccessList.map((tuple) => {
            var _a;
            return [
                tuple.address,
                (_a = tuple.storageKeys) !== null && _a !== void 0 ? _a : [],
            ];
        });
    }
    async _resolveOldBlockTag(oldBlockTag) {
        if (oldBlockTag === undefined || oldBlockTag === "latest") {
            return this._node.getLatestBlockNumber();
        }
        if (oldBlockTag === "pending") {
            return "pending";
        }
        if (oldBlockTag === "earliest") {
            return new ethereumjs_util_1.BN(0);
        }
        const block = await this._node.getBlockByNumber(oldBlockTag);
        return block === null || block === void 0 ? void 0 : block.header.number;
    }
    async _resolveNewBlockTag(newBlockTag, defaultValue = "latest") {
        if (newBlockTag === undefined) {
            newBlockTag = defaultValue;
        }
        if (newBlockTag === "pending") {
            return "pending";
        }
        if (newBlockTag === "latest") {
            return this._node.getLatestBlockNumber();
        }
        if (newBlockTag === "earliest") {
            return new ethereumjs_util_1.BN(0);
        }
        if ("blockNumber" in newBlockTag && "blockHash" in newBlockTag) {
            throw new errors_1.InvalidArgumentsError("Invalid block tag received. Only one of hash or block number can be used.");
        }
        if ("blockNumber" in newBlockTag && "requireCanonical" in newBlockTag) {
            throw new errors_1.InvalidArgumentsError("Invalid block tag received. requireCanonical only works with hashes.");
        }
        let block;
        if (ethereumjs_util_1.BN.isBN(newBlockTag)) {
            block = await this._node.getBlockByNumber(newBlockTag);
        }
        else if ("blockNumber" in newBlockTag) {
            block = await this._node.getBlockByNumber(newBlockTag.blockNumber);
        }
        else {
            block = await this._node.getBlockByHash(newBlockTag.blockHash);
        }
        if (block === undefined) {
            const latestBlock = await this._node.getLatestBlockNumber();
            throw new errors_1.InvalidInputError(`Received invalid block tag ${this._newBlockTagToString(newBlockTag)}. Latest block number is ${latestBlock.toString()}`);
        }
        return block.header.number;
    }
    async _normalizeOldBlockTagForFilterRequest(blockTag) {
        if (blockTag === undefined ||
            blockTag === "latest" ||
            blockTag === "pending") {
            return filter_1.LATEST_BLOCK;
        }
        if (blockTag === "earliest") {
            return new ethereumjs_util_1.BN(0);
        }
        return blockTag;
    }
    _newBlockTagToString(tag) {
        if (typeof tag === "string") {
            return tag;
        }
        if (ethereumjs_util_1.BN.isBN(tag)) {
            return tag.toString();
        }
        if ("blockNumber" in tag) {
            return tag.blockNumber.toString();
        }
        return (0, ethereumjs_util_1.bufferToHex)(tag.blockHash);
    }
    _extractNormalizedLogTopics(topics) {
        if (topics === undefined || topics.length === 0) {
            return [];
        }
        const normalizedTopics = [];
        for (const topic of topics) {
            if (Buffer.isBuffer(topic)) {
                normalizedTopics.push([topic]);
            }
            else {
                normalizedTopics.push(topic);
            }
        }
        return normalizedTopics;
    }
    _extractLogAddresses(address) {
        if (address === undefined) {
            return [];
        }
        if (Buffer.isBuffer(address)) {
            return [address];
        }
        return address;
    }
    async _getDefaultCallFrom() {
        const localAccounts = await this._node.getLocalAccountAddresses();
        if (localAccounts.length === 0) {
            return (0, ethereumjs_util_1.toBuffer)((0, ethereumjs_util_1.zeroAddress)());
        }
        return (0, ethereumjs_util_1.toBuffer)(localAccounts[0]);
    }
    async _sendTransactionAndReturnHash(tx) {
        let result = await this._node.sendTransaction(tx);
        if (typeof result === "string") {
            return result;
        }
        if (Array.isArray(result)) {
            if (result.length === 1 && result[0].block.transactions.length > 1) {
                this._logger.logMultipleTransactionsWarning();
            }
            else if (result.length > 1) {
                this._logger.logMultipleBlocksWarning();
            }
        }
        else {
            if (result.block.transactions.length > 1) {
                this._logger.logMultipleTransactionsWarning();
            }
            result = [result];
        }
        try {
            await this._handleMineBlockResults(result, tx);
        }
        catch (e) {
            // This is a temporary solution until we improve our internal errors
            // We need this to be able to return the transaction hash in the JSON-RPC
            // response when the transaction fails
            e.transactionHash = (0, base_types_1.bufferToRpcData)(tx.hash());
            throw e;
        }
        return (0, base_types_1.bufferToRpcData)(tx.hash());
    }
    async _handleMineBlockResults(results, sentTx) {
        const singleTransactionMined = results.length === 1 && results[0].block.transactions.length === 1;
        if (singleTransactionMined) {
            const block = results[0].block;
            const tx = block.transactions[0];
            const txGasUsed = results[0].blockResult.results[0].gasUsed.toNumber();
            const trace = results[0].traces[0];
            await this._logSingleTransaction(tx, block, txGasUsed, trace);
            const txError = trace.error;
            if (txError !== undefined && this._throwOnTransactionFailures) {
                throw txError;
            }
        }
        else {
            // this happens when automine is enabled, a tx is sent, and there are
            // pending txs in the mempool
            for (const result of results) {
                await this._logBlock(result, sentTx);
            }
            const [sentTxResult, sentTxIndex] = this._getTransactionResultAndIndex(sentTx, results);
            const sentTxTrace = sentTxResult.traces[sentTxIndex];
            if (!singleTransactionMined) {
                const blockNumber = sentTxResult.block.header.number;
                const code = await this._node.getCodeFromTrace(sentTxTrace.trace, new ethereumjs_util_1.BN(blockNumber));
                const { block, blockResult } = sentTxResult;
                const gasUsed = blockResult.results[sentTxIndex].gasUsed.toNumber();
                this._logger.logCurrentlySentTransaction(sentTx, gasUsed, sentTxTrace, code, block);
            }
            const sentTxError = sentTxTrace.error;
            if (sentTxError !== undefined && this._throwOnTransactionFailures) {
                throw sentTxError;
            }
        }
    }
    async _logSingleTransaction(tx, block, txGasUsed, txTrace) {
        const code = await this._node.getCodeFromTrace(txTrace.trace, new ethereumjs_util_1.BN(block.header.number));
        this._logger.logSingleTransaction(tx, block, txGasUsed, txTrace, code);
        await this._runHardhatNetworkMessageTraceHooks(txTrace.trace, false);
    }
    async _logBlock(result, sentTx) {
        const { block, traces } = result;
        const codes = [];
        for (const txTrace of traces) {
            const code = await this._node.getCodeFromTrace(txTrace.trace, new ethereumjs_util_1.BN(block.header.number));
            codes.push(code);
        }
        this._logger.logBlockFromAutomine(result, codes, sentTx.hash());
        this._logger.logEmptyLine();
        for (const txTrace of traces) {
            await this._runHardhatNetworkMessageTraceHooks(txTrace.trace, false);
        }
    }
    _getTransactionResultAndIndex(tx, results) {
        for (const result of results) {
            const transactions = result.block.transactions;
            for (let i = 0; i < transactions.length; i++) {
                const blockTx = transactions[i];
                if (blockTx.hash().equals(tx.hash())) {
                    return [result, i];
                }
            }
        }
        throw new Error("The sent transaction not found in sendTransaction result, this should never happen");
    }
    async _runHardhatNetworkMessageTraceHooks(trace, isCall) {
        if (trace === undefined) {
            return;
        }
        for (const hook of this._experimentalHardhatNetworkMessageTraceHooks) {
            await hook(trace, isCall);
        }
    }
    _validateTransactionAndCallRequest(rpcRequest) {
        if ((rpcRequest.maxFeePerGas !== undefined ||
            rpcRequest.maxPriorityFeePerGas !== undefined) &&
            !this._common.gteHardfork(EIP1559_MIN_HARDFORK)) {
            throw new errors_1.InvalidArgumentsError(`EIP-1559 style fee params (maxFeePerGas or maxPriorityFeePerGas) received but they are not supported by the current hardfork. 

You can use them by running Hardhat Network with 'hardfork' ${EIP1559_MIN_HARDFORK} or later.`);
        }
        // NOTE: This validation should go after the maxFeePerGas one, as EIP-1559
        //  also accepts access list.
        if (rpcRequest.accessList !== undefined &&
            !this._common.gteHardfork(ACCESS_LIST_MIN_HARDFORK)) {
            throw new errors_1.InvalidArgumentsError(`Access list received but is not supported by the current hardfork. 
      
You can use them by running Hardhat Network with 'hardfork' ${ACCESS_LIST_MIN_HARDFORK} or later.`);
        }
        if (rpcRequest.gasPrice !== undefined &&
            rpcRequest.maxFeePerGas !== undefined) {
            throw new errors_1.InvalidInputError("Cannot send both gasPrice and maxFeePerGas params");
        }
        if (rpcRequest.gasPrice !== undefined &&
            rpcRequest.maxPriorityFeePerGas !== undefined) {
            throw new errors_1.InvalidInputError("Cannot send both gasPrice and maxPriorityFeePerGas");
        }
        if (rpcRequest.maxFeePerGas !== undefined &&
            rpcRequest.maxPriorityFeePerGas !== undefined &&
            rpcRequest.maxPriorityFeePerGas.gt(rpcRequest.maxFeePerGas)) {
            throw new errors_1.InvalidInputError(`maxPriorityFeePerGas (${rpcRequest.maxPriorityFeePerGas.toString()}) is bigger than maxFeePerGas (${rpcRequest.maxFeePerGas.toString()})`);
        }
    }
    // TODO: Find a better place for this
    _validateEip155HardforkRequirement(tx) {
        // 27 and 28 are only valid for non-EIP-155 legacy txs
        if (tx.v.eqn(27) || tx.v.eqn(28)) {
            return;
        }
        if (!this._common.gteHardfork(EIP155_MIN_HARDFORK)) {
            throw new errors_1.InvalidArgumentsError(`Trying to send an EIP-155 transaction, but they are not supported by the current hardfork.  

You can use them by running Hardhat Network with 'hardfork' ${EIP155_MIN_HARDFORK} or later.`);
        }
    }
    _validateRawTransactionHardforkRequirements(rawTx) {
        if (rawTx[0] <= 0x7f && rawTx[0] !== 1 && rawTx[0] !== 2) {
            throw new errors_1.InvalidArgumentsError(`Invalid transaction type ${rawTx[0]}.

Your raw transaction is incorrectly formatted, or Hardhat Network doesn't support this transaction type yet.`);
        }
        if (rawTx[0] === 1 && !this._common.gteHardfork(ACCESS_LIST_MIN_HARDFORK)) {
            throw new errors_1.InvalidArgumentsError(`Trying to send an EIP-2930 transaction but they are not supported by the current hard fork.

You can use them by running Hardhat Network with 'hardfork' ${ACCESS_LIST_MIN_HARDFORK} or later.`);
        }
        if (rawTx[0] === 2 && !this._common.gteHardfork(EIP1559_MIN_HARDFORK)) {
            throw new errors_1.InvalidArgumentsError(`Trying to send an EIP-1559 transaction but they are not supported by the current hard fork.

You can use them by running Hardhat Network with 'hardfork' ${EIP1559_MIN_HARDFORK} or later.`);
        }
    }
}
exports.EthModule = EthModule;
//# sourceMappingURL=eth.js.map