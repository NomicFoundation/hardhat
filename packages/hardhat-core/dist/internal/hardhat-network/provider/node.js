"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardhatNode = void 0;
const block_1 = require("@ethereumjs/block");
const common_1 = __importDefault(require("@ethereumjs/common"));
const tx_1 = require("@ethereumjs/tx");
const vm_1 = __importDefault(require("@ethereumjs/vm"));
const bloom_1 = __importDefault(require("@ethereumjs/vm/dist/bloom"));
const exceptions_1 = require("@ethereumjs/vm/dist/exceptions");
const state_1 = require("@ethereumjs/vm/dist/state");
const chalk_1 = __importDefault(require("chalk"));
const debug_1 = __importDefault(require("debug"));
const ethereumjs_util_1 = require("ethereumjs-util");
const events_1 = __importDefault(require("events"));
const constants_1 = require("../../constants");
const default_config_1 = require("../../core/config/default-config");
const errors_1 = require("../../core/errors");
const errors_2 = require("../../core/providers/errors");
const reporter_1 = require("../../sentry/reporter");
const date_1 = require("../../util/date");
const hardforks_1 = require("../../util/hardforks");
const compiler_to_model_1 = require("../stack-traces/compiler-to-model");
const consoleLogger_1 = require("../stack-traces/consoleLogger");
const contracts_identifier_1 = require("../stack-traces/contracts-identifier");
const message_trace_1 = require("../stack-traces/message-trace");
const solidity_errors_1 = require("../stack-traces/solidity-errors");
const solidity_stack_trace_1 = require("../stack-traces/solidity-stack-trace");
const solidityTracer_1 = require("../stack-traces/solidityTracer");
const vm_debug_tracer_1 = require("../stack-traces/vm-debug-tracer");
const vm_trace_decoder_1 = require("../stack-traces/vm-trace-decoder");
const vm_tracer_1 = require("../stack-traces/vm-tracer");
require("./ethereumjs-workarounds");
const base_types_1 = require("../../core/jsonrpc/types/base-types");
const filter_1 = require("./filter");
const ForkBlockchain_1 = require("./fork/ForkBlockchain");
const ForkStateManager_1 = require("./fork/ForkStateManager");
const HardhatBlockchain_1 = require("./HardhatBlockchain");
const node_types_1 = require("./node-types");
const output_1 = require("./output");
const return_data_1 = require("./return-data");
const FakeSenderAccessListEIP2930Transaction_1 = require("./transactions/FakeSenderAccessListEIP2930Transaction");
const FakeSenderEIP1559Transaction_1 = require("./transactions/FakeSenderEIP1559Transaction");
const FakeSenderTransaction_1 = require("./transactions/FakeSenderTransaction");
const TxPool_1 = require("./TxPool");
const TransactionQueue_1 = require("./TransactionQueue");
const getCurrentTimestamp_1 = require("./utils/getCurrentTimestamp");
const makeCommon_1 = require("./utils/makeCommon");
const makeForkClient_1 = require("./utils/makeForkClient");
const makeStateTrie_1 = require("./utils/makeStateTrie");
const makeForkCommon_1 = require("./utils/makeForkCommon");
const putGenesisBlock_1 = require("./utils/putGenesisBlock");
const txMapToArray_1 = require("./utils/txMapToArray");
const log = (0, debug_1.default)("hardhat:core:hardhat-network:node");
const ethSigUtil = require("eth-sig-util");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
class HardhatNode extends events_1.default {
    constructor(_vm, _stateManager, _blockchain, _txPool, _automine, _minGasPrice, _blockTimeOffsetSeconds = new ethereumjs_util_1.BN(0), _mempoolOrder, _coinbase, genesisAccounts, _configNetworkId, _configChainId, _hardforkActivations, tracingConfig, _forkNetworkId, _forkBlockNumber, nextBlockBaseFee) {
        super();
        this._vm = _vm;
        this._stateManager = _stateManager;
        this._blockchain = _blockchain;
        this._txPool = _txPool;
        this._automine = _automine;
        this._minGasPrice = _minGasPrice;
        this._blockTimeOffsetSeconds = _blockTimeOffsetSeconds;
        this._mempoolOrder = _mempoolOrder;
        this._coinbase = _coinbase;
        this._configNetworkId = _configNetworkId;
        this._configChainId = _configChainId;
        this._hardforkActivations = _hardforkActivations;
        this._forkNetworkId = _forkNetworkId;
        this._forkBlockNumber = _forkBlockNumber;
        this._localAccounts = new Map(); // address => private key
        this._impersonatedAccounts = new Set(); // address
        this._nextBlockTimestamp = new ethereumjs_util_1.BN(0);
        this._lastFilterId = new ethereumjs_util_1.BN(0);
        this._filters = new Map();
        this._nextSnapshotId = 1; // We start in 1 to mimic Ganache
        this._snapshots = [];
        this._consoleLogger = new consoleLogger_1.ConsoleLogger();
        this._failedStackTraces = 0;
        this._irregularStatesByBlockNumber = new Map(); // blockNumber as BN.toString() => state root
        this._initLocalAccounts(genesisAccounts);
        if (nextBlockBaseFee !== undefined) {
            this.setUserProvidedNextBlockBaseFeePerGas(nextBlockBaseFee);
        }
        this._vmTracer = new vm_tracer_1.VMTracer(this._vm, this._stateManager.getContractCode.bind(this._stateManager), false);
        this._vmTracer.enableTracing();
        const contractsIdentifier = new contracts_identifier_1.ContractsIdentifier();
        this._vmTraceDecoder = new vm_trace_decoder_1.VmTraceDecoder(contractsIdentifier);
        this._solidityTracer = new solidityTracer_1.SolidityTracer();
        if (tracingConfig === undefined || tracingConfig.buildInfos === undefined) {
            return;
        }
        try {
            for (const buildInfo of tracingConfig.buildInfos) {
                const bytecodes = (0, compiler_to_model_1.createModelsAndDecodeBytecodes)(buildInfo.solcVersion, buildInfo.input, buildInfo.output);
                for (const bytecode of bytecodes) {
                    this._vmTraceDecoder.addBytecode(bytecode);
                }
            }
        }
        catch (error) {
            console.warn(chalk_1.default.yellow("The Hardhat Network tracing engine could not be initialized. Run Hardhat with --verbose to learn more."));
            log("Hardhat Network tracing disabled: ContractsIdentifier failed to be initialized. Please report this to help us improve Hardhat.\n", error);
            if (error instanceof Error) {
                reporter_1.Reporter.reportError(error);
            }
        }
    }
    static async create(config) {
        const { automine, genesisAccounts, blockGasLimit, allowUnlimitedContractSize, tracingConfig, minGasPrice, mempoolOrder, networkId, chainId, } = config;
        let common;
        let stateManager;
        let blockchain;
        let initialBlockTimeOffset;
        let nextBlockBaseFeePerGas;
        let forkNetworkId;
        let forkBlockNum;
        let hardforkActivations = new Map();
        const initialBaseFeePerGasConfig = config.initialBaseFeePerGas !== undefined
            ? new ethereumjs_util_1.BN(config.initialBaseFeePerGas)
            : undefined;
        const hardfork = (0, hardforks_1.getHardforkName)(config.hardfork);
        if ((0, node_types_1.isForkedNodeConfig)(config)) {
            const { forkClient, forkBlockNumber, forkBlockTimestamp } = await (0, makeForkClient_1.makeForkClient)(config.forkConfig, config.forkCachePath);
            common = await (0, makeForkCommon_1.makeForkCommon)(config);
            forkNetworkId = forkClient.getNetworkId();
            forkBlockNum = forkBlockNumber.toNumber();
            this._validateHardforks(config.forkConfig.blockNumber, common, forkNetworkId);
            const forkStateManager = new ForkStateManager_1.ForkStateManager(forkClient, forkBlockNumber);
            await forkStateManager.initializeGenesisAccounts(genesisAccounts);
            stateManager = forkStateManager;
            blockchain = new ForkBlockchain_1.ForkBlockchain(forkClient, forkBlockNumber, common);
            initialBlockTimeOffset = new ethereumjs_util_1.BN((0, date_1.getDifferenceInSeconds)(new Date(forkBlockTimestamp), new Date()));
            // If the hardfork is London or later we need a base fee per gas for the
            // first local block. If initialBaseFeePerGas config was provided we use
            // that. Otherwise, what we do depends on the block we forked from. If
            // it's an EIP-1559 block we don't need to do anything here, as we'll
            // end up automatically computing the next base fee per gas based on it.
            if ((0, hardforks_1.hardforkGte)(hardfork, hardforks_1.HardforkName.LONDON)) {
                if (initialBaseFeePerGasConfig !== undefined) {
                    nextBlockBaseFeePerGas = initialBaseFeePerGasConfig;
                }
                else {
                    const latestBlock = await blockchain.getLatestBlock();
                    if (latestBlock.header.baseFeePerGas === undefined) {
                        nextBlockBaseFeePerGas = new ethereumjs_util_1.BN(default_config_1.HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS);
                    }
                }
            }
            if (config.chains.has(forkNetworkId)) {
                hardforkActivations = config.chains.get(forkNetworkId).hardforkHistory;
            }
        }
        else {
            const stateTrie = await (0, makeStateTrie_1.makeStateTrie)(genesisAccounts);
            common = (0, makeCommon_1.makeCommon)(config, stateTrie);
            stateManager = new state_1.DefaultStateManager({
                common,
                trie: stateTrie,
            });
            const hardhatBlockchain = new HardhatBlockchain_1.HardhatBlockchain();
            const genesisBlockBaseFeePerGas = (0, hardforks_1.hardforkGte)(hardfork, hardforks_1.HardforkName.LONDON)
                ? initialBaseFeePerGasConfig !== null && initialBaseFeePerGasConfig !== void 0 ? initialBaseFeePerGasConfig : new ethereumjs_util_1.BN(default_config_1.HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS)
                : undefined;
            await (0, putGenesisBlock_1.putGenesisBlock)(hardhatBlockchain, common, genesisBlockBaseFeePerGas);
            if (config.initialDate !== undefined) {
                initialBlockTimeOffset = new ethereumjs_util_1.BN((0, date_1.getDifferenceInSeconds)(config.initialDate, new Date()));
            }
            blockchain = hardhatBlockchain;
        }
        const txPool = new TxPool_1.TxPool(stateManager, new ethereumjs_util_1.BN(blockGasLimit), common);
        const vm = new vm_1.default({
            common,
            activatePrecompiles: true,
            stateManager,
            blockchain: blockchain,
            allowUnlimitedContractSize,
        });
        const node = new HardhatNode(vm, stateManager, blockchain, txPool, automine, minGasPrice, initialBlockTimeOffset, mempoolOrder, config.coinbase, genesisAccounts, networkId, chainId, hardforkActivations, tracingConfig, forkNetworkId, forkBlockNum, nextBlockBaseFeePerGas);
        return [common, node];
    }
    static _validateHardforks(forkBlockNumber, common, remoteChainId) {
        if (!common.gteHardfork("spuriousDragon")) {
            throw new errors_2.InternalError(`Invalid hardfork selected in Hardhat Network's config.

The hardfork must be at least spuriousDragon, but ${common.hardfork()} was given.`);
        }
        if (forkBlockNumber !== undefined) {
            let upstreamCommon;
            try {
                upstreamCommon = new common_1.default({ chain: remoteChainId });
            }
            catch (_a) {
                // If ethereumjs doesn't have a common it will throw and we won't have
                // info about the activation block of each hardfork, so we don't run
                // this validation.
                return;
            }
            upstreamCommon.setHardforkByBlockNumber(forkBlockNumber);
            if (!upstreamCommon.gteHardfork("spuriousDragon")) {
                throw new errors_2.InternalError(`Cannot fork ${upstreamCommon.chainName()} from block ${forkBlockNumber}.

Hardhat Network's forking functionality only works with blocks from at least spuriousDragon.`);
            }
        }
    }
    async getSignedTransaction(txParams) {
        const senderAddress = (0, ethereumjs_util_1.bufferToHex)(txParams.from);
        const pk = this._localAccounts.get(senderAddress);
        if (pk !== undefined) {
            let tx;
            if ("maxFeePerGas" in txParams) {
                tx = tx_1.FeeMarketEIP1559Transaction.fromTxData(txParams, {
                    common: this._vm._common,
                });
            }
            else if ("accessList" in txParams) {
                tx = tx_1.AccessListEIP2930Transaction.fromTxData(txParams, {
                    common: this._vm._common,
                });
            }
            else {
                tx = tx_1.Transaction.fromTxData(txParams, { common: this._vm._common });
            }
            return tx.sign(pk);
        }
        if (this._impersonatedAccounts.has(senderAddress)) {
            return this._getFakeTransaction(txParams);
        }
        throw new errors_2.InvalidInputError(`unknown account ${senderAddress}`);
    }
    async sendTransaction(tx) {
        if (!this._automine) {
            return this._addPendingTransaction(tx);
        }
        await this._validateAutominedTx(tx);
        if (this._txPool.hasPendingTransactions() ||
            this._txPool.hasQueuedTransactions()) {
            return this._mineTransactionAndPending(tx);
        }
        return this._mineTransaction(tx);
    }
    async mineBlock(timestamp) {
        const [blockTimestamp, offsetShouldChange, newOffset] = this._calculateTimestampAndOffset(timestamp);
        const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(blockTimestamp);
        if (needsTimestampIncrease) {
            blockTimestamp.iaddn(1);
        }
        let result;
        try {
            result = await this._mineBlockWithPendingTxs(blockTimestamp);
        }
        catch (err) {
            if (err instanceof Error) {
                if (err === null || err === void 0 ? void 0 : err.message.includes("sender doesn't have enough funds")) {
                    throw new errors_2.InvalidInputError(err.message, err);
                }
                // Some network errors are HardhatErrors, and can end up here when forking
                if (errors_1.HardhatError.isHardhatError(err)) {
                    throw err;
                }
                throw new errors_2.TransactionExecutionError(err);
            }
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw err;
        }
        await this._saveBlockAsSuccessfullyRun(result.block, result.blockResult);
        if (needsTimestampIncrease) {
            this.increaseTime(new ethereumjs_util_1.BN(1));
        }
        if (offsetShouldChange) {
            this.setTimeIncrement(newOffset);
        }
        this._resetNextBlockTimestamp();
        this._resetUserProvidedNextBlockBaseFeePerGas();
        return result;
    }
    async runCall(call, blockNumberOrPending) {
        var _a, _b, _c, _d;
        let txParams;
        const nonce = await this._getNonce(new ethereumjs_util_1.Address(call.from), blockNumberOrPending);
        if (call.gasPrice !== undefined ||
            !this.isEip1559Active(blockNumberOrPending)) {
            txParams = Object.assign({ gasPrice: new ethereumjs_util_1.BN(0), nonce }, call);
        }
        else {
            const maxFeePerGas = (_b = (_a = call.maxFeePerGas) !== null && _a !== void 0 ? _a : call.maxPriorityFeePerGas) !== null && _b !== void 0 ? _b : new ethereumjs_util_1.BN(0);
            const maxPriorityFeePerGas = (_c = call.maxPriorityFeePerGas) !== null && _c !== void 0 ? _c : new ethereumjs_util_1.BN(0);
            txParams = Object.assign(Object.assign({}, call), { nonce,
                maxFeePerGas,
                maxPriorityFeePerGas, accessList: (_d = call.accessList) !== null && _d !== void 0 ? _d : [] });
        }
        const tx = await this._getFakeTransaction(txParams);
        const result = await this._runInBlockContext(blockNumberOrPending, async () => this._runTxAndRevertMutations(tx, blockNumberOrPending, true));
        const traces = await this._gatherTraces(result.execResult);
        return Object.assign(Object.assign({}, traces), { result: new return_data_1.ReturnData(result.execResult.returnValue) });
    }
    async getAccountBalance(address, blockNumberOrPending) {
        if (blockNumberOrPending === undefined) {
            blockNumberOrPending = await this.getLatestBlockNumber();
        }
        const account = await this._runInBlockContext(blockNumberOrPending, () => this._stateManager.getAccount(address));
        return new ethereumjs_util_1.BN(account.balance);
    }
    async getNextConfirmedNonce(address, blockNumberOrPending) {
        const account = await this._runInBlockContext(blockNumberOrPending, () => this._stateManager.getAccount(address));
        return new ethereumjs_util_1.BN(account.nonce);
    }
    async getAccountNextPendingNonce(address) {
        return this._txPool.getNextPendingNonce(address);
    }
    async getCodeFromTrace(trace, blockNumberOrPending) {
        if (trace === undefined ||
            (0, message_trace_1.isPrecompileTrace)(trace) ||
            (0, message_trace_1.isCreateTrace)(trace)) {
            return Buffer.from("");
        }
        return this.getCode(new ethereumjs_util_1.Address(trace.address), blockNumberOrPending);
    }
    async getLatestBlock() {
        return this._blockchain.getLatestBlock();
    }
    async getLatestBlockNumber() {
        return new ethereumjs_util_1.BN((await this.getLatestBlock()).header.number);
    }
    async getPendingBlockAndTotalDifficulty() {
        return this._runInPendingBlockContext(async () => {
            const block = await this._blockchain.getLatestBlock();
            const totalDifficulty = await this._blockchain.getTotalDifficulty(block.hash());
            return [block, totalDifficulty];
        });
    }
    async getLocalAccountAddresses() {
        return [...this._localAccounts.keys()];
    }
    getBlockGasLimit() {
        return this._txPool.getBlockGasLimit();
    }
    async estimateGas(callParams, blockNumberOrPending) {
        var _a, _b;
        // We get the CallParams and transform it into a TransactionParams to be
        // able to run it.
        const nonce = await this._getNonce(new ethereumjs_util_1.Address(callParams.from), blockNumberOrPending);
        // TODO: This is more complex in Geth, we should make sure we aren't missing
        //  anything here.
        const feePriceFields = await this._getEstimateGasFeePriceFields(callParams, blockNumberOrPending);
        let txParams;
        if ("gasPrice" in feePriceFields) {
            if (callParams.accessList === undefined) {
                // Legacy tx
                txParams = Object.assign(Object.assign({}, callParams), { nonce, gasPrice: feePriceFields.gasPrice });
            }
            else {
                // Access list tx
                txParams = Object.assign(Object.assign({}, callParams), { nonce, gasPrice: feePriceFields.gasPrice, accessList: (_a = callParams.accessList) !== null && _a !== void 0 ? _a : [] });
            }
        }
        else {
            // EIP-1559 tx
            txParams = Object.assign(Object.assign({}, callParams), { nonce, maxFeePerGas: feePriceFields.maxFeePerGas, maxPriorityFeePerGas: feePriceFields.maxPriorityFeePerGas, accessList: (_b = callParams.accessList) !== null && _b !== void 0 ? _b : [] });
        }
        const tx = await this._getFakeTransaction(txParams);
        // TODO: This may not work if there are multiple txs in the mempool and
        //  the one being estimated won't fit in the first block, or maybe even
        //  if the state accessed by the tx changes after it is executed within
        //  the first block.
        const result = await this._runInBlockContext(blockNumberOrPending, () => this._runTxAndRevertMutations(tx, blockNumberOrPending));
        let vmTrace = this._vmTracer.getLastTopLevelMessageTrace();
        const vmTracerError = this._vmTracer.getLastError();
        this._vmTracer.clearLastError();
        if (vmTrace !== undefined) {
            vmTrace = this._vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
        }
        const consoleLogMessages = await this._getConsoleLogMessages(vmTrace, vmTracerError);
        // This is only considered if the call to _runTxAndRevertMutations doesn't
        // manage errors
        if (result.execResult.exceptionError !== undefined) {
            return {
                estimation: this.getBlockGasLimit(),
                trace: vmTrace,
                error: await this._manageErrors(result.execResult, vmTrace, vmTracerError),
                consoleLogMessages,
            };
        }
        const initialEstimation = result.gasUsed;
        return {
            estimation: await this._correctInitialEstimation(blockNumberOrPending, txParams, initialEstimation),
            trace: vmTrace,
            consoleLogMessages,
        };
    }
    async getGasPrice() {
        const nextBlockBaseFeePerGas = await this.getNextBlockBaseFeePerGas();
        if (nextBlockBaseFeePerGas === undefined) {
            // We return a hardcoded value for networks without EIP-1559
            return new ethereumjs_util_1.BN(8e9);
        }
        const suggestedPriorityFeePerGas = new ethereumjs_util_1.BN(1e9);
        return nextBlockBaseFeePerGas.add(suggestedPriorityFeePerGas);
    }
    async getMaxPriorityFeePerGas() {
        return new ethereumjs_util_1.BN(default_config_1.HARDHAT_NETWORK_DEFAULT_MAX_PRIORITY_FEE_PER_GAS);
    }
    getCoinbaseAddress() {
        return ethereumjs_util_1.Address.fromString(this._coinbase);
    }
    async getStorageAt(address, positionIndex, blockNumberOrPending) {
        const key = positionIndex.toArrayLike(Buffer, "be", 32);
        const data = await this._runInBlockContext(blockNumberOrPending, () => this._stateManager.getContractStorage(address, key));
        const EXPECTED_DATA_SIZE = 32;
        if (data.length < EXPECTED_DATA_SIZE) {
            return Buffer.concat([Buffer.alloc(EXPECTED_DATA_SIZE - data.length, 0), data], EXPECTED_DATA_SIZE);
        }
        return data;
    }
    async getBlockByNumber(blockNumberOrPending) {
        if (blockNumberOrPending === "pending") {
            return this._runInPendingBlockContext(() => this._blockchain.getLatestBlock());
        }
        const block = await this._blockchain.getBlock(blockNumberOrPending);
        return block !== null && block !== void 0 ? block : undefined;
    }
    async getBlockByHash(blockHash) {
        const block = await this._blockchain.getBlock(blockHash);
        return block !== null && block !== void 0 ? block : undefined;
    }
    async getBlockByTransactionHash(hash) {
        const block = await this._blockchain.getBlockByTransactionHash(hash);
        return block !== null && block !== void 0 ? block : undefined;
    }
    async getBlockTotalDifficulty(block) {
        return this._blockchain.getTotalDifficulty(block.hash());
    }
    async getCode(address, blockNumberOrPending) {
        return this._runInBlockContext(blockNumberOrPending, () => this._stateManager.getContractCode(address));
    }
    getNextBlockTimestamp() {
        return this._nextBlockTimestamp.clone();
    }
    setNextBlockTimestamp(timestamp) {
        this._nextBlockTimestamp = new ethereumjs_util_1.BN(timestamp);
    }
    getTimeIncrement() {
        return this._blockTimeOffsetSeconds.clone();
    }
    setTimeIncrement(timeIncrement) {
        this._blockTimeOffsetSeconds = timeIncrement;
    }
    increaseTime(increment) {
        this._blockTimeOffsetSeconds = this._blockTimeOffsetSeconds.add(increment);
    }
    setUserProvidedNextBlockBaseFeePerGas(baseFeePerGas) {
        this._userProvidedNextBlockBaseFeePerGas = baseFeePerGas;
    }
    getUserProvidedNextBlockBaseFeePerGas() {
        return this._userProvidedNextBlockBaseFeePerGas;
    }
    _resetUserProvidedNextBlockBaseFeePerGas() {
        this._userProvidedNextBlockBaseFeePerGas = undefined;
    }
    async getNextBlockBaseFeePerGas() {
        if (!this.isEip1559Active()) {
            return undefined;
        }
        const userDefined = this.getUserProvidedNextBlockBaseFeePerGas();
        if (userDefined !== undefined) {
            return userDefined;
        }
        const latestBlock = await this.getLatestBlock();
        return latestBlock.header.calcNextBaseFee();
    }
    async getPendingTransaction(hash) {
        var _a;
        return (_a = this._txPool.getTransactionByHash(hash)) === null || _a === void 0 ? void 0 : _a.data;
    }
    async getTransactionReceipt(hash) {
        const hashBuffer = hash instanceof Buffer ? hash : (0, ethereumjs_util_1.toBuffer)(hash);
        const receipt = await this._blockchain.getTransactionReceipt(hashBuffer);
        return receipt !== null && receipt !== void 0 ? receipt : undefined;
    }
    async getPendingTransactions() {
        const txPoolPending = (0, txMapToArray_1.txMapToArray)(this._txPool.getPendingTransactions());
        const txPoolQueued = (0, txMapToArray_1.txMapToArray)(this._txPool.getQueuedTransactions());
        return txPoolPending.concat(txPoolQueued);
    }
    async signPersonalMessage(address, data) {
        const messageHash = (0, ethereumjs_util_1.hashPersonalMessage)(data);
        const privateKey = this._getLocalAccountPrivateKey(address);
        return (0, ethereumjs_util_1.ecsign)(messageHash, privateKey);
    }
    async signTypedDataV4(address, typedData) {
        const privateKey = this._getLocalAccountPrivateKey(address);
        return ethSigUtil.signTypedData_v4(privateKey, {
            data: typedData,
        });
    }
    getStackTraceFailuresCount() {
        return this._failedStackTraces;
    }
    async takeSnapshot() {
        const id = this._nextSnapshotId;
        const snapshot = {
            id,
            date: new Date(),
            latestBlock: await this.getLatestBlock(),
            stateRoot: await this._stateManager.getStateRoot(),
            txPoolSnapshotId: this._txPool.snapshot(),
            blockTimeOffsetSeconds: this.getTimeIncrement(),
            nextBlockTimestamp: this.getNextBlockTimestamp(),
            irregularStatesByBlockNumber: this._irregularStatesByBlockNumber,
            userProvidedNextBlockBaseFeePerGas: this.getUserProvidedNextBlockBaseFeePerGas(),
            coinbase: this.getCoinbaseAddress().toString(),
        };
        this._irregularStatesByBlockNumber = new Map(this._irregularStatesByBlockNumber);
        this._snapshots.push(snapshot);
        this._nextSnapshotId += 1;
        return id;
    }
    async revertToSnapshot(id) {
        const snapshotIndex = this._getSnapshotIndex(id);
        if (snapshotIndex === undefined) {
            return false;
        }
        const snapshot = this._snapshots[snapshotIndex];
        // We compute a new offset such that
        //  now + new_offset === snapshot_date + old_offset
        const now = new Date();
        const offsetToSnapshotInMillis = snapshot.date.valueOf() - now.valueOf();
        const offsetToSnapshotInSecs = Math.ceil(offsetToSnapshotInMillis / 1000);
        const newOffset = snapshot.blockTimeOffsetSeconds.addn(offsetToSnapshotInSecs);
        // We delete all following blocks, changes the state root, and all the
        // relevant Node fields.
        //
        // Note: There's no need to copy the maps here, as snapshots can only be
        // used once
        this._blockchain.deleteLaterBlocks(snapshot.latestBlock);
        this._irregularStatesByBlockNumber = snapshot.irregularStatesByBlockNumber;
        const irregularStateOrUndefined = this._irregularStatesByBlockNumber.get((await this.getLatestBlock()).header.number.toString());
        await this._stateManager.setStateRoot(irregularStateOrUndefined !== null && irregularStateOrUndefined !== void 0 ? irregularStateOrUndefined : snapshot.stateRoot);
        this.setTimeIncrement(newOffset);
        this.setNextBlockTimestamp(snapshot.nextBlockTimestamp);
        this._txPool.revert(snapshot.txPoolSnapshotId);
        if (snapshot.userProvidedNextBlockBaseFeePerGas) {
            this.setUserProvidedNextBlockBaseFeePerGas(snapshot.userProvidedNextBlockBaseFeePerGas);
        }
        else {
            this._resetUserProvidedNextBlockBaseFeePerGas();
        }
        this._coinbase = snapshot.coinbase;
        // We delete this and the following snapshots, as they can only be used
        // once in Ganache
        this._snapshots.splice(snapshotIndex);
        return true;
    }
    async newFilter(filterParams, isSubscription) {
        filterParams = await this._computeFilterParams(filterParams, true);
        const filterId = this._getNextFilterId();
        this._filters.set(this._filterIdToFiltersKey(filterId), {
            id: filterId,
            type: filter_1.Type.LOGS_SUBSCRIPTION,
            criteria: {
                fromBlock: filterParams.fromBlock,
                toBlock: filterParams.toBlock,
                addresses: filterParams.addresses,
                normalizedTopics: filterParams.normalizedTopics,
            },
            deadline: this._newDeadline(),
            hashes: [],
            logs: await this.getLogs(filterParams),
            subscription: isSubscription,
        });
        return filterId;
    }
    async newBlockFilter(isSubscription) {
        const block = await this.getLatestBlock();
        const filterId = this._getNextFilterId();
        this._filters.set(this._filterIdToFiltersKey(filterId), {
            id: filterId,
            type: filter_1.Type.BLOCK_SUBSCRIPTION,
            deadline: this._newDeadline(),
            hashes: [(0, ethereumjs_util_1.bufferToHex)(block.header.hash())],
            logs: [],
            subscription: isSubscription,
        });
        return filterId;
    }
    async newPendingTransactionFilter(isSubscription) {
        const filterId = this._getNextFilterId();
        this._filters.set(this._filterIdToFiltersKey(filterId), {
            id: filterId,
            type: filter_1.Type.PENDING_TRANSACTION_SUBSCRIPTION,
            deadline: this._newDeadline(),
            hashes: [],
            logs: [],
            subscription: isSubscription,
        });
        return filterId;
    }
    async uninstallFilter(filterId, subscription) {
        const key = this._filterIdToFiltersKey(filterId);
        const filter = this._filters.get(key);
        if (filter === undefined) {
            return false;
        }
        if ((filter.subscription && !subscription) ||
            (!filter.subscription && subscription)) {
            return false;
        }
        this._filters.delete(key);
        return true;
    }
    async getFilterChanges(filterId) {
        const key = this._filterIdToFiltersKey(filterId);
        const filter = this._filters.get(key);
        if (filter === undefined) {
            return undefined;
        }
        filter.deadline = this._newDeadline();
        switch (filter.type) {
            case filter_1.Type.BLOCK_SUBSCRIPTION:
            case filter_1.Type.PENDING_TRANSACTION_SUBSCRIPTION:
                const hashes = filter.hashes;
                filter.hashes = [];
                return hashes;
            case filter_1.Type.LOGS_SUBSCRIPTION:
                const logs = filter.logs;
                filter.logs = [];
                return logs;
        }
        return undefined;
    }
    async getFilterLogs(filterId) {
        const key = this._filterIdToFiltersKey(filterId);
        const filter = this._filters.get(key);
        if (filter === undefined) {
            return undefined;
        }
        const logs = filter.logs;
        filter.logs = [];
        filter.deadline = this._newDeadline();
        return logs;
    }
    async getLogs(filterParams) {
        filterParams = await this._computeFilterParams(filterParams, false);
        return this._blockchain.getLogs(filterParams);
    }
    async addCompilationResult(solcVersion, compilerInput, compilerOutput) {
        let bytecodes;
        try {
            bytecodes = (0, compiler_to_model_1.createModelsAndDecodeBytecodes)(solcVersion, compilerInput, compilerOutput);
        }
        catch (error) {
            console.warn(chalk_1.default.yellow("The Hardhat Network tracing engine could not be updated. Run Hardhat with --verbose to learn more."));
            log("ContractsIdentifier failed to be updated. Please report this to help us improve Hardhat.\n", error);
            return false;
        }
        for (const bytecode of bytecodes) {
            this._vmTraceDecoder.addBytecode(bytecode);
        }
        return true;
    }
    addImpersonatedAccount(address) {
        this._impersonatedAccounts.add((0, ethereumjs_util_1.bufferToHex)(address));
        return true;
    }
    removeImpersonatedAccount(address) {
        return this._impersonatedAccounts.delete((0, ethereumjs_util_1.bufferToHex)(address));
    }
    setAutomine(automine) {
        this._automine = automine;
    }
    getAutomine() {
        return this._automine;
    }
    async setBlockGasLimit(gasLimit) {
        this._txPool.setBlockGasLimit(gasLimit);
        await this._txPool.updatePendingAndQueued();
    }
    async setMinGasPrice(minGasPrice) {
        this._minGasPrice = minGasPrice;
    }
    async dropTransaction(hash) {
        const removed = this._txPool.removeTransaction(hash);
        if (removed) {
            return true;
        }
        const isTransactionMined = await this._isTransactionMined(hash);
        if (isTransactionMined) {
            throw new errors_2.InvalidArgumentsError(`Transaction ${(0, ethereumjs_util_1.bufferToHex)(hash)} cannot be dropped because it's already mined`);
        }
        return false;
    }
    async setAccountBalance(address, newBalance) {
        const account = await this._stateManager.getAccount(address);
        account.balance = newBalance;
        await this._stateManager.putAccount(address, account);
        await this._persistIrregularWorldState();
    }
    async setAccountCode(address, newCode) {
        await this._stateManager.putContractCode(address, newCode);
        await this._persistIrregularWorldState();
    }
    async setNextConfirmedNonce(address, newNonce) {
        if (!this._txPool.isEmpty()) {
            throw new errors_2.InternalError("Cannot set account nonce when the transaction pool is not empty");
        }
        const account = await this._stateManager.getAccount(address);
        if (newNonce.lt(account.nonce)) {
            throw new errors_2.InvalidInputError(`New nonce (${newNonce.toString()}) must not be smaller than the existing nonce (${account.nonce.toString()})`);
        }
        account.nonce = newNonce;
        await this._stateManager.putAccount(address, account);
        await this._persistIrregularWorldState();
    }
    async setStorageAt(address, positionIndex, value) {
        await this._stateManager.putContractStorage(address, positionIndex.toArrayLike(Buffer, "be", 32), value);
        await this._persistIrregularWorldState();
    }
    async traceTransaction(hash, config) {
        const block = await this.getBlockByTransactionHash(hash);
        if (block === undefined) {
            throw new errors_2.InvalidInputError(`Unable to find a block containing transaction ${(0, ethereumjs_util_1.bufferToHex)(hash)}`);
        }
        return this._runInBlockContext(new ethereumjs_util_1.BN(block.header.number).subn(1), async () => {
            const blockNumber = block.header.number.toNumber();
            const blockchain = this._blockchain;
            let vm = this._vm;
            if (blockchain instanceof ForkBlockchain_1.ForkBlockchain &&
                blockNumber <= blockchain.getForkBlockNumber().toNumber()) {
                (0, errors_1.assertHardhatInvariant)(this._forkNetworkId !== undefined, "this._forkNetworkId should exist if the blockchain is an instance of ForkBlockchain");
                const common = this._getCommonForTracing(this._forkNetworkId, blockNumber);
                vm = new vm_1.default({
                    common,
                    activatePrecompiles: true,
                    stateManager: this._vm.stateManager,
                    blockchain: this._vm.blockchain,
                });
            }
            // We don't support tracing transactions before the spuriousDragon fork
            // to avoid having to distinguish between empty and non-existing accounts.
            // We *could* do it during the non-forked mode, but for simplicity we just
            // don't support it at all.
            const isPreSpuriousDragon = !vm._common.gteHardfork("spuriousDragon");
            if (isPreSpuriousDragon) {
                throw new errors_2.InvalidInputError("Tracing is not supported for transactions using hardforks older than Spurious Dragon. ");
            }
            for (const tx of block.transactions) {
                let txWithCommon;
                const sender = tx.getSenderAddress();
                if (tx.type === 0) {
                    txWithCommon = new FakeSenderTransaction_1.FakeSenderTransaction(sender, tx, {
                        common: vm._common,
                    });
                }
                else if (tx.type === 1) {
                    txWithCommon = new FakeSenderAccessListEIP2930Transaction_1.FakeSenderAccessListEIP2930Transaction(sender, tx, {
                        common: vm._common,
                    });
                }
                else if (tx.type === 2) {
                    txWithCommon = new FakeSenderEIP1559Transaction_1.FakeSenderEIP1559Transaction(sender, Object.assign(Object.assign({}, tx), { gasPrice: undefined }), {
                        common: vm._common,
                    });
                }
                else {
                    throw new errors_2.InternalError("Only legacy, EIP2930, and EIP1559 txs are supported");
                }
                const txHash = txWithCommon.hash();
                if (txHash.equals(hash)) {
                    const vmDebugTracer = new vm_debug_tracer_1.VMDebugTracer(vm);
                    return vmDebugTracer.trace(async () => {
                        await vm.runTx({ tx: txWithCommon, block });
                    }, config);
                }
                await vm.runTx({ tx: txWithCommon, block });
            }
            throw new errors_2.TransactionExecutionError(`Unable to find a transaction in a block that contains that transaction, this should never happen`);
        });
    }
    async getFeeHistory(blockCount, newestBlock, rewardPercentiles) {
        var _a;
        const latestBlock = await this.getLatestBlockNumber();
        const pendingBlockNumber = latestBlock.addn(1);
        const resolvedNewestBlock = newestBlock === "pending" ? pendingBlockNumber : newestBlock;
        const oldestBlock = ethereumjs_util_1.BN.max(resolvedNewestBlock.sub(blockCount).addn(1), new ethereumjs_util_1.BN(0));
        const baseFeePerGas = [];
        const gasUsedRatio = [];
        const reward = [];
        const lastBlock = resolvedNewestBlock.addn(1);
        // We get the pending block here, and only if necessary, as it's something
        // constly to do.
        let pendingBlock;
        if (lastBlock.gte(pendingBlockNumber)) {
            pendingBlock = await this.getBlockByNumber("pending");
        }
        for (let blockNumber = oldestBlock; blockNumber.lte(lastBlock); blockNumber = blockNumber.addn(1)) {
            if (blockNumber.lt(pendingBlockNumber)) {
                // We know the block exists
                const block = (await this.getBlockByNumber(blockNumber));
                baseFeePerGas.push((_a = block.header.baseFeePerGas) !== null && _a !== void 0 ? _a : new ethereumjs_util_1.BN(0));
                if (blockNumber.lt(lastBlock)) {
                    gasUsedRatio.push(this._getGasUsedRatio(block));
                    if (rewardPercentiles.length > 0) {
                        reward.push(await this._getRewards(block, rewardPercentiles));
                    }
                }
            }
            else if (blockNumber.eq(pendingBlockNumber)) {
                // This can only be run with EIP-1559, so this exists
                baseFeePerGas.push((await this.getNextBlockBaseFeePerGas()));
                if (blockNumber.lt(lastBlock)) {
                    gasUsedRatio.push(this._getGasUsedRatio(pendingBlock));
                    if (rewardPercentiles.length > 0) {
                        // We don't compute this for the pending block, as there's no
                        // effective miner fee yet.
                        reward.push(rewardPercentiles.map((_) => new ethereumjs_util_1.BN(0)));
                    }
                }
            }
            else if (blockNumber.eq(pendingBlockNumber.addn(1))) {
                baseFeePerGas.push(pendingBlock.header.calcNextBaseFee());
            }
            else {
                (0, errors_1.assertHardhatInvariant)(false, "This should never happen");
            }
        }
        return {
            oldestBlock,
            baseFeePerGas,
            gasUsedRatio,
            reward: rewardPercentiles.length > 0 ? reward : undefined,
        };
    }
    async setCoinbase(coinbase) {
        this._coinbase = coinbase.toString();
    }
    _getGasUsedRatio(block) {
        const FLOATS_PRECISION = 100000;
        return (block.header.gasUsed
            .muln(FLOATS_PRECISION)
            .div(block.header.gasLimit)
            .toNumber() / FLOATS_PRECISION);
    }
    async _getRewards(block, rewardPercentiles) {
        const FLOATS_PRECISION = 100000;
        if (block.transactions.length === 0) {
            return rewardPercentiles.map((_) => new ethereumjs_util_1.BN(0));
        }
        const receipts = await Promise.all(block.transactions
            .map((tx) => tx.hash())
            .map((hash) => this.getTransactionReceipt(hash)));
        const effectiveGasRewardAndGas = receipts
            .map((r, i) => {
            var _a;
            const tx = block.transactions[i];
            const baseFeePerGas = (_a = block.header.baseFeePerGas) !== null && _a !== void 0 ? _a : new ethereumjs_util_1.BN(0);
            // reward = min(maxPriorityFeePerGas, maxFeePerGas - baseFeePerGas)
            let effectiveGasReward;
            if ("maxPriorityFeePerGas" in tx) {
                effectiveGasReward = tx.maxFeePerGas.sub(baseFeePerGas);
                if (tx.maxPriorityFeePerGas.lt(effectiveGasReward)) {
                    effectiveGasReward = tx.maxPriorityFeePerGas;
                }
            }
            else {
                effectiveGasReward = tx.gasPrice.sub(baseFeePerGas);
            }
            return {
                effectiveGasReward,
                gasUsed: (0, base_types_1.rpcQuantityToBN)(r === null || r === void 0 ? void 0 : r.gasUsed),
            };
        })
            .sort((a, b) => a.effectiveGasReward.cmp(b.effectiveGasReward));
        return rewardPercentiles.map((p) => {
            let gasUsed = new ethereumjs_util_1.BN(0);
            const targetGas = block.header.gasLimit
                .muln(Math.ceil(p * FLOATS_PRECISION))
                .divn(100 * FLOATS_PRECISION);
            for (const values of effectiveGasRewardAndGas) {
                gasUsed = gasUsed.add(values.gasUsed);
                if (targetGas.lte(gasUsed)) {
                    return values.effectiveGasReward;
                }
            }
            return effectiveGasRewardAndGas[effectiveGasRewardAndGas.length - 1]
                .effectiveGasReward;
        });
    }
    async _addPendingTransaction(tx) {
        await this._txPool.addTransaction(tx);
        await this._notifyPendingTransaction(tx);
        return (0, ethereumjs_util_1.bufferToHex)(tx.hash());
    }
    async _mineTransaction(tx) {
        await this._addPendingTransaction(tx);
        return this.mineBlock();
    }
    async _mineTransactionAndPending(tx) {
        const snapshotId = await this.takeSnapshot();
        let result;
        try {
            const txHash = await this._addPendingTransaction(tx);
            result = await this._mineBlocksUntilTransactionIsIncluded(txHash);
        }
        catch (err) {
            await this.revertToSnapshot(snapshotId);
            throw err;
        }
        this._removeSnapshot(snapshotId);
        return result;
    }
    async _mineBlocksUntilTransactionIsIncluded(txHash) {
        const results = [];
        let txReceipt;
        do {
            if (!this._txPool.hasPendingTransactions()) {
                throw new errors_2.TransactionExecutionError("Failed to mine transaction for unknown reason, this should never happen");
            }
            results.push(await this.mineBlock());
            txReceipt = await this.getTransactionReceipt(txHash);
        } while (txReceipt === undefined);
        while (this._txPool.hasPendingTransactions()) {
            results.push(await this.mineBlock());
        }
        return results;
    }
    async _gatherTraces(result) {
        let vmTrace = this._vmTracer.getLastTopLevelMessageTrace();
        const vmTracerError = this._vmTracer.getLastError();
        this._vmTracer.clearLastError();
        if (vmTrace !== undefined) {
            vmTrace = this._vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
        }
        const consoleLogMessages = await this._getConsoleLogMessages(vmTrace, vmTracerError);
        const error = await this._manageErrors(result, vmTrace, vmTracerError);
        return {
            trace: vmTrace,
            consoleLogMessages,
            error,
        };
    }
    async _validateAutominedTx(tx) {
        let sender;
        try {
            sender = tx.getSenderAddress(); // verifies signature as a side effect
        }
        catch (e) {
            if (e instanceof Error) {
                throw new errors_2.InvalidInputError(e.message);
            }
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw e;
        }
        // validate nonce
        const nextPendingNonce = await this._txPool.getNextPendingNonce(sender);
        const txNonce = new ethereumjs_util_1.BN(tx.nonce);
        const expectedNonceMsg = `Expected nonce to be ${nextPendingNonce} but got ${txNonce}.`;
        if (txNonce.gt(nextPendingNonce)) {
            throw new errors_2.InvalidInputError(`Nonce too high. ${expectedNonceMsg} Note that transactions can't be queued when automining.`);
        }
        if (txNonce.lt(nextPendingNonce)) {
            throw new errors_2.InvalidInputError(`Nonce too low. ${expectedNonceMsg}`);
        }
        // validate gas price
        const txPriorityFee = new ethereumjs_util_1.BN("gasPrice" in tx ? tx.gasPrice : tx.maxPriorityFeePerGas);
        if (txPriorityFee.lt(this._minGasPrice)) {
            throw new errors_2.InvalidInputError(`Transaction gas price is ${txPriorityFee}, which is below the minimum of ${this._minGasPrice}`);
        }
        // Validate that maxFeePerGas >= next block's baseFee
        const nextBlockGasFee = await this.getNextBlockBaseFeePerGas();
        if (nextBlockGasFee !== undefined) {
            if ("maxFeePerGas" in tx) {
                if (nextBlockGasFee.gt(tx.maxFeePerGas)) {
                    throw new errors_2.InvalidInputError(`Transaction maxFeePerGas (${tx.maxFeePerGas}) is too low for the next block, which has a baseFeePerGas of ${nextBlockGasFee}`);
                }
            }
            else {
                if (nextBlockGasFee.gt(tx.gasPrice)) {
                    throw new errors_2.InvalidInputError(`Transaction gasPrice (${tx.gasPrice}) is too low for the next block, which has a baseFeePerGas of ${nextBlockGasFee}`);
                }
            }
        }
    }
    /**
     * Mines a new block with as many pending txs as possible, adding it to
     * the VM's blockchain.
     *
     * This method reverts any modification to the state manager if it throws.
     */
    async _mineBlockWithPendingTxs(blockTimestamp) {
        const parentBlock = await this.getLatestBlock();
        const headerData = {
            gasLimit: this.getBlockGasLimit(),
            coinbase: this.getCoinbaseAddress(),
            nonce: "0x0000000000000042",
            timestamp: blockTimestamp,
        };
        headerData.baseFeePerGas = await this.getNextBlockBaseFeePerGas();
        const blockBuilder = await this._vm.buildBlock({
            parentBlock,
            headerData,
            blockOpts: { calcDifficultyFromHeader: parentBlock.header },
        });
        try {
            const traces = [];
            const blockGasLimit = this.getBlockGasLimit();
            const minTxFee = this._getMinimalTransactionFee();
            const pendingTxs = this._txPool.getPendingTransactions();
            const transactionQueue = new TransactionQueue_1.TransactionQueue(pendingTxs, this._mempoolOrder, headerData.baseFeePerGas);
            let tx = transactionQueue.getNextTransaction();
            const results = [];
            const receipts = [];
            while (blockGasLimit.sub(blockBuilder.gasUsed).gte(minTxFee) &&
                tx !== undefined) {
                if (!this._isTxMinable(tx, headerData.baseFeePerGas) ||
                    tx.gasLimit.gt(blockGasLimit.sub(blockBuilder.gasUsed))) {
                    transactionQueue.removeLastSenderTransactions();
                }
                else {
                    const txResult = await blockBuilder.addTransaction(tx);
                    traces.push(await this._gatherTraces(txResult.execResult));
                    results.push(txResult);
                    receipts.push(txResult.receipt);
                }
                tx = transactionQueue.getNextTransaction();
            }
            const block = await blockBuilder.build();
            await this._txPool.updatePendingAndQueued();
            return {
                block,
                blockResult: {
                    results,
                    receipts,
                    stateRoot: block.header.stateRoot,
                    logsBloom: block.header.bloom,
                    receiptRoot: block.header.receiptTrie,
                    gasUsed: block.header.gasUsed,
                },
                traces,
            };
        }
        catch (err) {
            await blockBuilder.revert();
            throw err;
        }
    }
    _getMinimalTransactionFee() {
        // Typically 21_000 gas
        return new ethereumjs_util_1.BN(this._vm._common.param("gasPrices", "tx"));
    }
    async _getFakeTransaction(txParams) {
        const sender = new ethereumjs_util_1.Address(txParams.from);
        if ("maxFeePerGas" in txParams && txParams.maxFeePerGas !== undefined) {
            return new FakeSenderEIP1559Transaction_1.FakeSenderEIP1559Transaction(sender, txParams, {
                common: this._vm._common,
            });
        }
        if ("accessList" in txParams && txParams.accessList !== undefined) {
            return new FakeSenderAccessListEIP2930Transaction_1.FakeSenderAccessListEIP2930Transaction(sender, txParams, {
                common: this._vm._common,
            });
        }
        return new FakeSenderTransaction_1.FakeSenderTransaction(sender, txParams, {
            common: this._vm._common,
        });
    }
    _getSnapshotIndex(id) {
        for (const [i, snapshot] of this._snapshots.entries()) {
            if (snapshot.id === id) {
                return i;
            }
            // We already removed the snapshot we are looking for
            if (snapshot.id > id) {
                return undefined;
            }
        }
        return undefined;
    }
    _removeSnapshot(id) {
        const snapshotIndex = this._getSnapshotIndex(id);
        if (snapshotIndex === undefined) {
            return;
        }
        this._snapshots.splice(snapshotIndex);
    }
    _initLocalAccounts(genesisAccounts) {
        const privateKeys = genesisAccounts.map((acc) => (0, ethereumjs_util_1.toBuffer)(acc.privateKey));
        for (const pk of privateKeys) {
            this._localAccounts.set((0, ethereumjs_util_1.bufferToHex)((0, ethereumjs_util_1.privateToAddress)(pk)), pk);
        }
    }
    async _getConsoleLogMessages(vmTrace, vmTracerError) {
        if (vmTrace === undefined || vmTracerError !== undefined) {
            log("Could not print console log. Please report this to help us improve Hardhat.\n", vmTracerError);
            return [];
        }
        return this._consoleLogger.getLogMessages(vmTrace);
    }
    async _manageErrors(vmResult, vmTrace, vmTracerError) {
        if (vmResult.exceptionError === undefined) {
            return undefined;
        }
        let stackTrace;
        try {
            if (vmTrace === undefined || vmTracerError !== undefined) {
                throw vmTracerError;
            }
            stackTrace = this._solidityTracer.getStackTrace(vmTrace);
        }
        catch (err) {
            this._failedStackTraces += 1;
            log("Could not generate stack trace. Please report this to help us improve Hardhat.\n", err);
        }
        const error = vmResult.exceptionError;
        // we don't use `instanceof` in case someone uses a different VM dependency
        // see https://github.com/nomiclabs/hardhat/issues/1317
        const isVmError = "error" in error && typeof error.error === "string";
        // If this is not a VM error, or if it's an internal VM error, we just
        // rethrow. An example of a non-VmError being thrown here is an HTTP error
        // coming from the ForkedStateManager.
        if (!isVmError || error.error === exceptions_1.ERROR.INTERNAL_ERROR) {
            throw error;
        }
        if (error.error === exceptions_1.ERROR.OUT_OF_GAS) {
            if (stackTrace !== undefined &&
                this._isContractTooLargeStackTrace(stackTrace)) {
                return (0, solidity_errors_1.encodeSolidityStackTrace)("Transaction ran out of gas", stackTrace);
            }
            return new errors_2.TransactionExecutionError("Transaction ran out of gas");
        }
        const returnData = new return_data_1.ReturnData(vmResult.returnValue);
        let returnDataExplanation;
        if (returnData.isEmpty()) {
            returnDataExplanation = "without reason string";
        }
        else if (returnData.isErrorReturnData()) {
            returnDataExplanation = `with reason "${returnData.decodeError()}"`;
        }
        else if (returnData.isPanicReturnData()) {
            const panicCode = returnData.decodePanic().toString("hex");
            returnDataExplanation = `with panic code "0x${panicCode}"`;
        }
        else {
            returnDataExplanation = "with unrecognized return data or custom error";
        }
        if (error.error === exceptions_1.ERROR.REVERT) {
            const fallbackMessage = `VM Exception while processing transaction: revert ${returnDataExplanation}`;
            if (stackTrace !== undefined) {
                return (0, solidity_errors_1.encodeSolidityStackTrace)(fallbackMessage, stackTrace);
            }
            return new errors_2.TransactionExecutionError(fallbackMessage);
        }
        if (stackTrace !== undefined) {
            return (0, solidity_errors_1.encodeSolidityStackTrace)(`Transaction failed: revert ${returnDataExplanation}`, stackTrace);
        }
        return new errors_2.TransactionExecutionError(`Transaction reverted ${returnDataExplanation}`);
    }
    _isContractTooLargeStackTrace(stackTrace) {
        return (stackTrace.length > 0 &&
            stackTrace[stackTrace.length - 1].type ===
                solidity_stack_trace_1.StackTraceEntryType.CONTRACT_TOO_LARGE_ERROR);
    }
    _calculateTimestampAndOffset(timestamp) {
        let blockTimestamp;
        let offsetShouldChange;
        let newOffset = new ethereumjs_util_1.BN(0);
        const currentTimestamp = new ethereumjs_util_1.BN((0, getCurrentTimestamp_1.getCurrentTimestamp)());
        // if timestamp is not provided, we check nextBlockTimestamp, if it is
        // set, we use it as the timestamp instead. If it is not set, we use
        // time offset + real time as the timestamp.
        if (timestamp === undefined || timestamp.eqn(0)) {
            if (this.getNextBlockTimestamp().eqn(0)) {
                blockTimestamp = currentTimestamp.add(this.getTimeIncrement());
                offsetShouldChange = false;
            }
            else {
                blockTimestamp = this.getNextBlockTimestamp();
                offsetShouldChange = true;
            }
        }
        else {
            offsetShouldChange = true;
            blockTimestamp = timestamp;
        }
        if (offsetShouldChange) {
            newOffset = blockTimestamp.sub(currentTimestamp);
        }
        return [blockTimestamp, offsetShouldChange, newOffset];
    }
    _resetNextBlockTimestamp() {
        this.setNextBlockTimestamp(new ethereumjs_util_1.BN(0));
    }
    async _notifyPendingTransaction(tx) {
        this._filters.forEach((filter) => {
            if (filter.type === filter_1.Type.PENDING_TRANSACTION_SUBSCRIPTION) {
                const hash = (0, ethereumjs_util_1.bufferToHex)(tx.hash());
                if (filter.subscription) {
                    this._emitEthEvent(filter.id, hash);
                    return;
                }
                filter.hashes.push(hash);
            }
        });
    }
    _getLocalAccountPrivateKey(sender) {
        const senderAddress = sender.toString();
        if (!this._localAccounts.has(senderAddress)) {
            throw new errors_2.InvalidInputError(`unknown account ${senderAddress}`);
        }
        return this._localAccounts.get(senderAddress);
    }
    /**
     * Saves a block as successfully run. This method requires that the block
     * was added to the blockchain.
     */
    async _saveBlockAsSuccessfullyRun(block, runBlockResult) {
        const receipts = (0, output_1.getRpcReceiptOutputsFromLocalBlockExecution)(block, runBlockResult, (0, output_1.shouldShowTransactionTypeForHardfork)(this._vm._common));
        this._blockchain.addTransactionReceipts(receipts);
        const td = await this.getBlockTotalDifficulty(block);
        const rpcLogs = [];
        for (const receipt of receipts) {
            rpcLogs.push(...receipt.logs);
        }
        this._filters.forEach((filter, key) => {
            if (filter.deadline.valueOf() < new Date().valueOf()) {
                this._filters.delete(key);
            }
            switch (filter.type) {
                case filter_1.Type.BLOCK_SUBSCRIPTION:
                    const hash = block.hash();
                    if (filter.subscription) {
                        this._emitEthEvent(filter.id, (0, output_1.getRpcBlock)(block, td, (0, output_1.shouldShowTransactionTypeForHardfork)(this._vm._common), false));
                        return;
                    }
                    filter.hashes.push((0, ethereumjs_util_1.bufferToHex)(hash));
                    break;
                case filter_1.Type.LOGS_SUBSCRIPTION:
                    if ((0, filter_1.bloomFilter)(new bloom_1.default(block.header.bloom), filter.criteria.addresses, filter.criteria.normalizedTopics)) {
                        const logs = (0, filter_1.filterLogs)(rpcLogs, filter.criteria);
                        if (logs.length === 0) {
                            return;
                        }
                        if (filter.subscription) {
                            logs.forEach((rpcLog) => {
                                this._emitEthEvent(filter.id, rpcLog);
                            });
                            return;
                        }
                        filter.logs.push(...logs);
                    }
                    break;
            }
        });
    }
    async _timestampClashesWithPreviousBlockOne(blockTimestamp) {
        const latestBlock = await this.getLatestBlock();
        const latestBlockTimestamp = new ethereumjs_util_1.BN(latestBlock.header.timestamp);
        return latestBlockTimestamp.eq(blockTimestamp);
    }
    async _runInBlockContext(blockNumberOrPending, action) {
        if (blockNumberOrPending === "pending") {
            return this._runInPendingBlockContext(action);
        }
        if (blockNumberOrPending.eq(await this.getLatestBlockNumber())) {
            return action();
        }
        const block = await this.getBlockByNumber(blockNumberOrPending);
        if (block === undefined) {
            // TODO handle this better
            throw new Error(`Block with number ${blockNumberOrPending} doesn't exist. This should never happen.`);
        }
        const currentStateRoot = await this._stateManager.getStateRoot();
        await this._setBlockContext(block);
        try {
            return await action();
        }
        finally {
            await this._restoreBlockContext(currentStateRoot);
        }
    }
    async _runInPendingBlockContext(action) {
        const snapshotId = await this.takeSnapshot();
        try {
            await this.mineBlock();
            return await action();
        }
        finally {
            await this.revertToSnapshot(snapshotId);
        }
    }
    async _setBlockContext(block) {
        const irregularStateOrUndefined = this._irregularStatesByBlockNumber.get(block.header.number.toString());
        if (this._stateManager instanceof ForkStateManager_1.ForkStateManager) {
            return this._stateManager.setBlockContext(block.header.stateRoot, block.header.number, irregularStateOrUndefined);
        }
        return this._stateManager.setStateRoot(irregularStateOrUndefined !== null && irregularStateOrUndefined !== void 0 ? irregularStateOrUndefined : block.header.stateRoot);
    }
    async _restoreBlockContext(stateRoot) {
        if (this._stateManager instanceof ForkStateManager_1.ForkStateManager) {
            return this._stateManager.restoreForkBlockContext(stateRoot);
        }
        return this._stateManager.setStateRoot(stateRoot);
    }
    async _correctInitialEstimation(blockNumberOrPending, txParams, initialEstimation) {
        let tx = await this._getFakeTransaction(Object.assign(Object.assign({}, txParams), { gasLimit: initialEstimation }));
        if (tx.getBaseFee().gte(initialEstimation)) {
            initialEstimation = tx.getBaseFee().addn(1);
            tx = await this._getFakeTransaction(Object.assign(Object.assign({}, txParams), { gasLimit: initialEstimation }));
        }
        const result = await this._runInBlockContext(blockNumberOrPending, () => this._runTxAndRevertMutations(tx, blockNumberOrPending));
        if (result.execResult.exceptionError === undefined) {
            return initialEstimation;
        }
        return this._binarySearchEstimation(blockNumberOrPending, txParams, initialEstimation, this.getBlockGasLimit());
    }
    async _binarySearchEstimation(blockNumberOrPending, txParams, highestFailingEstimation, lowestSuccessfulEstimation, roundNumber = 0) {
        if (lowestSuccessfulEstimation.lte(highestFailingEstimation)) {
            // This shouldn't happen, but we don't want to go into an infinite loop
            // if it ever happens
            return lowestSuccessfulEstimation;
        }
        const MAX_GAS_ESTIMATION_IMPROVEMENT_ROUNDS = 20;
        const diff = lowestSuccessfulEstimation.sub(highestFailingEstimation);
        const minDiff = highestFailingEstimation.gten(4000000)
            ? 50000
            : highestFailingEstimation.gten(1000000)
                ? 10000
                : highestFailingEstimation.gten(100000)
                    ? 1000
                    : highestFailingEstimation.gten(50000)
                        ? 500
                        : highestFailingEstimation.gten(30000)
                            ? 300
                            : 200;
        if (diff.lten(minDiff)) {
            return lowestSuccessfulEstimation;
        }
        if (roundNumber > MAX_GAS_ESTIMATION_IMPROVEMENT_ROUNDS) {
            return lowestSuccessfulEstimation;
        }
        const binSearchNewEstimation = highestFailingEstimation.add(diff.divn(2));
        const optimizedEstimation = roundNumber === 0
            ? highestFailingEstimation.muln(3)
            : binSearchNewEstimation;
        const newEstimation = optimizedEstimation.gt(binSearchNewEstimation)
            ? binSearchNewEstimation
            : optimizedEstimation;
        // Let other things execute
        await new Promise((resolve) => setImmediate(resolve));
        const tx = await this._getFakeTransaction(Object.assign(Object.assign({}, txParams), { gasLimit: newEstimation }));
        const result = await this._runInBlockContext(blockNumberOrPending, () => this._runTxAndRevertMutations(tx, blockNumberOrPending));
        if (result.execResult.exceptionError === undefined) {
            return this._binarySearchEstimation(blockNumberOrPending, txParams, highestFailingEstimation, newEstimation, roundNumber + 1);
        }
        return this._binarySearchEstimation(blockNumberOrPending, txParams, newEstimation, lowestSuccessfulEstimation, roundNumber + 1);
    }
    /**
     * This function runs a transaction and reverts all the modifications that it
     * makes.
     */
    async _runTxAndRevertMutations(tx, blockNumberOrPending, forceBaseFeeZero = false) {
        var _a, _b;
        const initialStateRoot = await this._stateManager.getStateRoot();
        let blockContext;
        let originalCommon;
        try {
            if (blockNumberOrPending === "pending") {
                // the new block has already been mined by _runInBlockContext hence we take latest here
                blockContext = await this.getLatestBlock();
            }
            else {
                // We know that this block number exists, because otherwise
                // there would be an error in the RPC layer.
                const block = await this.getBlockByNumber(blockNumberOrPending);
                (0, errors_1.assertHardhatInvariant)(block !== undefined, "Tried to run a tx in the context of a non-existent block");
                blockContext = block;
                // we don't need to add the tx to the block because runTx doesn't
                // know anything about the txs in the current block
            }
            // NOTE: This is a workaround of both an @ethereumjs/vm limitation, and
            //   a bug in Hardhat Network.
            //
            // See: https://github.com/nomiclabs/hardhat/issues/1666
            //
            // If this VM is running with EIP1559 activated, and the block is not
            // an EIP1559 one, this will crash, so we create a new one that has
            // baseFeePerGas = 0.
            //
            // We also have an option to force the base fee to be zero,
            // we don't want to debit any balance nor fail any tx when running an
            // eth_call. This will make the BASEFEE option also return 0, which
            // shouldn't. See: https://github.com/nomiclabs/hardhat/issues/1688
            if (this.isEip1559Active(blockNumberOrPending) &&
                (blockContext.header.baseFeePerGas === undefined || forceBaseFeeZero)) {
                blockContext = block_1.Block.fromBlockData(blockContext, {
                    freeze: false,
                    common: this._vm._common,
                });
                blockContext.header.baseFeePerGas = new ethereumjs_util_1.BN(0);
            }
            originalCommon = this._vm._common;
            this._vm._common = new common_1.default({
                chain: Object.assign(Object.assign({}, this._vm._common["_chainParams"]), { chainId: (_a = this._forkNetworkId) !== null && _a !== void 0 ? _a : this._configChainId, networkId: (_b = this._forkNetworkId) !== null && _b !== void 0 ? _b : this._configNetworkId }),
                hardfork: this._selectHardfork(blockContext.header.number),
            });
            return await this._vm.runTx({
                block: blockContext,
                tx,
                skipNonce: true,
                skipBalance: true,
                skipBlockGasLimitValidation: true,
            });
        }
        finally {
            if (originalCommon !== undefined) {
                this._vm._common = originalCommon;
            }
            await this._stateManager.setStateRoot(initialStateRoot);
        }
    }
    async _computeFilterParams(filterParams, isFilter) {
        const latestBlockNumber = await this.getLatestBlockNumber();
        const newFilterParams = Object.assign({}, filterParams);
        if (newFilterParams.fromBlock === filter_1.LATEST_BLOCK) {
            newFilterParams.fromBlock = latestBlockNumber;
        }
        if (!isFilter && newFilterParams.toBlock === filter_1.LATEST_BLOCK) {
            newFilterParams.toBlock = latestBlockNumber;
        }
        if (newFilterParams.toBlock.gt(latestBlockNumber)) {
            newFilterParams.toBlock = latestBlockNumber;
        }
        if (newFilterParams.fromBlock.gt(latestBlockNumber)) {
            newFilterParams.fromBlock = latestBlockNumber;
        }
        return newFilterParams;
    }
    _newDeadline() {
        const dt = new Date();
        dt.setMinutes(dt.getMinutes() + 5); // This will not overflow
        return dt;
    }
    _getNextFilterId() {
        this._lastFilterId = this._lastFilterId.addn(1);
        return this._lastFilterId;
    }
    _filterIdToFiltersKey(filterId) {
        return filterId.toString();
    }
    _emitEthEvent(filterId, result) {
        this.emit("ethEvent", {
            result,
            filterId,
        });
    }
    async _getNonce(address, blockNumberOrPending) {
        if (blockNumberOrPending === "pending") {
            return this.getAccountNextPendingNonce(address);
        }
        return this._runInBlockContext(blockNumberOrPending, async () => {
            const account = await this._stateManager.getAccount(address);
            return account.nonce;
        });
    }
    async _isTransactionMined(hash) {
        const txReceipt = await this.getTransactionReceipt(hash);
        return txReceipt !== undefined;
    }
    _isTxMinable(tx, nextBlockBaseFeePerGas) {
        const txMaxFee = "gasPrice" in tx ? tx.gasPrice : tx.maxFeePerGas;
        const canPayBaseFee = nextBlockBaseFeePerGas !== undefined
            ? txMaxFee.gte(nextBlockBaseFeePerGas)
            : true;
        const atLeastMinGasPrice = txMaxFee.gte(this._minGasPrice);
        return canPayBaseFee && atLeastMinGasPrice;
    }
    async _persistIrregularWorldState() {
        this._irregularStatesByBlockNumber.set((await this.getLatestBlock()).header.number.toString(), await this._stateManager.getStateRoot());
    }
    isEip1559Active(blockNumberOrPending) {
        if (blockNumberOrPending !== undefined &&
            blockNumberOrPending !== "pending") {
            return this._vm._common.hardforkGteHardfork(this._selectHardfork(blockNumberOrPending), "london");
        }
        return this._vm._common.gteHardfork("london");
    }
    async _getEstimateGasFeePriceFields(callParams, blockNumberOrPending) {
        var _a, _b;
        if (!this.isEip1559Active(blockNumberOrPending) ||
            callParams.gasPrice !== undefined) {
            return { gasPrice: (_a = callParams.gasPrice) !== null && _a !== void 0 ? _a : (await this.getGasPrice()) };
        }
        let maxFeePerGas = callParams.maxFeePerGas;
        let maxPriorityFeePerGas = callParams.maxPriorityFeePerGas;
        if (maxPriorityFeePerGas === undefined) {
            maxPriorityFeePerGas = await this.getMaxPriorityFeePerGas();
            if (maxFeePerGas !== undefined && maxFeePerGas.lt(maxPriorityFeePerGas)) {
                maxPriorityFeePerGas = maxFeePerGas;
            }
        }
        if (maxFeePerGas === undefined) {
            if (blockNumberOrPending === "pending") {
                const baseFeePerGas = await this.getNextBlockBaseFeePerGas();
                maxFeePerGas = baseFeePerGas.muln(2).add(maxPriorityFeePerGas);
            }
            else {
                const block = await this.getBlockByNumber(blockNumberOrPending);
                maxFeePerGas = maxPriorityFeePerGas.add((_b = block.header.baseFeePerGas) !== null && _b !== void 0 ? _b : new ethereumjs_util_1.BN(0));
            }
        }
        return { maxFeePerGas, maxPriorityFeePerGas };
    }
    _selectHardfork(blockNumber) {
        if (this._forkBlockNumber === undefined ||
            blockNumber.gte(new ethereumjs_util_1.BN(this._forkBlockNumber))) {
            return this._vm._common.hardfork();
        }
        if (this._hardforkActivations.size === 0) {
            throw new errors_2.InternalError(`No known hardfork for execution on historical block ${blockNumber.toString()} (relative to fork block number ${this._forkBlockNumber}). The node was not configured with a hardfork activation history.  See http://hardhat.org/hardhat-network/guides/mainnet-forking.html#using-a-custom-hardfork-history`);
        }
        /** search this._hardforkActivations for the highest block number that
         * isn't higher than blockNumber, and then return that found block number's
         * associated hardfork name. */
        const hardforkHistory = Array.from(this._hardforkActivations.entries());
        const [hardfork, activationBlock] = hardforkHistory.reduce(([highestHardfork, highestBlock], [thisHardfork, thisBlock]) => thisBlock > highestBlock && new ethereumjs_util_1.BN(thisBlock).lte(blockNumber)
            ? [thisHardfork, thisBlock]
            : [highestHardfork, highestBlock]);
        if (hardfork === undefined || blockNumber.ltn(activationBlock)) {
            throw new errors_2.InternalError(`Could not find a hardfork to run for block ${blockNumber}, after having looked for one in the HardhatNode's hardfork activation history, which was: ${JSON.stringify(hardforkHistory)}. For more information, see https://hardhat.org/hardhat-network/reference/#config`);
        }
        if (!constants_1.HARDHAT_NETWORK_SUPPORTED_HARDFORKS.includes(hardfork)) {
            throw new errors_2.InternalError(`Tried to run a call or transaction in the context of a block whose hardfork is "${hardfork}", but Hardhat Network only supports the following hardforks: ${constants_1.HARDHAT_NETWORK_SUPPORTED_HARDFORKS.join(", ")}`);
        }
        return hardfork;
    }
    _getCommonForTracing(networkId, blockNumber) {
        try {
            const common = new common_1.default({
                chain: Object.assign(Object.assign({}, common_1.default["_getChainParams"]("mainnet")), { chainId: networkId, networkId }),
                hardfork: this._selectHardfork(new ethereumjs_util_1.BN(blockNumber)),
            });
            return common;
        }
        catch (_a) {
            throw new errors_2.InternalError(`Network id ${networkId} does not correspond to a network that Hardhat can trace`);
        }
    }
}
exports.HardhatNode = HardhatNode;
//# sourceMappingURL=node.js.map