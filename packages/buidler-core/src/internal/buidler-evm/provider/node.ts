import VM from "@nomiclabs/ethereumjs-vm";
import { EVMResult, ExecResult } from "@nomiclabs/ethereumjs-vm/dist/evm/evm";
import { ERROR } from "@nomiclabs/ethereumjs-vm/dist/exceptions";
import {
  RunBlockResult,
  TxReceipt
} from "@nomiclabs/ethereumjs-vm/dist/runBlock";
import { StateManager } from "@nomiclabs/ethereumjs-vm/dist/state";
import PStateManager from "@nomiclabs/ethereumjs-vm/dist/state/promisified";
import chalk from "chalk";
import debug from "debug";
import Account from "ethereumjs-account";
import Block from "ethereumjs-block";
import Common from "ethereumjs-common";
import { FakeTransaction, Transaction } from "ethereumjs-tx";
import {
  BN,
  bufferToHex,
  ECDSASignature,
  ecsign,
  hashPersonalMessage,
  privateToAddress,
  toBuffer
} from "ethereumjs-util";
import Trie from "merkle-patricia-tree/secure";
import { promisify } from "util";

import { BUIDLEREVM_DEFAULT_GAS_PRICE } from "../../core/config/default-config";
import { getUserConfigPath } from "../../core/project-structure";
import { createModelsAndDecodeBytecodes } from "../stack-traces/compiler-to-model";
import { CompilerInput, CompilerOutput } from "../stack-traces/compiler-types";
import { ConsoleLogger } from "../stack-traces/consoleLogger";
import { ContractsIdentifier } from "../stack-traces/contracts-identifier";
import { decodeRevertReason } from "../stack-traces/revert-reasons";
import { encodeSolidityStackTrace } from "../stack-traces/solidity-errors";
import { SolidityStackTrace } from "../stack-traces/solidity-stack-trace";
import { SolidityTracer } from "../stack-traces/solidityTracer";
import { VMTracer } from "../stack-traces/vm-tracer";

import { Blockchain } from "./blockchain";
import { InternalError, InvalidInputError } from "./errors";
import { getCurrentTimestamp } from "./utils";

const log = debug("buidler:core:buidler-evm:node");

// This library's types are wrong, they don't type check
// tslint:disable-next-line no-var-requires
const ethSigUtil = require("eth-sig-util");

export type Block = any;

export interface GenesisAccount {
  privateKey: string;
  balance: string | number | BN;
}

export const COINBASE_ADDRESS = toBuffer(
  "0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e"
);

export interface CallParams {
  to: Buffer;
  from: Buffer;
  gasLimit: BN;
  gasPrice: BN;
  value: BN;
  data: Buffer;
}

export interface TransactionParams {
  to: Buffer;
  from: Buffer;
  gasLimit: BN;
  gasPrice: BN;
  value: BN;
  data: Buffer;
  nonce: BN;
}

export class TransactionExecutionError extends Error {}

export interface TxBlockResult {
  receipt: TxReceipt;
  createAddresses: Buffer | undefined;
  bloomBitvector: Buffer;
}

// tslint:disable only-buidler-error

export interface SolidityTracerOptions {
  solidityVersion: string;
  compilerInput: CompilerInput;
  compilerOutput: CompilerOutput;
}

export const SUPPORTED_HARDFORKS = [
  "byzantium",
  "constantinople",
  "petersburg",
  "istanbul"
];

interface Snapshot {
  id: number;
  date: Date;
  latestBlock: Block;
  stateRoot: Buffer;
  blockTimeOffsetSeconds: BN;
  transactionByHash: Map<string, Transaction>;
  transactionHashToBlockHash: Map<string, string>;
  blockHashToTxBlockResults: Map<string, TxBlockResult[]>;
  blockHashToTotalDifficulty: Map<string, BN>;
  lastFilterId: number;
  blockFiltersLastBlockSent: Map<number, BN>;
}

export class BuidlerNode {
  public static async create(
    hardfork: string,
    networkName: string,
    chainId: number,
    networkId: number,
    blockGasLimit: number,
    throwOnTransactionFailures: boolean,
    throwOnCallFailures: boolean,
    genesisAccounts: GenesisAccount[] = [],
    stackTracesOptions?: SolidityTracerOptions
  ): Promise<[Common, BuidlerNode]> {
    const stateTrie = new Trie();
    const putIntoStateTrie = promisify(stateTrie.put.bind(stateTrie));
    for (const acc of genesisAccounts) {
      let balance: BN;

      if (
        typeof acc.balance === "string" &&
        acc.balance.toLowerCase().startsWith("0x")
      ) {
        balance = new BN(toBuffer(acc.balance));
      } else {
        balance = new BN(acc.balance);
      }

      const account = new Account({ balance });
      const pk = toBuffer(acc.privateKey);
      const address = privateToAddress(pk);

      await putIntoStateTrie(address, account.serialize());
    }

    // Mimic precompiles activation
    for (let i = 1; i <= 8; i++) {
      await putIntoStateTrie(
        new BN(i).toArrayLike(Buffer, "be", 20),
        new Account().serialize()
      );
    }

    const common = Common.forCustomChain(
      "mainnet",
      {
        chainId,
        networkId,
        name: networkName,
        genesis: {
          timestamp: `0x${getCurrentTimestamp().toString(16)}`,
          hash: "0x",
          gasLimit: blockGasLimit,
          difficulty: 1,
          nonce: "0x42",
          extraData: "0x1234",
          stateRoot: bufferToHex(stateTrie.root)
        }
      },
      hardfork
    );

    const stateManager = new StateManager({
      common: common as any, // TS error because of a version mismatch
      trie: stateTrie
    });

    const blockchain = new Blockchain();

    const vm = new VM({
      common: common as any, // TS error because of a version mismatch
      activatePrecompiles: true,
      stateManager,
      blockchain: blockchain as any
    });

    const genesisBlock = new Block(null, { common });
    genesisBlock.setGenesisParams();

    await new Promise(resolve => {
      blockchain.putBlock(genesisBlock, () => resolve());
    });

    const node = new BuidlerNode(
      vm,
      blockchain,
      genesisAccounts.map(acc => toBuffer(acc.privateKey)),
      new BN(blockGasLimit),
      genesisBlock,
      throwOnTransactionFailures,
      throwOnCallFailures,
      stackTracesOptions
    );

    return [common, node];
  }

  private readonly _common: Common;
  private readonly _stateManager: PStateManager;

  private readonly _accountPrivateKeys: Map<string, Buffer> = new Map();

  private _blockTimeOffsetSeconds: BN = new BN(0);
  private _transactionByHash: Map<string, Transaction> = new Map();
  private _transactionHashToBlockHash: Map<string, string> = new Map();
  private _blockHashToTxBlockResults: Map<string, TxBlockResult[]> = new Map();
  private _blockHashToTotalDifficulty: Map<string, BN> = new Map();

  private _lastFilterId = 0;
  private _blockFiltersLastBlockSent: Map<number, BN> = new Map();

  private _nextSnapshotId = 1; // We start in 1 to mimic Ganache
  private readonly _snapshots: Snapshot[] = [];

  private readonly _stackTracesEnabled: boolean = false;
  private readonly _vmTracer?: VMTracer;
  private readonly _solidityTracer?: SolidityTracer;
  private readonly _consoleLogger: ConsoleLogger = new ConsoleLogger();
  private _failedStackTraces = 0;

  private readonly _getLatestBlock: () => Promise<Block>;
  private readonly _getBlock: (hashOrNumber: Buffer | BN) => Promise<Block>;

  private constructor(
    private readonly _vm: VM,
    private readonly _blockchain: Blockchain,
    localAccounts: Buffer[],
    private readonly _blockGasLimit: BN,
    genesisBlock: Block,
    private readonly _throwOnTransactionFailures: boolean,
    private readonly _throwOnCallFailures: boolean,
    stackTracesOptions?: SolidityTracerOptions
  ) {
    const config = getUserConfigPath();
    this._stateManager = new PStateManager(this._vm.stateManager);
    this._common = this._vm._common as any; // TODO: There's a version mismatch, that's why we cast
    this._initLocalAccounts(localAccounts);

    this._blockHashToTotalDifficulty.set(
      bufferToHex(genesisBlock.hash()),
      this._computeTotalDifficulty(genesisBlock)
    );

    this._getLatestBlock = promisify(
      this._vm.blockchain.getLatestBlock.bind(this._vm.blockchain)
    );

    this._getBlock = promisify(
      this._vm.blockchain.getBlock.bind(this._vm.blockchain)
    );

    this._vmTracer = new VMTracer(this._vm, true);
    this._vmTracer.enableTracing();

    if (stackTracesOptions !== undefined) {
      this._stackTracesEnabled = true;

      try {
        const bytecodes = createModelsAndDecodeBytecodes(
          stackTracesOptions.solidityVersion,
          stackTracesOptions.compilerInput,
          stackTracesOptions.compilerOutput
        );

        const contractsIdentifier = new ContractsIdentifier();

        for (const bytecode of bytecodes) {
          contractsIdentifier.addBytecode(bytecode);
        }

        this._solidityTracer = new SolidityTracer(contractsIdentifier);
      } catch (error) {
        console.warn(
          chalk.yellow(
            "Stack traces engine could not be initialized. Run Buidler with --verbose to learn more."
          )
        );

        this._stackTracesEnabled = false;

        log(
          "Solidity stack traces disabled: SolidityTracer failed to be initialized. Please report this to help us improve Buidler.\n",
          error
        );
      }
    }
  }

  public async getSignedTransaction(
    txParams: TransactionParams
  ): Promise<Transaction> {
    const tx = new Transaction(txParams, { common: this._common });

    const pk = await this._getLocalAccountPrivateKey(txParams.from);
    tx.sign(pk);

    return tx;
  }

  public async _getFakeTransaction(
    txParams: TransactionParams
  ): Promise<Transaction> {
    return new FakeTransaction(txParams, { common: this._common });
  }

  public async runTransactionInNewBlock(
    tx: Transaction
  ): Promise<RunBlockResult> {
    await this._validateTransaction(tx);
    await this._saveTransactionAsReceived(tx);

    const block = await this._getNextBlockTemplate();
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
      skipBlockValidation: true
    });

    await this._printLogs();

    const error = !this._throwOnTransactionFailures
      ? undefined
      : await this._manageErrors(result.results[0].execResult);

    if (needsTimestampIncrease) {
      await this.increaseTime(new BN(1));
    }

    await this._saveBlockAsSuccessfullyRun(block, result);
    await this._saveTransactionAsSuccessfullyRun(tx, block);

    if (error !== undefined) {
      throw error;
    }

    return result;
  }

  public async mineEmptyBlock() {
    const block = await this._getNextBlockTemplate();
    const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(
      block
    );

    if (needsTimestampIncrease) {
      await this._increaseBlockTimestamp(block);
    }

    await promisify(block.genTxTrie.bind(block))();
    block.header.transactionsTrie = block.txTrie.root;

    const previousRoot = await this._stateManager.getStateRoot();

    let result: RunBlockResult;
    try {
      result = await this._vm.runBlock({
        block,
        generate: true,
        skipBlockValidation: true
      });

      if (needsTimestampIncrease) {
        await this.increaseTime(new BN(1));
      }

      await this._saveBlockAsSuccessfullyRun(block, result);

      return result;
    } catch (error) {
      // We set the state root to the previous one. This is equivalent to a
      // rollback of this block.
      await this._stateManager.setStateRoot(previousRoot);

      throw error;
    }
  }

  public async runCall(call: CallParams): Promise<Buffer> {
    const tx = await this._getFakeTransaction({
      ...call,
      nonce: await this.getAccountNonce(call.from)
    });

    const result = await this._runTxAndRevertMutations(tx, false, false);

    const error = !this._throwOnCallFailures
      ? undefined
      : await this._manageErrors(result.execResult);

    if (error !== undefined) {
      throw error;
    }

    if (
      result.execResult.exceptionError === undefined ||
      result.execResult.exceptionError.error === ERROR.REVERT
    ) {
      return result.execResult.returnValue;
    }

    // If we got here we found another kind of error and we throw anyway
    throw this._manageErrors(result.execResult)!;
  }

  public async getAccountBalance(address: Buffer): Promise<BN> {
    const account = await this._stateManager.getAccount(address);
    return new BN(account.balance);
  }

  public async getAccountNonce(address: Buffer): Promise<BN> {
    const account = await this._stateManager.getAccount(address);
    return new BN(account.nonce);
  }

  public async getLatestBlock(): Promise<Block> {
    return this._getLatestBlock();
  }

  public async getLocalAccountAddresses(): Promise<string[]> {
    return [...this._accountPrivateKeys.keys()];
  }

  public async getBlockGasLimit(): Promise<BN> {
    return this._blockGasLimit;
  }

  public async estimateGas(txParams: TransactionParams): Promise<BN> {
    const tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: await this.getBlockGasLimit()
    });

    const result = await this._runTxAndRevertMutations(tx, true, true);

    // This is only considered if the call to _runTxAndRevertMutations doesn't
    // manage errors
    if (result.execResult.exceptionError !== undefined) {
      return this.getBlockGasLimit();
    }

    const initialEstimation = result.gasUsed;

    return this._correctInitialEstimation(txParams, initialEstimation);
  }

  public async getGasPrice(): Promise<BN> {
    return new BN(BUIDLEREVM_DEFAULT_GAS_PRICE);
  }

  public async getCoinbaseAddress(): Promise<Buffer> {
    return COINBASE_ADDRESS;
  }

  public async getStorageAt(address: Buffer, slot: BN): Promise<Buffer> {
    const key = slot.toArrayLike(Buffer, "be", 32);
    const data = await this._stateManager.getContractStorage(address, key);

    // TODO: The state manager returns the data as it was saved, it doesn't
    //  pad it. Technically, the storage consists of 32-byte slots, so we should
    //  always return 32 bytes. The problem is that Ganache doesn't handle them
    //  this way. We compromise a little here to ease the migration into
    //  BuidlerEVM :(

    // const EXPECTED_DATA_SIZE = 32;
    // if (data.length < EXPECTED_DATA_SIZE) {
    //   return Buffer.concat(
    //     [Buffer.alloc(EXPECTED_DATA_SIZE - data.length, 0), data],
    //     EXPECTED_DATA_SIZE
    //   );
    // }

    return data;
  }

  public async getBlockByNumber(blockNumber: BN): Promise<Block | undefined> {
    if (blockNumber.gten(this._blockHashToTotalDifficulty.size)) {
      return undefined;
    }

    return this._getBlock(blockNumber);
  }

  public async getBlockByHash(hash: Buffer): Promise<Block | undefined> {
    if (!(await this._hasBlockWithHash(hash))) {
      return undefined;
    }

    return this._getBlock(hash);
  }

  public async getBlockByTransactionHash(
    hash: Buffer
  ): Promise<Block | undefined> {
    const blockHash = this._transactionHashToBlockHash.get(bufferToHex(hash));
    if (blockHash === undefined) {
      return undefined;
    }

    return this.getBlockByHash(toBuffer(blockHash));
  }

  public async getBlockTotalDifficulty(block: Block): Promise<BN> {
    const blockHash = bufferToHex(block.hash());
    const td = this._blockHashToTotalDifficulty.get(blockHash);

    if (td !== undefined) {
      return td;
    }

    return this._computeTotalDifficulty(block);
  }

  public async getCode(address: Buffer): Promise<Buffer> {
    return this._stateManager.getContractCode(address);
  }

  public async increaseTime(increment: BN) {
    this._blockTimeOffsetSeconds = this._blockTimeOffsetSeconds.add(increment);
  }

  public async getTimeIncrement(): Promise<BN> {
    return this._blockTimeOffsetSeconds;
  }

  public async getSuccessfulTransactionByHash(
    hash: Buffer
  ): Promise<Transaction | undefined> {
    const tx = this._transactionByHash.get(bufferToHex(hash));
    if (tx !== undefined && (await this._transactionWasSuccessful(tx))) {
      return tx;
    }

    return undefined;
  }

  public async getTxBlockResults(
    block: Block
  ): Promise<TxBlockResult[] | undefined> {
    return this._blockHashToTxBlockResults.get(bufferToHex(block.hash()));
  }

  public async getPendingTransactions(): Promise<Transaction[]> {
    return [];
  }

  public async signPersonalMessage(
    address: Buffer,
    data: Buffer
  ): Promise<ECDSASignature> {
    const messageHash = hashPersonalMessage(data);
    const privateKey = await this._getLocalAccountPrivateKey(address);

    return ecsign(messageHash, privateKey);
  }

  public async signTypedData(address: Buffer, typedData: any): Promise<string> {
    const privateKey = await this._getLocalAccountPrivateKey(address);

    return ethSigUtil.signTypedData_v4(privateKey, {
      data: typedData
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
      transactionByHash: new Map(this._transactionByHash.entries()),
      transactionHashToBlockHash: new Map(
        this._transactionHashToBlockHash.entries()
      ),
      blockHashToTxBlockResults: new Map(
        this._blockHashToTxBlockResults.entries()
      ),
      blockHashToTotalDifficulty: new Map(
        this._blockHashToTotalDifficulty.entries()
      ),
      lastFilterId: this._lastFilterId,
      blockFiltersLastBlockSent: new Map(
        this._blockFiltersLastBlockSent.entries()
      )
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
    this._blockchain.deleteAllFollowingBlocks(snapshot.latestBlock);
    await this._stateManager.setStateRoot(snapshot.stateRoot);
    this._blockTimeOffsetSeconds = newOffset;
    this._transactionByHash = snapshot.transactionByHash;
    this._transactionHashToBlockHash = snapshot.transactionHashToBlockHash;
    this._blockHashToTxBlockResults = snapshot.blockHashToTxBlockResults;
    this._blockHashToTotalDifficulty = snapshot.blockHashToTotalDifficulty;
    this._lastFilterId = snapshot.lastFilterId;
    this._blockFiltersLastBlockSent = snapshot.blockFiltersLastBlockSent;

    // We delete this and the following snapshots, as they can only be used
    // once in Ganache
    this._snapshots.splice(snapshotIndex);

    return true;
  }

  public async createBlockFilter(): Promise<number> {
    const filterId = this._lastFilterId + 1;

    const block = await this.getLatestBlock();
    const currentBlockNumber = new BN(block.header.number);

    // We always show the last block in the initial getChanges
    const lastBlockSent = currentBlockNumber.subn(1);

    this._blockFiltersLastBlockSent.set(filterId, lastBlockSent);

    this._lastFilterId += 1;

    return filterId;
  }

  public async uninstallFilter(filterId: number): Promise<boolean> {
    // This should be able to uninstall any kind of filter, not just
    // block filters

    if (this._blockFiltersLastBlockSent.has(filterId)) {
      this._blockFiltersLastBlockSent.delete(filterId);
      return true;
    }

    return false;
  }

  public async isBlockFilter(filterId: number): Promise<boolean> {
    return this._blockFiltersLastBlockSent.has(filterId);
  }

  public async getBlockFilterChanges(
    filterId: number
  ): Promise<string[] | undefined> {
    if (!this._blockFiltersLastBlockSent.has(filterId)) {
      return undefined;
    }

    const lastBlockSent = this._blockFiltersLastBlockSent.get(filterId)!;

    const latestBlock = await this.getLatestBlock();
    const currentBlockNumber = new BN(latestBlock.header.number);

    const blockHashes: string[] = [];
    let blockNumber: BN;
    for (
      blockNumber = lastBlockSent.addn(1);
      blockNumber.lte(currentBlockNumber);
      blockNumber = blockNumber.addn(1)
    ) {
      const block = await this.getBlockByNumber(blockNumber);
      blockHashes.push(bufferToHex(block.header.hash()));
    }

    this._blockFiltersLastBlockSent.set(filterId, blockNumber.subn(1));

    return blockHashes;
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

  private _initLocalAccounts(localAccounts: Buffer[]) {
    for (const pk of localAccounts) {
      this._accountPrivateKeys.set(bufferToHex(privateToAddress(pk)), pk);
    }
  }

  private async _printLogs() {
    try {
      const vmTracerError = this._vmTracer!.getLastError();
      // in case stack traces are enabled we dont want to clear last error
      if (vmTracerError !== undefined && !this._stackTracesEnabled) {
        this._vmTracer!.clearLastError();
        throw vmTracerError;
      }

      const messageTrace = this._vmTracer!.getLastTopLevelMessageTrace();
      this._consoleLogger.printLogs(messageTrace);
    } catch (error) {
      log(
        "Could not print console log. Please report this to help us improve Buidler.\n",
        error
      );
    }
  }

  private async _manageErrors(
    vmResult: ExecResult
  ): Promise<TransactionExecutionError | undefined> {
    if (vmResult.exceptionError === undefined) {
      return undefined;
    }

    let stackTrace: SolidityStackTrace | undefined;

    if (this._stackTracesEnabled) {
      try {
        const vmTracerError = this._vmTracer!.getLastError();
        if (vmTracerError !== undefined) {
          this._vmTracer!.clearLastError();
          throw vmTracerError;
        }

        const messageTrace = this._vmTracer!.getLastTopLevelMessageTrace();
        const decodedTrace = this._solidityTracer!.tryToDecodeMessageTrace(
          messageTrace
        );

        stackTrace = this._solidityTracer!.getStackTrace(decodedTrace);
      } catch (error) {
        this._failedStackTraces += 1;
        log(
          "Could not generate stack trace. Please report this to help us improve Buidler.\n",
          error
        );
      }
    }

    const error = vmResult.exceptionError;

    if (error.error === ERROR.OUT_OF_GAS) {
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

  private async _getNextBlockTemplate(): Promise<Block> {
    const block = new Block(
      {
        header: {
          gasLimit: this._blockGasLimit,
          nonce: "0x42",
          timestamp: await this._getNextBlockTimestamp()
        }
      },
      { common: this._common }
    );

    block.validate = (blockchain: any, cb: any) => cb(null);

    const latestBlock = await this.getLatestBlock();

    block.header.number = toBuffer(new BN(latestBlock.header.number).addn(1));
    block.header.parentHash = latestBlock.hash();
    block.header.difficulty = block.header.canonicalDifficulty(latestBlock);
    block.header.coinbase = await this.getCoinbaseAddress();

    return block;
  }

  private async _getNextBlockTimestamp(): Promise<BN> {
    const realTimestamp = new BN(getCurrentTimestamp());
    return realTimestamp.add(this._blockTimeOffsetSeconds);
  }

  private async _saveTransactionAsReceived(tx: Transaction) {
    this._transactionByHash.set(bufferToHex(tx.hash(true)), tx);
  }

  private async _getLocalAccountPrivateKey(sender: Buffer): Promise<Buffer> {
    const senderAddress = bufferToHex(sender);
    if (!this._accountPrivateKeys.has(senderAddress)) {
      throw new InvalidInputError(`unknown account ${senderAddress}`);
    }

    return this._accountPrivateKeys.get(senderAddress)!;
  }

  private async _addTransactionToBlock(block: Block, tx: Transaction) {
    block.transactions.push(tx);

    await promisify(block.genTxTrie.bind(block))();

    block.header.transactionsTrie = block.txTrie.root;
  }

  private async _saveBlockAsSuccessfullyRun(
    block: Block,
    runBlockResult: RunBlockResult
  ) {
    await this._putBlock(block);

    const txBlockResults: TxBlockResult[] = [];

    for (let i = 0; i < runBlockResult.results.length; i += 1) {
      const result = runBlockResult.results[i];

      txBlockResults.push({
        bloomBitvector: result.bloom.bitvector,
        createAddresses: result.createdAddress,
        receipt: runBlockResult.receipts[i]
      });
    }

    const blockHash = bufferToHex(block.hash());
    this._blockHashToTxBlockResults.set(blockHash, txBlockResults);

    const td = this._computeTotalDifficulty(block);
    this._blockHashToTotalDifficulty.set(blockHash, td);
  }

  private async _putBlock(block: Block): Promise<void> {
    return new Promise((resolve, reject) => {
      this._vm.blockchain.putBlock(block, (err?: any) => {
        if (err !== undefined && err !== null) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  private async _hasBlockWithHash(blockHash: Buffer): Promise<boolean> {
    if (this._blockHashToTotalDifficulty.has(bufferToHex(blockHash))) {
      return true;
    }

    const block = await this.getBlockByNumber(new BN(0));
    return block.hash().equals(blockHash);
  }

  private async _saveTransactionAsSuccessfullyRun(
    tx: Transaction,
    block: Block
  ) {
    this._transactionHashToBlockHash.set(
      bufferToHex(tx.hash(true)),
      bufferToHex(block.hash())
    );
  }

  private async _transactionWasSuccessful(tx: Transaction): Promise<boolean> {
    return this._transactionHashToBlockHash.has(bufferToHex(tx.hash(true)));
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
    block.header.timestamp = new BN(block.header.timestamp).addn(1);
  }

  private async _validateTransaction(tx: Transaction) {
    // Geth throws this error if a tx is sent twice
    if (await this._transactionWasSuccessful(tx)) {
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

    const expectedNonce = await this.getAccountNonce(tx.getSenderAddress());
    const actualNonce = new BN(tx.nonce);
    if (!expectedNonce.eq(actualNonce)) {
      throw new InvalidInputError(
        `Invalid nonce. Expected ${expectedNonce} but got ${actualNonce}`
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

  private _computeTotalDifficulty(block: Block): BN {
    const difficulty = new BN(block.header.difficulty);

    const parentHash = bufferToHex(block.header.parentHash);
    if (
      parentHash ===
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      return difficulty;
    }

    const parentTd = this._blockHashToTotalDifficulty.get(parentHash);

    if (parentTd === undefined) {
      throw new InternalError(`Unrecognized parent block ${parentHash}`);
    }

    return parentTd.add(difficulty);
  }

  private async _correctInitialEstimation(
    txParams: TransactionParams,
    initialEstimation: BN
  ): Promise<BN> {
    let tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: initialEstimation
    });

    if (tx.getBaseFee().gte(initialEstimation)) {
      initialEstimation = tx.getBaseFee().addn(1);

      tx = await this._getFakeTransaction({
        ...txParams,
        gasLimit: initialEstimation
      });
    }

    const result = await this._runTxAndRevertMutations(tx, false, true);

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
      // This shouldn't happen, but we don't wan't to go into an infinite loop
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
    await new Promise(resolve => setImmediate(resolve));

    const tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: newEstimation
    });

    const result = await this._runTxAndRevertMutations(tx, false, true);

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

  private async _runTxAndRevertMutations(
    tx: Transaction,
    manageErrors = true,
    estimateGas = false
  ): Promise<EVMResult> {
    const initialStateRoot = await this._stateManager.getStateRoot();

    try {
      const block = await this._getNextBlockTemplate();
      const needsTimestampIncrease = await this._timestampClashesWithPreviousBlockOne(
        block
      );

      if (needsTimestampIncrease) {
        await this._increaseBlockTimestamp(block);
      }

      await this._addTransactionToBlock(block, tx);

      const result = await this._vm.runTx({
        block,
        tx,
        skipNonce: true,
        skipBalance: true
      });

      if (!estimateGas) {
        await this._printLogs();
      }

      if (manageErrors) {
        const error = await this._manageErrors(result.execResult);

        if (error !== undefined) {
          throw error;
        }
      }

      return result;
    } finally {
      await this._stateManager.setStateRoot(initialStateRoot);
    }
  }
}
