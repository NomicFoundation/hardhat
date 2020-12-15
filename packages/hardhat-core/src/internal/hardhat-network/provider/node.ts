import VM from "@nomiclabs/ethereumjs-vm";
import Bloom from "@nomiclabs/ethereumjs-vm/dist/bloom";
import { EVMResult, ExecResult } from "@nomiclabs/ethereumjs-vm/dist/evm/evm";
import { ERROR } from "@nomiclabs/ethereumjs-vm/dist/exceptions";
import { RunBlockResult } from "@nomiclabs/ethereumjs-vm/dist/runBlock";
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
import { assertHardhatInvariant } from "../../core/errors";
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
  FilterParams,
  GenesisAccount,
  NodeConfig,
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
      genesisAccounts,
      blockGasLimit,
      allowUnlimitedContractSize,
      tracingConfig,
    } = config;

    let common: Common;
    let stateManager: StateManager | ForkStateManager;
    let blockchain: HardhatBlockchain | ForkBlockchain;
    let initialBlockTimeOffset: BN | undefined;

    if ("forkConfig" in config) {
      const { forkClient, forkBlockNumber } = await makeForkClient(
        config.forkConfig,
        config.forkCachePath
      );
      common = await makeForkCommon(config);

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
      new BN(blockGasLimit),

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
    private readonly _blockGasLimit: BN,
    private _blockTimeOffsetSeconds: BN = new BN(0),
    genesisAccounts: GenesisAccount[],
    tracingConfig?: TracingConfig
  ) {
    super();

    this._initLocalAccounts(genesisAccounts);

    this._vmTracer = new VMTracer(
      this._vm,
      this._stateManager.getContractCode.bind(this._stateManager),
      true
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

  public async _getFakeTransaction(
    txParams: TransactionParams
  ): Promise<Transaction> {
    return new FakeTransaction(txParams, { common: this._vm._common });
  }

  public async runTransactionInNewBlock(
    tx: Transaction
  ): Promise<{
    trace: MessageTrace | undefined;
    block: Block;
    blockResult: RunBlockResult;
    error?: Error;
    consoleLogMessages: string[];
  }> {
    await this._validateTransaction(tx);
    await this._notifyPendingTransaction(tx);

    const [
      blockTimestamp,
      offsetShouldChange,
      newOffset,
    ] = this._calculateTimestampAndOffset();

    const block = await this._getNextBlockTemplate(blockTimestamp);

    const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(
      block
    );

    if (needsTimestampIncrease) {
      await this._increaseBlockTimestamp(block);
    }

    await this._addTransactionToBlock(block, tx);

    const result = await this._vm.runBlock({
      block,
      generate: true,
      skipBlockValidation: true,
    });

    if (needsTimestampIncrease) {
      await this.increaseTime(new BN(1));
    }

    await this._saveBlockAsSuccessfullyRun(block, result);

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

    const error = await this._manageErrors(
      result.results[0].execResult,
      vmTrace,
      vmTracerError
    );

    if (offsetShouldChange) {
      await this.increaseTime(newOffset.sub(await this.getTimeIncrement()));
    }

    await this._resetNextBlockTimestamp();

    return {
      trace: vmTrace,
      block,
      blockResult: result,
      error,
      consoleLogMessages,
    };
  }

  public async mineEmptyBlock(timestamp: BN) {
    // need to check if timestamp is specified or nextBlockTimestamp is set
    // if it is, time offset must be set to timestamp|nextBlockTimestamp - Date.now
    // if it is not, time offset remain the same
    const [
      blockTimestamp,
      offsetShouldChange,
      newOffset,
    ] = this._calculateTimestampAndOffset(timestamp);

    const block = await this._getNextBlockTemplate(blockTimestamp);

    const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(
      block
    );

    if (needsTimestampIncrease) {
      await this._increaseBlockTimestamp(block);
    }

    await new Promise((resolve) => block.genTxTrie(resolve));
    block.header.transactionsTrie = block.txTrie.root;

    const previousRoot = await this._stateManager.getStateRoot();

    let result: RunBlockResult;
    try {
      result = await this._vm.runBlock({
        block,
        generate: true,
        skipBlockValidation: true,
      });

      if (needsTimestampIncrease) {
        await this.increaseTime(new BN(1));
      }

      await this._saveBlockAsSuccessfullyRun(block, result);

      if (offsetShouldChange) {
        await this.increaseTime(newOffset.sub(await this.getTimeIncrement()));
      }

      await this._resetNextBlockTimestamp();

      return result;
    } catch (error) {
      // We set the state root to the previous one. This is equivalent to a
      // rollback of this block.
      await this._stateManager.setStateRoot(previousRoot);

      throw new TransactionExecutionError(error);
    }
  }

  public async runCall(
    call: CallParams,
    blockNumber: BN | null
  ): Promise<{
    result: Buffer;
    trace: MessageTrace | undefined;
    error?: Error;
    consoleLogMessages: string[];
  }> {
    const tx = await this._getFakeTransaction({
      ...call,
      nonce: await this.getAccountNonce(call.from, null),
    });

    const result = await this._runInBlockContext(blockNumber, () =>
      this._runTxAndRevertMutations(tx, blockNumber ?? undefined, true)
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

    const error = await this._manageErrors(
      result.execResult,
      vmTrace,
      vmTracerError
    );

    return {
      result: result.execResult.returnValue,
      trace: vmTrace,
      error,
      consoleLogMessages,
    };
  }

  public async getAccountBalance(
    address: Buffer,
    blockNumber: BN | null
  ): Promise<BN> {
    const account = await this._runInBlockContext(blockNumber, () =>
      this._stateManager.getAccount(address)
    );

    return new BN(account.balance);
  }

  public async getAccountNonce(
    address: Buffer,
    blockNumber: BN | null
  ): Promise<BN> {
    const account = await this._runInBlockContext(blockNumber, () =>
      this._stateManager.getAccount(address)
    );

    return new BN(account.nonce);
  }

  public async getLatestBlock(): Promise<Block> {
    return this._blockchain.getLatestBlock();
  }

  public async getLatestBlockNumber(): Promise<BN> {
    return new BN((await this.getLatestBlock()).header.number);
  }

  public async getLocalAccountAddresses(): Promise<string[]> {
    return [...this._localAccounts.keys()];
  }

  public async getBlockGasLimit(): Promise<BN> {
    return this._blockGasLimit;
  }

  public async estimateGas(
    txParams: TransactionParams,
    blockNumber: BN | null
  ): Promise<{
    estimation: BN;
    trace: MessageTrace | undefined;
    error?: Error;
    consoleLogMessages: string[];
  }> {
    const tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: await this.getBlockGasLimit(),
    });

    const result = await this._runInBlockContext(blockNumber, () =>
      this._runTxAndRevertMutations(tx)
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
        estimation: await this.getBlockGasLimit(),
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

  public async getCoinbaseAddress(): Promise<Buffer> {
    return COINBASE_ADDRESS;
  }

  public async getStorageAt(
    address: Buffer,
    slot: BN,
    blockNumber: BN | null
  ): Promise<Buffer> {
    const key = slot.toArrayLike(Buffer, "be", 32);

    const data: Buffer = await this._runInBlockContext(blockNumber, () =>
      this._stateManager.getContractStorage(address, key)
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

  public async getBlockByNumber(blockNumber: BN): Promise<Block | undefined> {
    return this._blockchain.getBlock(blockNumber);
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
    blockNumber: BN | null
  ): Promise<Buffer> {
    return this._runInBlockContext(blockNumber, () =>
      this._stateManager.getContractCode(address)
    );
  }

  public async setNextBlockTimestamp(timestamp: BN) {
    this._nextBlockTimestamp = new BN(timestamp);
  }

  public async increaseTime(increment: BN) {
    this._blockTimeOffsetSeconds = this._blockTimeOffsetSeconds.add(increment);
  }

  public async getTimeIncrement(): Promise<BN> {
    return this._blockTimeOffsetSeconds;
  }

  public async getNextBlockTimestamp(): Promise<BN> {
    return this._nextBlockTimestamp;
  }

  public async getTransaction(hash: Buffer): Promise<Transaction | undefined> {
    return this._blockchain.getTransaction(hash);
  }

  public async getTransactionReceipt(
    hash: Buffer
  ): Promise<RpcReceiptOutput | undefined> {
    return this._blockchain.getTransactionReceipt(hash);
  }

  public async getPendingTransactions(): Promise<Transaction[]> {
    return [];
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

  public async getStackTraceFailuresCount(): Promise<number> {
    return this._failedStackTraces;
  }

  public async takeSnapshot(): Promise<number> {
    const id = this._nextSnapshotId;

    // We copy all the maps here, as they may be modified
    const snapshot: Snapshot = {
      id,
      date: new Date(),
      latestBlock: await this.getLatestBlock(),
      stateRoot: await this._stateManager.getStateRoot(),
      blockTimeOffsetSeconds: new BN(this._blockTimeOffsetSeconds),
      nextBlockTimestamp: new BN(this._nextBlockTimestamp),
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
    this._blockTimeOffsetSeconds = newOffset;
    this._nextBlockTimestamp = snapshot.nextBlockTimestamp;

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
          "Transaction run out of gas",
          stackTrace!
        );
      }

      return new TransactionExecutionError("Transaction run out of gas");
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

    // if timestamp is not provided, we check nextBlockTimestamp, if it is
    // set, we use it as the timestamp instead. If it is not set, we use
    // time offset + real time as the timestamp.
    if (timestamp === undefined || timestamp.eq(new BN(0))) {
      if (this._nextBlockTimestamp.eq(new BN(0))) {
        blockTimestamp = new BN(getCurrentTimestamp()).add(
          this._blockTimeOffsetSeconds
        );
        offsetShouldChange = false;
      } else {
        blockTimestamp = new BN(this._nextBlockTimestamp);
        offsetShouldChange = true;
      }
    } else {
      offsetShouldChange = true;
      blockTimestamp = timestamp;
    }

    if (offsetShouldChange) {
      newOffset = blockTimestamp.sub(new BN(getCurrentTimestamp()));
    }

    return [blockTimestamp, offsetShouldChange, newOffset];
  }

  private async _getNextBlockTemplate(timestamp: BN): Promise<Block> {
    const block = new Block(
      {
        header: {
          gasLimit: this._blockGasLimit,
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
    block.header.coinbase = await this.getCoinbaseAddress();

    return block;
  }

  private async _resetNextBlockTimestamp() {
    this._nextBlockTimestamp = new BN(0);
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

  private _transactionWasSuccessful(tx: Transaction): boolean {
    const localTransaction = this._blockchain.getLocalTransaction(tx.hash());
    return localTransaction !== undefined;
  }

  private async _timestampClashesWithPreviousBlockOne(
    block: Block
  ): Promise<boolean> {
    const blockTimestamp = new BN(block.header.timestamp);

    const latestBlock = await this.getLatestBlock();
    const latestBlockTimestamp = new BN(latestBlock.header.timestamp);

    return latestBlockTimestamp.eq(blockTimestamp);
  }

  private async _increaseBlockTimestamp(block: Block) {
    block.header.timestamp = new BN(block.header.timestamp).addn(1).toBuffer();
  }

  private async _validateTransaction(tx: Transaction) {
    // Geth throws this error if a tx is sent twice
    if (this._transactionWasSuccessful(tx)) {
      throw new InvalidInputError(
        `known transaction: ${bufferToHex(tx.hash(true)).toString()}`
      );
    }

    if (!tx.verifySignature()) {
      throw new InvalidInputError("Invalid transaction signature");
    }

    // Geth returns this error if trying to create a contract and no data is provided
    if (tx.to.length === 0 && tx.data.length === 0) {
      throw new InvalidInputError(
        "contract creation without any data provided"
      );
    }

    const expectedNonce = await this.getAccountNonce(
      tx.getSenderAddress(),
      null
    );
    const actualNonce = new BN(tx.nonce);
    if (!expectedNonce.eq(actualNonce)) {
      throw new InvalidInputError(
        `Invalid nonce. Expected ${expectedNonce} but got ${actualNonce}.

If you are running a script or test, you may be sending transactions in parallel.
Using JavaScript? You probably forgot an await.

If you are using a wallet or dapp, try resetting your wallet's accounts.`
      );
    }

    const baseFee = tx.getBaseFee();
    const gasLimit = new BN(tx.gasLimit);

    if (baseFee.gt(gasLimit)) {
      throw new InvalidInputError(
        `Transaction requires at least ${baseFee} gas but got ${gasLimit}`
      );
    }

    if (gasLimit.gt(this._blockGasLimit)) {
      throw new InvalidInputError(
        `Transaction gas limit is ${gasLimit} and exceeds block gas limit of ${this._blockGasLimit}`
      );
    }
  }

  private async _runInBlockContext<T>(
    blockNumber: BN | null,
    action: () => Promise<T>
  ): Promise<T> {
    if (
      blockNumber === null ||
      blockNumber.eq(await this.getLatestBlockNumber())
    ) {
      return action();
    }

    const block = await this.getBlockByNumber(blockNumber);
    if (block === undefined) {
      // TODO handle this better
      throw new Error(
        `Block with number ${blockNumber} doesn't exist. This should never happen.`
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

    const result = await this._runTxAndRevertMutations(tx);

    if (result.execResult.exceptionError === undefined) {
      return initialEstimation;
    }

    return this._binarySearchEstimation(
      txParams,
      initialEstimation,
      await this.getBlockGasLimit()
    );
  }

  private async _binarySearchEstimation(
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

    const result = await this._runTxAndRevertMutations(tx);

    if (result.execResult.exceptionError === undefined) {
      return this._binarySearchEstimation(
        txParams,
        highestFailingEstimation,
        newEstimation,
        roundNumber + 1
      );
    }

    return this._binarySearchEstimation(
      txParams,
      newEstimation,
      lowestSuccessfulEstimation,
      roundNumber + 1
    );
  }

  /**
   * This function runs a transaction and reverts all the modifications that it
   * makes.
   */
  private async _runTxAndRevertMutations(
    tx: Transaction,
    blockNumber?: BN,
    // See: https://github.com/ethereumjs/ethereumjs-vm/issues/1014
    workaroundEthCallGasLimitIssue = false
  ): Promise<EVMResult> {
    const initialStateRoot = await this._stateManager.getStateRoot();

    let blockContext: Block | undefined;
    let previousGasLimit: Buffer | undefined;

    try {
      // if the context is to estimate gas or run calls in pending block
      if (blockNumber === undefined) {
        const [blockTimestamp] = this._calculateTimestampAndOffset();

        blockContext = await this._getNextBlockTemplate(blockTimestamp);
        const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(
          blockContext
        );

        if (needsTimestampIncrease) {
          await this._increaseBlockTimestamp(blockContext);
        }

        // in the context of running estimateGas call, we have to do binary
        // search for the gas and run the call multiple times. Since it is
        // an approximate approach to calculate the gas, it is important to
        // run the call in a block that is as close to the real one as
        // possible, hence putting the tx to the block is good to have here.
        await this._addTransactionToBlock(blockContext, tx);
      } else {
        // if the context is to run calls with a block
        // We know that this block number exists, because otherwise
        // there would be an error in the RPC layer.
        const block = await this.getBlockByNumber(blockNumber);
        assertHardhatInvariant(
          block !== undefined,
          "Tried to run a tx in the context of a non-existent block"
        );

        blockContext = block;
      }

      if (workaroundEthCallGasLimitIssue) {
        const txGasLimit = new BN(tx.gasLimit);
        const blockGasLimit = new BN(blockContext.header.gasLimit);

        if (txGasLimit.gt(blockGasLimit)) {
          previousGasLimit = blockContext.header.gasLimit;
          blockContext.header.gasLimit = tx.gasLimit;
        }
      }

      return await this._vm.runTx({
        block: blockContext,
        tx,
        skipNonce: true,
        skipBalance: true,
      });
    } finally {
      // If we changed the block's gas limit of an already existing block,
      // we restore it here.
      if (
        blockContext !== undefined &&
        workaroundEthCallGasLimitIssue &&
        previousGasLimit !== undefined &&
        blockNumber !== undefined
      ) {
        blockContext.header.gasLimit = previousGasLimit;
      }

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
