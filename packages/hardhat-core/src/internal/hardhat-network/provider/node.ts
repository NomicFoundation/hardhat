import VM from "@nomiclabs/ethereumjs-vm";
import Bloom from "@nomiclabs/ethereumjs-vm/dist/bloom";
import { EVMResult, ExecResult } from "@nomiclabs/ethereumjs-vm/dist/evm/evm";
import { ERROR } from "@nomiclabs/ethereumjs-vm/dist/exceptions";
import {
  RunBlockResult,
  TxReceipt,
} from "@nomiclabs/ethereumjs-vm/dist/runBlock";
import { RunTxResult } from "@nomiclabs/ethereumjs-vm/dist/runTx";
import { StateManager } from "@nomiclabs/ethereumjs-vm/dist/state";
import chalk from "chalk";
import debug from "debug";
import Common from "ethereumjs-common";
import { FakeTransaction, Transaction } from "ethereumjs-tx";
import {
  BN,
  bufferToHex,
  ECDSASignature,
  ecsign,
  hashPersonalMessage,
  privateToAddress,
  toBuffer,
} from "ethereumjs-util";
import EventEmitter from "events";

import { CompilerInput, CompilerOutput } from "../../../types";
import { HARDHAT_NETWORK_DEFAULT_GAS_PRICE } from "../../core/config/default-config";
import { Reporter } from "../../sentry/reporter";
import { getDifferenceInSeconds } from "../../util/date";
import { createModelsAndDecodeBytecodes } from "../stack-traces/compiler-to-model";
import { ConsoleLogger } from "../stack-traces/consoleLogger";
import { ContractsIdentifier } from "../stack-traces/contracts-identifier";
import { MessageTrace } from "../stack-traces/message-trace";
import { decodeRevertReason } from "../stack-traces/revert-reasons";
import {
  encodeSolidityStackTrace,
  SolidityError,
} from "../stack-traces/solidity-errors";
import {
  SolidityStackTrace,
  StackTraceEntryType,
} from "../stack-traces/solidity-stack-trace";
import { SolidityTracer } from "../stack-traces/solidityTracer";
import { VmTraceDecoder } from "../stack-traces/vm-trace-decoder";
import { VMTracer } from "../stack-traces/vm-tracer";

import { InvalidInputError, TransactionExecutionError } from "./errors";
import { bloomFilter, Filter, filterLogs, LATEST_BLOCK, Type } from "./filter";
import { ForkBlockchain } from "./fork/ForkBlockchain";
import { ForkStateManager } from "./fork/ForkStateManager";
import { HardhatBlockchain } from "./HardhatBlockchain";
import {
  CallParams,
  EstimateGasResult,
  FilterParams,
  GatherTracesResult,
  GenesisAccount,
  MineBlockResult,
  NodeConfig,
  RunCallResult,
  SendTransactionResult,
  Snapshot,
  TracingConfig,
  TransactionParams,
} from "./node-types";
import {
  getRpcBlock,
  getRpcReceipts,
  RpcLogOutput,
  RpcReceiptOutput,
} from "./output";
import { TxPool } from "./TxPool";
import { TxPriorityHeap } from "./TxPriorityHeap";
import { Block } from "./types/Block";
import { PBlockchain } from "./types/PBlockchain";
import { PStateManager } from "./types/PStateManager";
import { asPStateManager } from "./utils/asPStateManager";
import { asStateManager } from "./utils/asStateManager";
import { getCurrentTimestamp } from "./utils/getCurrentTimestamp";
import { makeCommon } from "./utils/makeCommon";
import { makeForkClient } from "./utils/makeForkClient";
import { makeForkCommon } from "./utils/makeForkCommon";
import { makeStateTrie } from "./utils/makeStateTrie";
import { putGenesisBlock } from "./utils/putGenesisBlock";
import { txMapToArray } from "./utils/txMapToArray";

const log = debug("hardhat:core:hardhat-network:node");

// This library's types are wrong, they don't type check
// tslint:disable-next-line no-var-requires
const ethSigUtil = require("eth-sig-util");

export const COINBASE_ADDRESS = toBuffer(
  "0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e"
);

// tslint:disable only-hardhat-error

export class HardhatNode extends EventEmitter {
  public static async create(
    config: NodeConfig
  ): Promise<[Common, HardhatNode]> {
    const {
      automine,
      genesisAccounts,
      blockGasLimit,
      allowUnlimitedContractSize,
      tracingConfig,
    } = config;

    let common: Common;
    let stateManager: StateManager | ForkStateManager;
    let blockchain: HardhatBlockchain | ForkBlockchain;
    let initialBlockTimeOffset: BN | undefined;

    if (config.type === "forked") {
      const { forkClient, forkBlockNumber } = await makeForkClient(
        config.forkConfig,
        config.forkCachePath
      );
      common = await makeForkCommon(forkClient, forkBlockNumber);

      stateManager = new ForkStateManager(
        forkClient,
        forkBlockNumber,
        genesisAccounts
      );

      blockchain = new ForkBlockchain(forkClient, forkBlockNumber, common);
    } else {
      const stateTrie = await makeStateTrie(genesisAccounts);
      common = makeCommon(config, stateTrie);

      stateManager = new StateManager({
        common,
        trie: stateTrie,
      });

      blockchain = new HardhatBlockchain();
      await putGenesisBlock(blockchain, common);

      if (config.initialDate !== undefined) {
        initialBlockTimeOffset = new BN(
          getDifferenceInSeconds(config.initialDate, new Date())
        );
      }
    }

    const txPool = new TxPool(
      asPStateManager(stateManager),
      new BN(blockGasLimit),
      common
    );

    const vm = new VM({
      common,
      activatePrecompiles: true,
      stateManager: asStateManager(stateManager) as any,
      blockchain: blockchain.asBlockchain() as any,
      allowUnlimitedContractSize,
    });

    const node = new HardhatNode(
      vm,
      asPStateManager(stateManager),
      blockchain,
      txPool,
      automine,
      initialBlockTimeOffset,
      genesisAccounts,
      tracingConfig
    );

    return [common, node];
  }

  private readonly _localAccounts: Map<string, Buffer> = new Map(); // address => private key
  private readonly _impersonatedAccounts: Set<string> = new Set(); // address

  private _nextBlockTimestamp: BN = new BN(0);

  private _lastFilterId = new BN(0);
  private _filters: Map<string, Filter> = new Map();

  private _nextSnapshotId = 1; // We start in 1 to mimic Ganache
  private readonly _snapshots: Snapshot[] = [];

  private readonly _vmTracer: VMTracer;
  private readonly _vmTraceDecoder: VmTraceDecoder;
  private readonly _solidityTracer: SolidityTracer;
  private readonly _consoleLogger: ConsoleLogger = new ConsoleLogger();
  private _failedStackTraces = 0;

  private constructor(
    private readonly _vm: VM,
    private readonly _stateManager: PStateManager,
    private readonly _blockchain: PBlockchain,
    private readonly _txPool: TxPool,
    private _automine: boolean,
    private _blockTimeOffsetSeconds: BN = new BN(0),
    genesisAccounts: GenesisAccount[],
    tracingConfig?: TracingConfig
  ) {
    super();

    this._initLocalAccounts(genesisAccounts);

    this._vmTracer = new VMTracer(
      this._vm,
      this._stateManager.getContractCode.bind(this._stateManager),
      false
    );
    this._vmTracer.enableTracing();

    const contractsIdentifier = new ContractsIdentifier();
    this._vmTraceDecoder = new VmTraceDecoder(contractsIdentifier);
    this._solidityTracer = new SolidityTracer();

    if (tracingConfig === undefined || tracingConfig.buildInfos === undefined) {
      return;
    }

    try {
      for (const buildInfo of tracingConfig.buildInfos) {
        const bytecodes = createModelsAndDecodeBytecodes(
          buildInfo.solcVersion,
          buildInfo.input,
          buildInfo.output
        );

        for (const bytecode of bytecodes) {
          this._vmTraceDecoder.addBytecode(bytecode);
        }
      }
    } catch (error) {
      console.warn(
        chalk.yellow(
          "The Hardhat Network tracing engine could not be initialized. Run Hardhat with --verbose to learn more."
        )
      );

      log(
        "Hardhat Network tracing disabled: ContractsIdentifier failed to be initialized. Please report this to help us improve Hardhat.\n",
        error
      );

      Reporter.reportError(error);
    }
  }

  public async getSignedTransaction(
    txParams: TransactionParams
  ): Promise<Transaction> {
    const senderAddress = bufferToHex(txParams.from);

    const pk = this._localAccounts.get(senderAddress);
    if (pk !== undefined) {
      const tx = new Transaction(txParams, { common: this._vm._common });
      tx.sign(pk);
      return tx;
    }

    if (this._impersonatedAccounts.has(senderAddress)) {
      return new FakeTransaction(txParams, { common: this._vm._common });
    }

    throw new InvalidInputError(`unknown account ${senderAddress}`);
  }

  public async sendTransaction(
    tx: Transaction
  ): Promise<SendTransactionResult> {
    if (!this._automine) {
      return this._addPendingTransaction(tx);
    }

    await this._validateExactNonce(tx);
    if (this._txPool.hasPendingTransactions()) {
      return this._mineTransactionAndPending(tx);
    }
    return this._mineTransaction(tx);
  }

  public async mineBlock(
    timestamp?: BN,
    sentTxHash?: string
  ): Promise<MineBlockResult> {
    const [
      blockTimestamp,
      offsetShouldChange,
      newOffset,
    ] = this._calculateTimestampAndOffset(timestamp);
    const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(
      blockTimestamp
    );
    if (needsTimestampIncrease) {
      blockTimestamp.iaddn(1);
    }

    const previousRoot = await this._stateManager.getStateRoot();
    let result: MineBlockResult;
    try {
      result = await this._mineBlockWithPendingTxs(blockTimestamp, sentTxHash);
    } catch (err) {
      await this._stateManager.setStateRoot(previousRoot);
      if (err?.message.includes("sender doesn't have enough funds")) {
        throw new InvalidInputError(err.message);
      }
      throw new TransactionExecutionError(err);
    }

    await this._saveBlockAsSuccessfullyRun(result.block, result.blockResult);

    if (needsTimestampIncrease) {
      this.increaseTime(new BN(1));
    }

    if (offsetShouldChange) {
      this.setTimeIncrement(newOffset);
    }

    await this._resetNextBlockTimestamp();

    return result;
  }

  public async runCall(
    call: CallParams,
    blockNumberOrPending: BN | "pending"
  ): Promise<RunCallResult> {
    let tx: Transaction;

    const result = await this._runInBlockContext(
      blockNumberOrPending,
      async () => {
        const account = await this._stateManager.getAccount(call.from);
        const nonce = new BN(account.nonce);
        tx = await this._getFakeTransaction({ ...call, nonce });
        return this._runTxAndRevertMutations(tx, blockNumberOrPending);
      }
    );

    const traces = await this._gatherTraces(result.execResult);

    return {
      ...traces,
      result: result.execResult.returnValue,
    };
  }

  public async getAccountBalance(
    address: Buffer,
    blockNumberOrPending?: BN | "pending"
  ): Promise<BN> {
    if (blockNumberOrPending === undefined) {
      blockNumberOrPending = await this.getLatestBlockNumber();
    }

    const account = await this._runInBlockContext(blockNumberOrPending, () =>
      this._stateManager.getAccount(address)
    );

    return new BN(account.balance);
  }

  public async getAccountNonce(
    address: Buffer,
    blockNumberOrPending: BN | "pending"
  ): Promise<BN> {
    const account = await this._runInBlockContext(blockNumberOrPending, () =>
      this._stateManager.getAccount(address)
    );

    return new BN(account.nonce);
  }

  public async getAccountExecutableNonce(address: Buffer): Promise<BN> {
    return this._txPool.getExecutableNonce(address);
  }

  public async getLatestBlock(): Promise<Block> {
    return this._blockchain.getLatestBlock();
  }

  public async getLatestBlockNumber(): Promise<BN> {
    return new BN((await this.getLatestBlock()).header.number);
  }

  public async getPendingBlockAndTotalDifficulty(): Promise<[Block, BN]> {
    return this._runInPendingBlockContext(async () => {
      const block = await this._blockchain.getLatestBlock();
      const totalDifficulty = await this._blockchain.getTotalDifficulty(
        block.hash()
      );

      return [block, totalDifficulty];
    });
  }

  public async getLocalAccountAddresses(): Promise<string[]> {
    return [...this._localAccounts.keys()];
  }

  public getBlockGasLimit(): BN {
    return this._txPool.getBlockGasLimit();
  }

  public async estimateGas(
    txParams: TransactionParams,
    blockNumberOrPending: BN | "pending"
  ): Promise<EstimateGasResult> {
    const tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: this.getBlockGasLimit(),
    });

    const result = await this._runInBlockContext(blockNumberOrPending, () =>
      this._runTxAndRevertMutations(tx, blockNumberOrPending, true)
    );

    let vmTrace = this._vmTracer.getLastTopLevelMessageTrace();
    const vmTracerError = this._vmTracer.getLastError();
    this._vmTracer.clearLastError();

    if (vmTrace !== undefined) {
      vmTrace = this._vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
    }

    const consoleLogMessages = await this._getConsoleLogMessages(
      vmTrace,
      vmTracerError
    );

    // This is only considered if the call to _runTxAndRevertMutations doesn't
    // manage errors
    if (result.execResult.exceptionError !== undefined) {
      return {
        estimation: this.getBlockGasLimit(),
        trace: vmTrace,
        error: await this._manageErrors(
          result.execResult,
          vmTrace,
          vmTracerError
        ),
        consoleLogMessages,
      };
    }

    const initialEstimation = result.gasUsed;

    return {
      estimation: await this._correctInitialEstimation(
        blockNumberOrPending,
        txParams,
        initialEstimation
      ),
      trace: vmTrace,
      consoleLogMessages,
    };
  }

  public async getGasPrice(): Promise<BN> {
    return new BN(HARDHAT_NETWORK_DEFAULT_GAS_PRICE);
  }

  public getCoinbaseAddress(): Buffer {
    return COINBASE_ADDRESS;
  }

  public async getStorageAt(
    address: Buffer,
    slot: BN,
    blockNumberOrPending: BN | "pending"
  ): Promise<Buffer> {
    const key = slot.toArrayLike(Buffer, "be", 32);

    const data: Buffer = await this._runInBlockContext(
      blockNumberOrPending,
      () => this._stateManager.getContractStorage(address, key)
    );

    const EXPECTED_DATA_SIZE = 32;
    if (data.length < EXPECTED_DATA_SIZE) {
      return Buffer.concat(
        [Buffer.alloc(EXPECTED_DATA_SIZE - data.length, 0), data],
        EXPECTED_DATA_SIZE
      );
    }

    return data;
  }

  public async getBlockByNumber(pending: "pending"): Promise<Block>;
  public async getBlockByNumber(
    blockNumberOrPending: BN | "pending"
  ): Promise<Block | undefined>;

  public async getBlockByNumber(
    blockNumberOrPending: BN | "pending"
  ): Promise<Block | undefined> {
    if (blockNumberOrPending === "pending") {
      return this._runInPendingBlockContext(() =>
        this._blockchain.getLatestBlock()
      );
    }

    return this._blockchain.getBlock(blockNumberOrPending);
  }

  public async getBlockByHash(blockHash: Buffer): Promise<Block | undefined> {
    return this._blockchain.getBlock(blockHash);
  }

  public async getBlockByTransactionHash(
    hash: Buffer
  ): Promise<Block | undefined> {
    return this._blockchain.getBlockByTransactionHash(hash);
  }

  public async getBlockTotalDifficulty(block: Block): Promise<BN> {
    return this._blockchain.getTotalDifficulty(block.hash());
  }

  public async getCode(
    address: Buffer,
    blockNumberOrPending: BN | "pending"
  ): Promise<Buffer> {
    return this._runInBlockContext(blockNumberOrPending, () =>
      this._stateManager.getContractCode(address)
    );
  }

  public getNextBlockTimestamp(): BN {
    return this._nextBlockTimestamp.clone();
  }

  public setNextBlockTimestamp(timestamp: BN) {
    this._nextBlockTimestamp = new BN(timestamp);
  }

  public getTimeIncrement(): BN {
    return this._blockTimeOffsetSeconds.clone();
  }

  public setTimeIncrement(timeIncrement: BN) {
    this._blockTimeOffsetSeconds = timeIncrement;
  }

  public increaseTime(increment: BN) {
    this._blockTimeOffsetSeconds = this._blockTimeOffsetSeconds.add(increment);
  }

  public async getPendingTransaction(
    hash: Buffer
  ): Promise<Transaction | undefined> {
    return this._txPool.getTransactionByHash(hash)?.data;
  }

  public async getTransactionReceipt(
    hash: Buffer | string
  ): Promise<RpcReceiptOutput | undefined> {
    const hashBuffer = hash instanceof Buffer ? hash : toBuffer(hash);
    return this._blockchain.getTransactionReceipt(hashBuffer);
  }

  public async getPendingTransactions(): Promise<Transaction[]> {
    const txPoolPending = txMapToArray(this._txPool.getPendingTransactions());
    const txPoolQueued = txMapToArray(this._txPool.getQueuedTransactions());
    return txPoolPending.concat(txPoolQueued);
  }

  public async signPersonalMessage(
    address: Buffer,
    data: Buffer
  ): Promise<ECDSASignature> {
    const messageHash = hashPersonalMessage(data);
    const privateKey = this._getLocalAccountPrivateKey(address);

    return ecsign(messageHash, privateKey);
  }

  public async signTypedData(address: Buffer, typedData: any): Promise<string> {
    const privateKey = this._getLocalAccountPrivateKey(address);

    return ethSigUtil.signTypedData_v4(privateKey, {
      data: typedData,
    });
  }

  public getStackTraceFailuresCount(): number {
    return this._failedStackTraces;
  }

  public async takeSnapshot(): Promise<number> {
    const id = this._nextSnapshotId;

    const snapshot: Snapshot = {
      id,
      date: new Date(),
      latestBlock: await this.getLatestBlock(),
      stateRoot: await this._stateManager.getStateRoot(),
      txPoolSnapshotId: this._txPool.snapshot(),
      blockTimeOffsetSeconds: this.getTimeIncrement(),
      nextBlockTimestamp: this.getNextBlockTimestamp(),
    };

    this._snapshots.push(snapshot);
    this._nextSnapshotId += 1;

    return id;
  }

  public async revertToSnapshot(id: number): Promise<boolean> {
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
    const newOffset = snapshot.blockTimeOffsetSeconds.addn(
      offsetToSnapshotInSecs
    );

    // We delete all following blocks, changes the state root, and all the
    // relevant Node fields.
    //
    // Note: There's no need to copy the maps here, as snapshots can only be
    // used once
    this._blockchain.deleteLaterBlocks(snapshot.latestBlock);
    await this._stateManager.setStateRoot(snapshot.stateRoot);
    this.setTimeIncrement(newOffset);
    this.setNextBlockTimestamp(snapshot.nextBlockTimestamp);
    this._txPool.revert(snapshot.txPoolSnapshotId);

    // We delete this and the following snapshots, as they can only be used
    // once in Ganache
    this._snapshots.splice(snapshotIndex);

    return true;
  }

  public async newFilter(
    filterParams: FilterParams,
    isSubscription: boolean
  ): Promise<BN> {
    filterParams = await this._computeFilterParams(filterParams, true);

    const filterId = this._getNextFilterId();
    this._filters.set(this._filterIdToFiltersKey(filterId), {
      id: filterId,
      type: Type.LOGS_SUBSCRIPTION,
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

  public async newBlockFilter(isSubscription: boolean): Promise<BN> {
    const block = await this.getLatestBlock();

    const filterId = this._getNextFilterId();
    this._filters.set(this._filterIdToFiltersKey(filterId), {
      id: filterId,
      type: Type.BLOCK_SUBSCRIPTION,
      deadline: this._newDeadline(),
      hashes: [bufferToHex(block.header.hash())],
      logs: [],
      subscription: isSubscription,
    });

    return filterId;
  }

  public async newPendingTransactionFilter(
    isSubscription: boolean
  ): Promise<BN> {
    const filterId = this._getNextFilterId();

    this._filters.set(this._filterIdToFiltersKey(filterId), {
      id: filterId,
      type: Type.PENDING_TRANSACTION_SUBSCRIPTION,
      deadline: this._newDeadline(),
      hashes: [],
      logs: [],
      subscription: isSubscription,
    });

    return filterId;
  }

  public async uninstallFilter(
    filterId: BN,
    subscription: boolean
  ): Promise<boolean> {
    const key = this._filterIdToFiltersKey(filterId);
    const filter = this._filters.get(key);

    if (filter === undefined) {
      return false;
    }

    if (
      (filter.subscription && !subscription) ||
      (!filter.subscription && subscription)
    ) {
      return false;
    }

    this._filters.delete(key);
    return true;
  }

  public async getFilterChanges(
    filterId: BN
  ): Promise<string[] | RpcLogOutput[] | undefined> {
    const key = this._filterIdToFiltersKey(filterId);
    const filter = this._filters.get(key);
    if (filter === undefined) {
      return undefined;
    }

    filter.deadline = this._newDeadline();
    switch (filter.type) {
      case Type.BLOCK_SUBSCRIPTION:
      case Type.PENDING_TRANSACTION_SUBSCRIPTION:
        const hashes = filter.hashes;
        filter.hashes = [];
        return hashes;
      case Type.LOGS_SUBSCRIPTION:
        const logs = filter.logs;
        filter.logs = [];
        return logs;
    }

    return undefined;
  }

  public async getFilterLogs(
    filterId: BN
  ): Promise<RpcLogOutput[] | undefined> {
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

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    filterParams = await this._computeFilterParams(filterParams, false);
    return this._blockchain.getLogs(filterParams);
  }

  public async addCompilationResult(
    solcVersion: string,
    compilerInput: CompilerInput,
    compilerOutput: CompilerOutput
  ): Promise<boolean> {
    let bytecodes;
    try {
      bytecodes = createModelsAndDecodeBytecodes(
        solcVersion,
        compilerInput,
        compilerOutput
      );
    } catch (error) {
      console.warn(
        chalk.yellow(
          "The Hardhat Network tracing engine could not be updated. Run Hardhat with --verbose to learn more."
        )
      );

      log(
        "ContractsIdentifier failed to be updated. Please report this to help us improve Hardhat.\n",
        error
      );

      return false;
    }

    for (const bytecode of bytecodes) {
      this._vmTraceDecoder.addBytecode(bytecode);
    }

    return true;
  }

  public addImpersonatedAccount(address: Buffer): true {
    this._impersonatedAccounts.add(bufferToHex(address));
    return true;
  }

  public removeImpersonatedAccount(address: Buffer): boolean {
    return this._impersonatedAccounts.delete(bufferToHex(address));
  }

  public setAutomineEnabled(automine: boolean) {
    this._automine = automine;
  }

  public async setBlockGasLimit(gasLimit: BN | number) {
    this._txPool.setBlockGasLimit(gasLimit);
    await this._txPool.clean();
  }

  private async _addPendingTransaction(tx: Transaction): Promise<string> {
    await this._txPool.addTransaction(tx);
    await this._notifyPendingTransaction(tx);
    return bufferToHex(tx.hash());
  }

  private async _mineTransaction(tx: Transaction): Promise<MineBlockResult> {
    const txHash = await this._addPendingTransaction(tx);
    return this.mineBlock(undefined, txHash);
  }

  private async _mineTransactionAndPending(
    tx: Transaction
  ): Promise<MineBlockResult[]> {
    const snapshotId = await this.takeSnapshot();

    let result;
    try {
      const txHash = await this._addPendingTransaction(tx);
      result = await this._mineBlocksUntilTransactionIsIncluded(txHash);
    } catch (err) {
      await this.revertToSnapshot(snapshotId);
      throw err;
    }

    this._removeSnapshot(snapshotId);
    return result;
  }

  private async _mineBlocksUntilTransactionIsIncluded(
    txHash: string
  ): Promise<MineBlockResult[]> {
    const results = [];
    let txReceipt;
    do {
      if (!this._txPool.hasPendingTransactions()) {
        throw new TransactionExecutionError(
          "Failed to mine transaction for unknown reason, this should never happen"
        );
      }
      results.push(await this.mineBlock(undefined, txHash));
      txReceipt = await this.getTransactionReceipt(txHash);
    } while (txReceipt === undefined);

    return results;
  }

  private async _gatherTraces(result: ExecResult): Promise<GatherTracesResult> {
    let vmTrace = this._vmTracer.getLastTopLevelMessageTrace();
    const vmTracerError = this._vmTracer.getLastError();
    this._vmTracer.clearLastError();

    if (vmTrace !== undefined) {
      vmTrace = this._vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
    }

    const consoleLogMessages = await this._getConsoleLogMessages(
      vmTrace,
      vmTracerError
    );

    const error = await this._manageErrors(result, vmTrace, vmTracerError);

    return {
      trace: vmTrace,
      consoleLogMessages,
      error,
    };
  }

  private async _validateExactNonce(tx: Transaction) {
    let sender: Buffer;
    try {
      sender = tx.getSenderAddress(); // verifies signature as a side effect
    } catch (e) {
      throw new InvalidInputError(e.message);
    }

    const senderNonce = await this._txPool.getExecutableNonce(sender);
    const txNonce = new BN(tx.nonce);

    const expectedNonceMsg = `Expected nonce to be ${senderNonce} but got ${txNonce}.`;
    if (txNonce.gt(senderNonce)) {
      throw new InvalidInputError(
        `Nonce too high. ${expectedNonceMsg} Note that transactions can't be queued when automining.`
      );
    }
    if (txNonce.lt(senderNonce)) {
      throw new InvalidInputError(`Nonce too low. ${expectedNonceMsg}`);
    }
  }

  private async _mineBlockWithPendingTxs(
    blockTimestamp: BN,
    sentTxHash?: string
  ): Promise<MineBlockResult> {
    const block = await this._getNextBlockTemplate(blockTimestamp);

    const bloom = new Bloom();
    const results: RunTxResult[] = [];
    const receipts: TxReceipt[] = [];
    const traces: GatherTracesResult[] = [];

    const blockGasLimit = this.getBlockGasLimit();
    const minTxFee = this._getMinimalTransactionFee();
    const gasLeft = blockGasLimit.clone();
    const pendingTxs = this._txPool.getPendingTransactions();
    const txHeap = new TxPriorityHeap(pendingTxs);

    let tx = txHeap.peek();
    while (gasLeft.gte(minTxFee) && tx !== undefined) {
      const shouldThrow =
        sentTxHash !== undefined && sentTxHash === bufferToHex(tx.hash());

      const txResult = await this._runTx(tx, block, gasLeft, shouldThrow);
      if (txResult !== null) {
        bloom.or(txResult.bloom);
        results.push(txResult);
        receipts.push(this._createReceipt(txResult));
        traces.push(await this._gatherTraces(txResult.execResult));
        block.transactions.push(tx);

        gasLeft.isub(txResult.gasUsed);
        txHeap.shift();
      } else {
        txHeap.pop();
      }
      tx = txHeap.peek();
    }

    await this._txPool.clean();
    await this._assignBlockReward();
    await this._updateTransactionsRoot(block);
    block.header.gasUsed = toBuffer(blockGasLimit.sub(gasLeft));
    block.header.stateRoot = await this._stateManager.getStateRoot();
    block.header.bloom = bloom.bitvector;

    return {
      block,
      blockResult: {
        results,
        receipts,
      },
      traces,
    };
  }

  private async _runTx(
    tx: Transaction,
    block: Block,
    gasLeft: BN,
    shouldThrow: boolean
  ): Promise<RunTxResult | null> {
    const preRunStateRoot = await this._stateManager.getStateRoot();
    try {
      const result = await this._vm.runTx({ tx, block });
      if (result.gasUsed.gt(gasLeft)) {
        await this._stateManager.setStateRoot(preRunStateRoot);
        return null;
      }
      return result;
    } catch (err) {
      if (shouldThrow) {
        throw err;
      }
      return null;
    }
  }

  private async _assignBlockReward() {
    const minerAddress = this.getCoinbaseAddress();
    const miner = await this._stateManager.getAccount(minerAddress);
    const blockReward = this._getBlockReward();
    miner.balance = toBuffer(new BN(miner.balance).add(blockReward));
    await this._stateManager.putAccount(minerAddress, miner);
  }

  private _getMinimalTransactionFee(): BN {
    // Typically 21_000 gas
    return new BN(this._vm._common.param("gasPrices", "tx"));
  }

  private _getBlockReward(): BN {
    return new BN(this._vm._common.param("pow", "minerReward"));
  }

  private _createReceipt(txResult: RunTxResult): TxReceipt {
    return {
      status: txResult.execResult.exceptionError === undefined ? 1 : 0, // Receipts have a 0 as status on error
      gasUsed: toBuffer(txResult.gasUsed),
      bitvector: txResult.bloom.bitvector,
      logs: txResult.execResult.logs ?? [],
    };
  }

  private async _getFakeTransaction(
    txParams: TransactionParams
  ): Promise<Transaction> {
    return new FakeTransaction(txParams, { common: this._vm._common });
  }

  private _getSnapshotIndex(id: number): number | undefined {
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

  private _removeSnapshot(id: number) {
    const snapshotIndex = this._getSnapshotIndex(id);
    if (snapshotIndex === undefined) {
      return;
    }
    this._snapshots.splice(snapshotIndex);
  }

  private _initLocalAccounts(genesisAccounts: GenesisAccount[]) {
    const privateKeys = genesisAccounts.map((acc) => toBuffer(acc.privateKey));
    for (const pk of privateKeys) {
      this._localAccounts.set(bufferToHex(privateToAddress(pk)), pk);
    }
  }

  private async _getConsoleLogMessages(
    vmTrace: MessageTrace | undefined,
    vmTracerError: Error | undefined
  ): Promise<string[]> {
    if (vmTrace === undefined || vmTracerError !== undefined) {
      log(
        "Could not print console log. Please report this to help us improve Hardhat.\n",
        vmTracerError
      );

      return [];
    }

    return this._consoleLogger.getLogMessages(vmTrace);
  }

  private async _manageErrors(
    vmResult: ExecResult,
    vmTrace: MessageTrace | undefined,
    vmTracerError: Error | undefined
  ): Promise<SolidityError | TransactionExecutionError | undefined> {
    if (vmResult.exceptionError === undefined) {
      return undefined;
    }

    let stackTrace: SolidityStackTrace | undefined;

    try {
      if (vmTrace === undefined || vmTracerError !== undefined) {
        throw vmTracerError;
      }

      stackTrace = this._solidityTracer.getStackTrace(vmTrace);
    } catch (error) {
      this._failedStackTraces += 1;
      log(
        "Could not generate stack trace. Please report this to help us improve Hardhat.\n",
        error
      );
    }

    const error = vmResult.exceptionError;

    if (error.error === ERROR.OUT_OF_GAS) {
      if (this._isContractTooLargeStackTrace(stackTrace)) {
        return encodeSolidityStackTrace(
          "Transaction ran out of gas",
          stackTrace!
        );
      }

      return new TransactionExecutionError("Transaction ran out of gas");
    }

    if (error.error === ERROR.REVERT) {
      if (vmResult.returnValue.length === 0) {
        if (stackTrace !== undefined) {
          return encodeSolidityStackTrace(
            "Transaction reverted without a reason",
            stackTrace
          );
        }

        return new TransactionExecutionError(
          "Transaction reverted without a reason"
        );
      }

      if (stackTrace !== undefined) {
        return encodeSolidityStackTrace(
          `VM Exception while processing transaction: revert ${decodeRevertReason(
            vmResult.returnValue
          )}`,
          stackTrace
        );
      }

      return new TransactionExecutionError(
        `VM Exception while processing transaction: revert ${decodeRevertReason(
          vmResult.returnValue
        )}`
      );
    }

    if (stackTrace !== undefined) {
      return encodeSolidityStackTrace("Transaction failed: revert", stackTrace);
    }

    return new TransactionExecutionError("Transaction failed: revert");
  }

  private _isContractTooLargeStackTrace(
    stackTrace: SolidityStackTrace | undefined
  ) {
    return (
      stackTrace !== undefined &&
      stackTrace.length > 0 &&
      stackTrace[stackTrace.length - 1].type ===
        StackTraceEntryType.CONTRACT_TOO_LARGE_ERROR
    );
  }

  private _calculateTimestampAndOffset(timestamp?: BN): [BN, boolean, BN] {
    let blockTimestamp: BN;
    let offsetShouldChange: boolean;
    let newOffset: BN = new BN(0);
    const currentTimestamp = new BN(getCurrentTimestamp());

    // if timestamp is not provided, we check nextBlockTimestamp, if it is
    // set, we use it as the timestamp instead. If it is not set, we use
    // time offset + real time as the timestamp.
    if (timestamp === undefined || timestamp.eqn(0)) {
      if (this.getNextBlockTimestamp().eqn(0)) {
        blockTimestamp = currentTimestamp.add(this.getTimeIncrement());
        offsetShouldChange = false;
      } else {
        blockTimestamp = this.getNextBlockTimestamp();
        offsetShouldChange = true;
      }
    } else {
      offsetShouldChange = true;
      blockTimestamp = timestamp;
    }

    if (offsetShouldChange) {
      newOffset = blockTimestamp.sub(currentTimestamp);
    }

    return [blockTimestamp, offsetShouldChange, newOffset];
  }

  private async _getNextBlockTemplate(timestamp: BN): Promise<Block> {
    const block = new Block(
      {
        header: {
          gasLimit: this.getBlockGasLimit(),
          nonce: "0x42",
          timestamp,
        },
      },
      { common: this._vm._common }
    );

    block.validate = (blockchain: any, cb: any) => cb(null);

    const latestBlock = await this.getLatestBlock();

    block.header.number = toBuffer(new BN(latestBlock.header.number).addn(1));
    block.header.parentHash = latestBlock.hash();
    block.header.difficulty = block.header
      .canonicalDifficulty(latestBlock)
      .toBuffer();
    block.header.coinbase = this.getCoinbaseAddress();

    return block;
  }

  private async _resetNextBlockTimestamp() {
    this.setNextBlockTimestamp(new BN(0));
  }

  private async _notifyPendingTransaction(tx: Transaction) {
    this._filters.forEach((filter) => {
      if (filter.type === Type.PENDING_TRANSACTION_SUBSCRIPTION) {
        const hash = bufferToHex(tx.hash(true));
        if (filter.subscription) {
          this._emitEthEvent(filter.id, hash);
          return;
        }

        filter.hashes.push(hash);
      }
    });
  }

  private _getLocalAccountPrivateKey(sender: Buffer): Buffer {
    const senderAddress = bufferToHex(sender);
    if (!this._localAccounts.has(senderAddress)) {
      throw new InvalidInputError(`unknown account ${senderAddress}`);
    }

    return this._localAccounts.get(senderAddress)!;
  }

  private async _addTransactionToBlock(block: Block, tx: Transaction) {
    block.transactions.push(tx);
    await this._updateTransactionsRoot(block);
  }

  private async _updateTransactionsRoot(block: Block) {
    await new Promise((resolve) => block.genTxTrie(resolve));
    block.header.transactionsTrie = block.txTrie.root;
  }

  private async _saveBlockAsSuccessfullyRun(
    block: Block,
    runBlockResult: RunBlockResult
  ) {
    const receipts = getRpcReceipts(block, runBlockResult);

    await this._blockchain.addBlock(block);
    this._blockchain.addTransactionReceipts(receipts);

    const td = await this.getBlockTotalDifficulty(block);
    const rpcLogs: RpcLogOutput[] = [];
    for (const receipt of receipts) {
      rpcLogs.push(...receipt.logs);
    }

    this._filters.forEach((filter, key) => {
      if (filter.deadline.valueOf() < new Date().valueOf()) {
        this._filters.delete(key);
      }

      switch (filter.type) {
        case Type.BLOCK_SUBSCRIPTION:
          const hash = block.hash();
          if (filter.subscription) {
            this._emitEthEvent(filter.id, getRpcBlock(block, td, false));
            return;
          }

          filter.hashes.push(bufferToHex(hash));
          break;
        case Type.LOGS_SUBSCRIPTION:
          if (
            bloomFilter(
              new Bloom(block.header.bloom),
              filter.criteria!.addresses,
              filter.criteria!.normalizedTopics
            )
          ) {
            const logs = filterLogs(rpcLogs, filter.criteria!);
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

  private async _timestampClashesWithPreviousBlockOne(
    blockTimestamp: BN
  ): Promise<boolean> {
    const latestBlock = await this.getLatestBlock();
    const latestBlockTimestamp = new BN(latestBlock.header.timestamp);

    return latestBlockTimestamp.eq(blockTimestamp);
  }

  private async _runInBlockContext<T>(
    blockNumberOrPending: BN | "pending",
    action: () => Promise<T>
  ): Promise<T> {
    if (blockNumberOrPending === "pending") {
      return this._runInPendingBlockContext(action);
    }

    if (blockNumberOrPending.eq(await this.getLatestBlockNumber())) {
      return action();
    }

    const block = await this.getBlockByNumber(blockNumberOrPending);
    if (block === undefined) {
      // TODO handle this better
      throw new Error(
        `Block with number ${blockNumberOrPending} doesn't exist. This should never happen.`
      );
    }

    const currentStateRoot = await this._stateManager.getStateRoot();
    await this._setBlockContext(block);
    try {
      return await action();
    } finally {
      await this._restoreBlockContext(currentStateRoot);
    }
  }

  private async _runInPendingBlockContext<T>(action: () => Promise<T>) {
    const snapshotId = await this.takeSnapshot();
    try {
      await this.mineBlock();
      return await action();
    } finally {
      await this.revertToSnapshot(snapshotId);
    }
  }

  private async _setBlockContext(block: Block): Promise<void> {
    if (this._stateManager instanceof ForkStateManager) {
      return this._stateManager.setBlockContext(
        block.header.stateRoot,
        new BN(block.header.number)
      );
    }
    return this._stateManager.setStateRoot(block.header.stateRoot);
  }

  private async _restoreBlockContext(stateRoot: Buffer) {
    if (this._stateManager instanceof ForkStateManager) {
      return this._stateManager.restoreForkBlockContext(stateRoot);
    }
    return this._stateManager.setStateRoot(stateRoot);
  }

  private async _correctInitialEstimation(
    blockNumberOrPending: BN | "pending",
    txParams: TransactionParams,
    initialEstimation: BN
  ): Promise<BN> {
    let tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: initialEstimation,
    });

    if (tx.getBaseFee().gte(initialEstimation)) {
      initialEstimation = tx.getBaseFee().addn(1);

      tx = await this._getFakeTransaction({
        ...txParams,
        gasLimit: initialEstimation,
      });
    }

    const result = await this._runInBlockContext(blockNumberOrPending, () =>
      this._runTxAndRevertMutations(tx, blockNumberOrPending, true)
    );

    if (result.execResult.exceptionError === undefined) {
      return initialEstimation;
    }

    return this._binarySearchEstimation(
      blockNumberOrPending,
      txParams,
      initialEstimation,
      this.getBlockGasLimit()
    );
  }

  private async _binarySearchEstimation(
    blockNumberOrPending: BN | "pending",
    txParams: TransactionParams,
    highestFailingEstimation: BN,
    lowestSuccessfulEstimation: BN,
    roundNumber = 0
  ): Promise<BN> {
    if (lowestSuccessfulEstimation.lte(highestFailingEstimation)) {
      // This shouldn't happen, but we don't want to go into an infinite loop
      // if it ever happens
      return lowestSuccessfulEstimation;
    }

    const MAX_GAS_ESTIMATION_IMPROVEMENT_ROUNDS = 20;

    const diff = lowestSuccessfulEstimation.sub(highestFailingEstimation);

    const minDiff = highestFailingEstimation.gten(4_000_000)
      ? 50_000
      : highestFailingEstimation.gten(1_000_000)
      ? 10_000
      : highestFailingEstimation.gten(100_000)
      ? 1_000
      : highestFailingEstimation.gten(50_000)
      ? 500
      : highestFailingEstimation.gten(30_000)
      ? 300
      : 200;

    if (diff.lten(minDiff)) {
      return lowestSuccessfulEstimation;
    }

    if (roundNumber > MAX_GAS_ESTIMATION_IMPROVEMENT_ROUNDS) {
      return lowestSuccessfulEstimation;
    }

    const binSearchNewEstimation = highestFailingEstimation.add(diff.divn(2));

    const optimizedEstimation =
      roundNumber === 0
        ? highestFailingEstimation.muln(3)
        : binSearchNewEstimation;

    const newEstimation = optimizedEstimation.gt(binSearchNewEstimation)
      ? binSearchNewEstimation
      : optimizedEstimation;

    // Let other things execute
    await new Promise((resolve) => setImmediate(resolve));

    const tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: newEstimation,
    });

    const result = await this._runInBlockContext(blockNumberOrPending, () =>
      this._runTxAndRevertMutations(tx, blockNumberOrPending, true)
    );

    if (result.execResult.exceptionError === undefined) {
      return this._binarySearchEstimation(
        blockNumberOrPending,
        txParams,
        highestFailingEstimation,
        newEstimation,
        roundNumber + 1
      );
    }

    return this._binarySearchEstimation(
      blockNumberOrPending,
      txParams,
      newEstimation,
      lowestSuccessfulEstimation,
      roundNumber + 1
    );
  }

  /**
   * This function runs a transaction and reverts all the modifications that it
   * makes.
   *
   * If throwOnError is true, errors are managed locally and thrown on
   * failure. If it's false, the tx's RunTxResult is returned, and the vmTracer
   * inspected/reset.
   */
  private async _runTxAndRevertMutations(
    tx: Transaction,
    blockNumberOrPending: BN | "pending",
    calledToEstimateGas = false
  ): Promise<EVMResult> {
    const initialStateRoot = await this._stateManager.getStateRoot();

    try {
      let blockContext;
      // gas is estimated in the context of a new block
      if (calledToEstimateGas && blockNumberOrPending !== "pending") {
        const [blockTimestamp] = this._calculateTimestampAndOffset();
        const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(
          blockTimestamp
        );
        if (needsTimestampIncrease) {
          blockTimestamp.iaddn(1);
        }

        blockContext = await this._getNextBlockTemplate(blockTimestamp);

        // in the context of running estimateGas call, we have to do binary
        // search for the gas and run the call multiple times. Since it is
        // an approximate approach to calculate the gas, it is important to
        // run the call in a block that is as close to the real one as
        // possible, hence putting the tx to the block is good to have here.
        await this._addTransactionToBlock(blockContext, tx);
      } else if (blockNumberOrPending === "pending") {
        // the new block has already been mined by _runInBlockContext hence we take latest here
        blockContext = await this.getLatestBlock();
      } else {
        blockContext = await this.getBlockByNumber(blockNumberOrPending);
      }

      return await this._vm.runTx({
        block: blockContext,
        tx,
        skipNonce: true,
        skipBalance: true,
      });
    } finally {
      await this._stateManager.setStateRoot(initialStateRoot);
    }
  }

  private async _computeFilterParams(
    filterParams: FilterParams,
    isFilter: boolean
  ): Promise<FilterParams> {
    const latestBlockNumber = await this.getLatestBlockNumber();
    const newFilterParams = { ...filterParams };

    if (newFilterParams.fromBlock === LATEST_BLOCK) {
      newFilterParams.fromBlock = latestBlockNumber;
    }

    if (!isFilter && newFilterParams.toBlock === LATEST_BLOCK) {
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

  private _newDeadline(): Date {
    const dt = new Date();
    dt.setMinutes(dt.getMinutes() + 5); // This will not overflow
    return dt;
  }

  private _getNextFilterId(): BN {
    this._lastFilterId = this._lastFilterId.addn(1);

    return this._lastFilterId;
  }

  private _filterIdToFiltersKey(filterId: BN): string {
    return filterId.toString();
  }

  private _emitEthEvent(filterId: BN, result: any) {
    this.emit("ethEvent", {
      result,
      filterId,
    });
  }
}
