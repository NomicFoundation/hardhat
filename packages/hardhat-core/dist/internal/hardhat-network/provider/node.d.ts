/// <reference types="node" />
import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { Address, BN, ECDSASignature } from "ethereumjs-util";
import EventEmitter from "events";
import { CompilerInput, CompilerOutput } from "../../../types";
import { RpcDebugTracingConfig } from "../../core/jsonrpc/types/input/debugTraceTransaction";
import { MessageTrace } from "../stack-traces/message-trace";
import "./ethereumjs-workarounds";
import { CallParams, EstimateGasResult, FeeHistory, FilterParams, MineBlockResult, NodeConfig, RunCallResult, SendTransactionResult, TransactionParams } from "./node-types";
import { RpcLogOutput, RpcReceiptOutput } from "./output";
export declare class HardhatNode extends EventEmitter {
    private readonly _vm;
    private readonly _stateManager;
    private readonly _blockchain;
    private readonly _txPool;
    private _automine;
    private _minGasPrice;
    private _blockTimeOffsetSeconds;
    private _mempoolOrder;
    private _coinbase;
    private readonly _configNetworkId;
    private readonly _configChainId;
    private readonly _hardforkActivations;
    private _forkNetworkId?;
    private _forkBlockNumber?;
    static create(config: NodeConfig): Promise<[Common, HardhatNode]>;
    private static _validateHardforks;
    private readonly _localAccounts;
    private readonly _impersonatedAccounts;
    private _nextBlockTimestamp;
    private _userProvidedNextBlockBaseFeePerGas?;
    private _lastFilterId;
    private _filters;
    private _nextSnapshotId;
    private readonly _snapshots;
    private readonly _vmTracer;
    private readonly _vmTraceDecoder;
    private readonly _solidityTracer;
    private readonly _consoleLogger;
    private _failedStackTraces;
    private _irregularStatesByBlockNumber;
    private constructor();
    getSignedTransaction(txParams: TransactionParams): Promise<TypedTransaction>;
    sendTransaction(tx: TypedTransaction): Promise<SendTransactionResult>;
    mineBlock(timestamp?: BN): Promise<MineBlockResult>;
    runCall(call: CallParams, blockNumberOrPending: BN | "pending"): Promise<RunCallResult>;
    getAccountBalance(address: Address, blockNumberOrPending?: BN | "pending"): Promise<BN>;
    getNextConfirmedNonce(address: Address, blockNumberOrPending: BN | "pending"): Promise<BN>;
    getAccountNextPendingNonce(address: Address): Promise<BN>;
    getCodeFromTrace(trace: MessageTrace | undefined, blockNumberOrPending: BN | "pending"): Promise<Buffer>;
    getLatestBlock(): Promise<Block>;
    getLatestBlockNumber(): Promise<BN>;
    getPendingBlockAndTotalDifficulty(): Promise<[Block, BN]>;
    getLocalAccountAddresses(): Promise<string[]>;
    getBlockGasLimit(): BN;
    estimateGas(callParams: CallParams, blockNumberOrPending: BN | "pending"): Promise<EstimateGasResult>;
    getGasPrice(): Promise<BN>;
    getMaxPriorityFeePerGas(): Promise<BN>;
    getCoinbaseAddress(): Address;
    getStorageAt(address: Address, positionIndex: BN, blockNumberOrPending: BN | "pending"): Promise<Buffer>;
    getBlockByNumber(pending: "pending"): Promise<Block>;
    getBlockByNumber(blockNumberOrPending: BN | "pending"): Promise<Block | undefined>;
    getBlockByHash(blockHash: Buffer): Promise<Block | undefined>;
    getBlockByTransactionHash(hash: Buffer): Promise<Block | undefined>;
    getBlockTotalDifficulty(block: Block): Promise<BN>;
    getCode(address: Address, blockNumberOrPending: BN | "pending"): Promise<Buffer>;
    getNextBlockTimestamp(): BN;
    setNextBlockTimestamp(timestamp: BN): void;
    getTimeIncrement(): BN;
    setTimeIncrement(timeIncrement: BN): void;
    increaseTime(increment: BN): void;
    setUserProvidedNextBlockBaseFeePerGas(baseFeePerGas: BN): void;
    getUserProvidedNextBlockBaseFeePerGas(): BN | undefined;
    private _resetUserProvidedNextBlockBaseFeePerGas;
    getNextBlockBaseFeePerGas(): Promise<BN | undefined>;
    getPendingTransaction(hash: Buffer): Promise<TypedTransaction | undefined>;
    getTransactionReceipt(hash: Buffer | string): Promise<RpcReceiptOutput | undefined>;
    getPendingTransactions(): Promise<TypedTransaction[]>;
    signPersonalMessage(address: Address, data: Buffer): Promise<ECDSASignature>;
    signTypedDataV4(address: Address, typedData: any): Promise<string>;
    getStackTraceFailuresCount(): number;
    takeSnapshot(): Promise<number>;
    revertToSnapshot(id: number): Promise<boolean>;
    newFilter(filterParams: FilterParams, isSubscription: boolean): Promise<BN>;
    newBlockFilter(isSubscription: boolean): Promise<BN>;
    newPendingTransactionFilter(isSubscription: boolean): Promise<BN>;
    uninstallFilter(filterId: BN, subscription: boolean): Promise<boolean>;
    getFilterChanges(filterId: BN): Promise<string[] | RpcLogOutput[] | undefined>;
    getFilterLogs(filterId: BN): Promise<RpcLogOutput[] | undefined>;
    getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;
    addCompilationResult(solcVersion: string, compilerInput: CompilerInput, compilerOutput: CompilerOutput): Promise<boolean>;
    addImpersonatedAccount(address: Buffer): true;
    removeImpersonatedAccount(address: Buffer): boolean;
    setAutomine(automine: boolean): void;
    getAutomine(): boolean;
    setBlockGasLimit(gasLimit: BN | number): Promise<void>;
    setMinGasPrice(minGasPrice: BN): Promise<void>;
    dropTransaction(hash: Buffer): Promise<boolean>;
    setAccountBalance(address: Address, newBalance: BN): Promise<void>;
    setAccountCode(address: Address, newCode: Buffer): Promise<void>;
    setNextConfirmedNonce(address: Address, newNonce: BN): Promise<void>;
    setStorageAt(address: Address, positionIndex: BN, value: Buffer): Promise<void>;
    traceTransaction(hash: Buffer, config: RpcDebugTracingConfig): Promise<import("./output").RpcDebugTraceOutput>;
    getFeeHistory(blockCount: BN, newestBlock: BN | "pending", rewardPercentiles: number[]): Promise<FeeHistory>;
    setCoinbase(coinbase: Address): Promise<void>;
    private _getGasUsedRatio;
    private _getRewards;
    private _addPendingTransaction;
    private _mineTransaction;
    private _mineTransactionAndPending;
    private _mineBlocksUntilTransactionIsIncluded;
    private _gatherTraces;
    private _validateAutominedTx;
    /**
     * Mines a new block with as many pending txs as possible, adding it to
     * the VM's blockchain.
     *
     * This method reverts any modification to the state manager if it throws.
     */
    private _mineBlockWithPendingTxs;
    private _getMinimalTransactionFee;
    private _getFakeTransaction;
    private _getSnapshotIndex;
    private _removeSnapshot;
    private _initLocalAccounts;
    private _getConsoleLogMessages;
    private _manageErrors;
    private _isContractTooLargeStackTrace;
    private _calculateTimestampAndOffset;
    private _resetNextBlockTimestamp;
    private _notifyPendingTransaction;
    private _getLocalAccountPrivateKey;
    /**
     * Saves a block as successfully run. This method requires that the block
     * was added to the blockchain.
     */
    private _saveBlockAsSuccessfullyRun;
    private _timestampClashesWithPreviousBlockOne;
    private _runInBlockContext;
    private _runInPendingBlockContext;
    private _setBlockContext;
    private _restoreBlockContext;
    private _correctInitialEstimation;
    private _binarySearchEstimation;
    /**
     * This function runs a transaction and reverts all the modifications that it
     * makes.
     */
    private _runTxAndRevertMutations;
    private _computeFilterParams;
    private _newDeadline;
    private _getNextFilterId;
    private _filterIdToFiltersKey;
    private _emitEthEvent;
    private _getNonce;
    private _isTransactionMined;
    private _isTxMinable;
    private _persistIrregularWorldState;
    isEip1559Active(blockNumberOrPending?: BN | "pending"): boolean;
    private _getEstimateGasFeePriceFields;
    private _selectHardfork;
    private _getCommonForTracing;
}
//# sourceMappingURL=node.d.ts.map