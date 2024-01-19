import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  Transaction,
  TypedTransaction,
} from "@nomicfoundation/ethereumjs-tx";
import {
  Address,
  ECDSASignature,
  bigIntToBuffer,
  bufferToHex,
  ecsign,
  hashPersonalMessage,
  privateToAddress,
  setLengthLeft,
  toBuffer,
  bufferToBigInt,
} from "@nomicfoundation/ethereumjs-util";
import { SignTypedDataVersion, signTypedData } from "@metamask/eth-sig-util";
import chalk from "chalk";
import { randomBytes } from "crypto";
import debug from "debug";
import EventEmitter from "events";

import * as BigIntUtils from "../../util/bigint";
import { CompilerInput, CompilerOutput } from "../../../types";
import {
  HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS,
  HARDHAT_NETWORK_DEFAULT_MAX_PRIORITY_FEE_PER_GAS,
} from "../../core/config/default-config";
import { assertHardhatInvariant, HardhatError } from "../../core/errors";
import { RpcDebugTracingConfig } from "../../core/jsonrpc/types/input/debugTraceTransaction";
import {
  InternalError,
  InvalidArgumentsError,
  InvalidInputError,
  TransactionExecutionError,
} from "../../core/providers/errors";
import { HardhatMetadata } from "../../core/jsonrpc/types/output/metadata";
import { getDifferenceInSeconds } from "../../util/date";
import {
  getHardforkName,
  hardforkGte,
  HardforkName,
} from "../../util/hardforks";
import { getPackageJson } from "../../util/packageInfo";
import { createModelsAndDecodeBytecodes } from "../stack-traces/compiler-to-model";
import { ConsoleLogger } from "../stack-traces/consoleLogger";
import { ContractsIdentifier } from "../stack-traces/contracts-identifier";
import {
  isCreateTrace,
  isPrecompileTrace,
  MessageTrace,
} from "../stack-traces/message-trace";
import {
  encodeSolidityStackTrace,
  SolidityError,
} from "../stack-traces/solidity-errors";
import { SolidityStackTrace } from "../stack-traces/solidity-stack-trace";
import { SolidityTracer } from "../stack-traces/solidityTracer";
import {
  initializeVmTraceDecoder,
  VmTraceDecoder,
} from "../stack-traces/vm-trace-decoder";

import "./ethereumjs-workarounds";
import { rpcQuantityToBigInt } from "../../core/jsonrpc/types/base-types";
import { JsonRpcClient } from "../jsonrpc/client";
import { StateOverrideSet } from "../../core/jsonrpc/types/input/callRequest";
import { bloomFilter, Filter, filterLogs, LATEST_BLOCK, Type } from "./filter";
import {
  CallParams,
  EstimateGasResult,
  FeeHistory,
  FilterParams,
  GatherTracesResult,
  GenesisAccount,
  isForkedNodeConfig,
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
  getRpcReceiptOutputsFromLocalBlockExecution,
  RpcLogOutput,
  RpcReceiptOutput,
  shouldShowTransactionTypeForHardfork,
} from "./output";
import { ReturnData } from "./return-data";
import { FakeSenderAccessListEIP2930Transaction } from "./transactions/FakeSenderAccessListEIP2930Transaction";
import { FakeSenderEIP1559Transaction } from "./transactions/FakeSenderEIP1559Transaction";
import { FakeSenderTransaction } from "./transactions/FakeSenderTransaction";
import { Bloom } from "./utils/bloom";
import { getCurrentTimestamp } from "./utils/getCurrentTimestamp";
import { makeCommon } from "./utils/makeCommon";
import { PartialTrace, RunTxResult } from "./vm/vm-adapter";
import { ExitCode, Exit } from "./vm/exit";
import { createContext } from "./vm/creation";
import { PartialMineBlockResult } from "./miner";
import { EthContextAdapter } from "./context";
import { hasTransactions } from "./mem-pool";
import { makeForkClient } from "./utils/makeForkClient";
import { getMinimalEthereumJsVm, MinimalEthereumJsVm } from "./vm/proxy-vm";

const log = debug("hardhat:core:hardhat-network:node");

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class HardhatNode extends EventEmitter {
  public static async create(
    config: NodeConfig
  ): Promise<[Common, HardhatNode]> {
    const context = await createContext(config);

    const initialBlockTimeOffset = isForkedNodeConfig(config)
      ? BigInt(
          getDifferenceInSeconds(
            new Date(
              Number(
                (await context.blockchain().getLatestBlock()).header.timestamp *
                  1000n
              )
            ),
            new Date()
          )
        )
      : config.initialDate !== undefined
      ? BigInt(getDifferenceInSeconds(config.initialDate, new Date()))
      : 0n;

    let nextBlockBaseFeePerGas: bigint | undefined;
    let forkClient: JsonRpcClient | undefined;
    let forkBlockNumber: bigint | undefined;
    let forkBlockHash: string | undefined;
    let forkNetworkId: number | undefined;

    if (isForkedNodeConfig(config)) {
      // If the hardfork is London or later we need a base fee per gas for the
      // first local block. If initialBaseFeePerGas config was provided we use
      // that. Otherwise, what we do depends on the block we forked from. If
      // it's an EIP-1559 block we don't need to do anything here, as we'll
      // end up automatically computing the next base fee per gas based on it.
      if (hardforkGte(getHardforkName(config.hardfork), HardforkName.LONDON)) {
        if (config.initialBaseFeePerGas !== undefined) {
          nextBlockBaseFeePerGas = BigInt(config.initialBaseFeePerGas);
        } else {
          const latestBlock = await context.blockchain().getLatestBlock();
          if (latestBlock.header.baseFeePerGas === undefined) {
            nextBlockBaseFeePerGas = BigInt(
              HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS
            );
          }
        }
      }

      const forkData = await makeForkClient(
        {
          ...config.forkConfig,
          blockNumber: Number(
            await context.blockchain().getLatestBlockNumber()
          ),
        },
        config.forkCachePath
      );
      forkClient = forkData.forkClient;
      forkBlockNumber = forkData.forkBlockNumber;
      forkBlockHash = forkData.forkBlockHash;
      forkNetworkId = forkClient.getNetworkId();
    }

    const {
      automine,
      genesisAccounts,
      tracingConfig,
      minGasPrice,
      chainId,
      allowBlocksWithSameTimestamp,
    } = config;

    const allowUnlimitedContractSize =
      config.allowUnlimitedContractSize ?? false;

    const hardfork = getHardforkName(config.hardfork);

    const common = makeCommon(config);
    const instanceId = bufferToBigInt(randomBytes(32));

    const node = new HardhatNode(
      context,
      instanceId,
      common,
      automine,
      minGasPrice,
      initialBlockTimeOffset,
      Address.fromString(config.coinbase),
      genesisAccounts,
      chainId,
      hardfork,
      allowUnlimitedContractSize,
      allowBlocksWithSameTimestamp,
      tracingConfig,
      nextBlockBaseFeePerGas,
      forkNetworkId,
      forkBlockNumber,
      forkBlockHash,
      forkClient
    );

    return [common, node];
  }

  private readonly _localAccounts: Map<string, Buffer> = new Map(); // address => private key
  private readonly _impersonatedAccounts: Set<string> = new Set(); // address

  private _nextBlockTimestamp: bigint = 0n;
  private _userProvidedNextBlockBaseFeePerGas?: bigint;

  private _lastFilterId: bigint = 0n;
  private _filters: Map<string, Filter> = new Map();

  private _nextSnapshotId = 1; // We start in 1 to mimic Ganache
  private readonly _snapshots: Snapshot[] = [];

  private readonly _vmTraceDecoder: VmTraceDecoder;
  private readonly _solidityTracer: SolidityTracer;
  private readonly _consoleLogger: ConsoleLogger = new ConsoleLogger();
  private _failedStackTraces = 0;

  // temporarily added for backwards compatibility
  private _vm: MinimalEthereumJsVm;

  private constructor(
    private readonly _context: EthContextAdapter,
    private readonly _instanceId: bigint,
    private readonly _common: Common,
    private _automine: boolean,
    private _minGasPrice: bigint,
    private _blockTimeOffsetSeconds: bigint = 0n,
    private _coinbase: Address,
    genesisAccounts: GenesisAccount[],
    private readonly _configChainId: number,
    public readonly hardfork: HardforkName,
    public readonly allowUnlimitedContractSize: boolean,
    private _allowBlocksWithSameTimestamp: boolean,
    tracingConfig: TracingConfig | undefined,
    nextBlockBaseFee: bigint | undefined,
    private _forkNetworkId: number | undefined,
    private _forkBlockNumber: bigint | undefined,
    private _forkBlockHash: string | undefined,
    private _forkClient: JsonRpcClient | undefined
  ) {
    super();

    this._initLocalAccounts(genesisAccounts);

    if (nextBlockBaseFee !== undefined) {
      this.setUserProvidedNextBlockBaseFeePerGas(nextBlockBaseFee);
    }

    const contractsIdentifier = new ContractsIdentifier();
    this._vmTraceDecoder = new VmTraceDecoder(contractsIdentifier);
    this._solidityTracer = new SolidityTracer();

    this._vm = getMinimalEthereumJsVm(this._context);

    if (tracingConfig !== undefined) {
      initializeVmTraceDecoder(this._vmTraceDecoder, tracingConfig);
    }
  }

  public async getSignedTransaction(
    txParams: TransactionParams
  ): Promise<TypedTransaction> {
    const senderAddress = bufferToHex(txParams.from);

    const pk = this._localAccounts.get(senderAddress);
    if (pk !== undefined) {
      let tx: TypedTransaction;

      if ("maxFeePerGas" in txParams) {
        tx = FeeMarketEIP1559Transaction.fromTxData(txParams, {
          common: this._common,
          disableMaxInitCodeSizeCheck: true,
        });
      } else if ("accessList" in txParams) {
        tx = AccessListEIP2930Transaction.fromTxData(txParams, {
          common: this._common,
          disableMaxInitCodeSizeCheck: true,
        });
      } else {
        tx = Transaction.fromTxData(txParams, {
          common: this._common,
          disableMaxInitCodeSizeCheck: true,
        });
      }

      return tx.sign(pk);
    }

    if (this._impersonatedAccounts.has(senderAddress)) {
      return this._getFakeTransaction(txParams);
    }

    throw new InvalidInputError(`unknown account ${senderAddress}`);
  }

  public async sendTransaction(
    tx: TypedTransaction
  ): Promise<SendTransactionResult> {
    if (!this._automine) {
      return this._addPendingTransaction(tx);
    }

    await this._validateAutominedTx(tx);

    if (await hasTransactions(this._context.memPool())) {
      return this._mineTransactionAndPending(tx);
    }

    return this._mineTransaction(tx);
  }

  public async mineBlock(timestamp?: bigint): Promise<MineBlockResult> {
    const timestampAndOffset = this._calculateTimestampAndOffset(timestamp);
    let [blockTimestamp] = timestampAndOffset;
    const [, offsetShouldChange, newOffset] = timestampAndOffset;

    const needsTimestampIncrease =
      !this._allowBlocksWithSameTimestamp &&
      (await this._timestampClashesWithPreviousBlockOne(blockTimestamp));
    if (needsTimestampIncrease) {
      blockTimestamp += 1n;
    }

    let partialResult: PartialMineBlockResult;
    try {
      partialResult = await this._context
        .blockMiner()
        .mineBlock(
          blockTimestamp,
          this._coinbase,
          this._minGasPrice,
          this._common.param("pow", "minerReward"),
          this.getUserProvidedNextBlockBaseFeePerGas()
        );
    } catch (err) {
      if (err instanceof Error) {
        if (
          err?.message
            .toLocaleLowerCase()
            .includes("sender doesn't have enough funds")
        ) {
          throw new InvalidInputError(err.message, err);
        }

        // Some network errors are HardhatErrors, and can end up here when forking
        if (HardhatError.isHardhatError(err)) {
          throw err;
        }

        throw new TransactionExecutionError(err);
      }

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw err;
    }

    const result = await this._finalizeBlockResult(partialResult);
    await this._saveBlockAsSuccessfullyRun(
      result.block,
      result.blockResult.results,
      partialResult.totalDifficultyAfterBlock
    );

    if (needsTimestampIncrease) {
      this.increaseTime(1n);
    }

    if (offsetShouldChange) {
      this.setTimeIncrement(newOffset);
    }

    this._resetNextBlockTimestamp();
    this._resetUserProvidedNextBlockBaseFeePerGas();

    return result;
  }

  /**
   * Mines `count` blocks with a difference of `interval` seconds between their
   * timestamps.
   *
   * Returns an array with the results of the blocks that were really mined (the
   * ones that were reserved are not included).
   */
  public async mineBlocks(
    count: bigint = 1n,
    interval: bigint = 1n
  ): Promise<MineBlockResult[]> {
    if (count === 0n) {
      // nothing to do
      return [];
    }

    const mineBlockResults: MineBlockResult[] = [];

    // we always mine the first block, and we don't apply the interval for it
    mineBlockResults.push(await this.mineBlock());

    // helper function to mine a block with a timstamp that respects the
    // interval
    const mineBlock = async () => {
      const nextTimestamp =
        (await this.getLatestBlock()).header.timestamp + interval;
      const block = await this.mineBlock(nextTimestamp);
      mineBlockResults.push(block);
    };

    // then we mine any pending transactions
    while (
      count > mineBlockResults.length &&
      (await this._context.memPool().hasPendingTransactions())
    ) {
      await mineBlock();
    }

    // If there is at least one remaining block, we mine one. This way, we
    // guarantee that there's an empty block immediately before and after the
    // reservation. This makes the logging easier to get right.
    if (count > mineBlockResults.length) {
      await mineBlock();
    }

    const remainingBlockCount = count - BigInt(mineBlockResults.length);

    // There should be at least 2 blocks left for the reservation to work,
    // because we always mine a block after it. But here we use a bigger
    // number to err on the safer side.
    if (remainingBlockCount <= 5) {
      // if there are few blocks left to mine, we just mine them
      while (count > mineBlockResults.length) {
        await mineBlock();
      }

      return mineBlockResults;
    }

    // otherwise, we reserve a range and mine the last one
    await this._context
      .blockchain()
      .reserveBlocks(remainingBlockCount - 1n, interval);

    await mineBlock();

    return mineBlockResults;
  }

  public async runCall(
    call: CallParams,
    blockNumberOrPending: bigint | "pending",
    stateOverrideSet: StateOverrideSet = {}
  ): Promise<RunCallResult> {
    const tx = await this._getTransactionForCall(
      call,
      blockNumberOrPending,
      stateOverrideSet
    );

    const result = await this._runInBlockContext(
      blockNumberOrPending,
      async () =>
        this._runTxAndRevertMutations(
          tx,
          blockNumberOrPending,
          true,
          stateOverrideSet
        )
    );

    const trace = await this._finalizeTrace(
      result,
      this._context.vm().getLastTraceAndClear()
    );

    return {
      ...trace,
      result: new ReturnData(result.returnValue),
    };
  }

  public async getAccountBalance(
    address: Address,
    blockNumberOrPending?: bigint | "pending"
  ): Promise<bigint> {
    if (blockNumberOrPending === undefined) {
      blockNumberOrPending = await this.getLatestBlockNumber();
    }

    const account = await this._runInBlockContext(blockNumberOrPending, () =>
      this._context.vm().getAccount(address)
    );

    return account.balance;
  }

  public async getNextConfirmedNonce(
    address: Address,
    blockNumberOrPending: bigint | "pending"
  ): Promise<bigint> {
    const account = await this._runInBlockContext(blockNumberOrPending, () =>
      this._context.vm().getAccount(address)
    );

    return account.nonce;
  }

  public async getAccountNextPendingNonce(address: Address): Promise<bigint> {
    return this._context.memPool().getNextPendingNonce(address);
  }

  public async getCodeFromTrace(
    trace: MessageTrace | undefined,
    blockNumberOrPending: bigint | "pending"
  ): Promise<Buffer> {
    if (
      trace === undefined ||
      isPrecompileTrace(trace) ||
      isCreateTrace(trace)
    ) {
      return Buffer.from("");
    }

    return this.getCode(new Address(trace.address), blockNumberOrPending);
  }

  public async getLatestBlock(): Promise<Block> {
    return this._context.blockchain().getLatestBlock();
  }

  public async getLatestBlockNumber(): Promise<bigint> {
    return this._context.blockchain().getLatestBlockNumber();
  }

  public async getPendingBlockAndTotalDifficulty(): Promise<[Block, bigint]> {
    return this._runInPendingBlockContext(async () => {
      const block = await this._context.blockchain().getLatestBlock();
      const totalDifficulty = await this._context
        .blockchain()
        .getTotalDifficultyByHash(block.hash());

      return [block, totalDifficulty!];
    });
  }

  public async getLocalAccountAddresses(): Promise<string[]> {
    return [...this._localAccounts.keys()];
  }

  public async getBlockGasLimit(): Promise<bigint> {
    return this._context.memPool().getBlockGasLimit();
  }

  public async estimateGas(
    callParams: CallParams,
    blockNumberOrPending: bigint | "pending"
  ): Promise<EstimateGasResult> {
    // We get the CallParams and transform it into a TransactionParams to be
    // able to run it.
    const nonce = await this._getNonce(
      new Address(callParams.from),
      blockNumberOrPending
    );

    // TODO: This is more complex in Geth, we should make sure we aren't missing
    //  anything here.

    const feePriceFields = await this._getEstimateGasFeePriceFields(
      callParams,
      blockNumberOrPending
    );

    let txParams: TransactionParams;

    if ("gasPrice" in feePriceFields) {
      if (callParams.accessList === undefined) {
        // Legacy tx
        txParams = {
          ...callParams,
          nonce,
          gasPrice: feePriceFields.gasPrice,
        };
      } else {
        // Access list tx
        txParams = {
          ...callParams,
          nonce,
          gasPrice: feePriceFields.gasPrice,
          accessList: callParams.accessList ?? [],
        };
      }
    } else {
      // EIP-1559 tx
      txParams = {
        ...callParams,
        nonce,
        maxFeePerGas: feePriceFields.maxFeePerGas,
        maxPriorityFeePerGas: feePriceFields.maxPriorityFeePerGas,
        accessList: callParams.accessList ?? [],
      };
    }

    const tx = await this._getFakeTransaction(txParams);

    // TODO: This may not work if there are multiple txs in the mempool and
    //  the one being estimated won't fit in the first block, or maybe even
    //  if the state accessed by the tx changes after it is executed within
    //  the first block.
    const result = await this._runInBlockContext(blockNumberOrPending, () =>
      this._runTxAndRevertMutations(tx, blockNumberOrPending)
    );

    const trace = await this._finalizeTrace(
      result,
      this._context.vm().getLastTraceAndClear()
    );

    // This is only considered if the call to _runTxAndRevertMutations doesn't
    // manage errors
    if (trace.error !== undefined) {
      return {
        ...trace,
        estimation: await this.getBlockGasLimit(),
      };
    }

    const initialEstimation = result.gasUsed;

    return {
      ...trace,
      estimation: await this._correctInitialEstimation(
        blockNumberOrPending,
        txParams,
        initialEstimation
      ),
    };
  }

  public async getGasPrice(): Promise<bigint> {
    const nextBlockBaseFeePerGas = await this.getNextBlockBaseFeePerGas();

    if (nextBlockBaseFeePerGas === undefined) {
      // We return a hardcoded value for networks without EIP-1559
      return 8n * 10n ** 9n;
    }

    const suggestedPriorityFeePerGas = 10n ** 9n;
    return nextBlockBaseFeePerGas + suggestedPriorityFeePerGas;
  }

  public async getMaxPriorityFeePerGas(): Promise<bigint> {
    return BigInt(HARDHAT_NETWORK_DEFAULT_MAX_PRIORITY_FEE_PER_GAS);
  }

  public getCoinbaseAddress(): Address {
    return this._coinbase;
  }

  public async getStorageAt(
    address: Address,
    positionIndex: bigint,
    blockNumberOrPending: bigint | "pending"
  ): Promise<Buffer> {
    const key = setLengthLeft(bigIntToBuffer(positionIndex), 32);

    const data = await this._runInBlockContext(blockNumberOrPending, () =>
      this._context.vm().getContractStorage(address, key)
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
    blockNumberOrPending: bigint | "pending"
  ): Promise<Block | undefined>;

  public async getBlockByNumber(
    blockNumberOrPending: bigint | "pending"
  ): Promise<Block | undefined> {
    if (blockNumberOrPending === "pending") {
      return this._runInPendingBlockContext(() =>
        this._context.blockchain().getLatestBlock()
      );
    }

    try {
      const block = await this._context
        .blockchain()
        .getBlockByNumber(blockNumberOrPending);
      return block;
    } catch {
      return undefined;
    }
  }

  public async getBlockByHash(blockHash: Buffer): Promise<Block | undefined> {
    try {
      const block = await this._context.blockchain().getBlockByHash(blockHash);
      return block;
    } catch {
      return undefined;
    }
  }

  public async getBlockByTransactionHash(
    hash: Buffer
  ): Promise<Block | undefined> {
    const block = await this._context
      .blockchain()
      .getBlockByTransactionHash(hash);
    return block ?? undefined;
  }

  public async getBlockTotalDifficulty(
    block: Block
  ): Promise<bigint | undefined> {
    return this._context.blockchain().getTotalDifficultyByHash(block.hash());
  }

  public async getCode(
    address: Address,
    blockNumberOrPending: bigint | "pending"
  ): Promise<Buffer> {
    return this._runInBlockContext(blockNumberOrPending, () =>
      this._context.vm().getContractCode(address)
    );
  }

  public getNextBlockTimestamp(): bigint {
    return this._nextBlockTimestamp;
  }

  public setNextBlockTimestamp(timestamp: bigint) {
    this._nextBlockTimestamp = timestamp;
  }

  public getTimeIncrement(): bigint {
    return this._blockTimeOffsetSeconds;
  }

  public setTimeIncrement(timeIncrement: bigint) {
    this._blockTimeOffsetSeconds = timeIncrement;
  }

  public increaseTime(increment: bigint) {
    this._blockTimeOffsetSeconds += increment;
  }

  public setUserProvidedNextBlockBaseFeePerGas(baseFeePerGas: bigint) {
    this._userProvidedNextBlockBaseFeePerGas = baseFeePerGas;
  }

  public getUserProvidedNextBlockBaseFeePerGas(): bigint | undefined {
    return this._userProvidedNextBlockBaseFeePerGas;
  }

  private _resetUserProvidedNextBlockBaseFeePerGas() {
    this._userProvidedNextBlockBaseFeePerGas = undefined;
  }

  public async getNextBlockBaseFeePerGas(): Promise<bigint | undefined> {
    if (!(await this.isEip1559Active())) {
      return undefined;
    }

    const userDefined = this.getUserProvidedNextBlockBaseFeePerGas();
    if (userDefined !== undefined) {
      return userDefined;
    }

    const latestBlock = await this.getLatestBlock();
    return latestBlock.header.calcNextBaseFee();
  }

  public async getPendingTransaction(
    hash: Buffer
  ): Promise<TypedTransaction | undefined> {
    return this._context.memPool().getTransactionByHash(hash);
  }

  public async getTransactionReceipt(
    hash: Buffer | string
  ): Promise<RpcReceiptOutput | undefined> {
    const hashBuffer = hash instanceof Buffer ? hash : toBuffer(hash);
    const receipt = await this._context
      .blockchain()
      .getReceiptByTransactionHash(hashBuffer);
    return receipt ?? undefined;
  }

  public async getPendingTransactions(): Promise<TypedTransaction[]> {
    return this._context.memPool().getTransactions();
  }

  public async signPersonalMessage(
    address: Address,
    data: Buffer
  ): Promise<ECDSASignature> {
    const messageHash = hashPersonalMessage(data);
    const privateKey = this._getLocalAccountPrivateKey(address);

    return ecsign(messageHash, privateKey);
  }

  public async signTypedDataV4(
    address: Address,
    typedData: any
  ): Promise<string> {
    const privateKey = this._getLocalAccountPrivateKey(address);

    return signTypedData({
      privateKey,
      version: SignTypedDataVersion.V4,
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
      stateSnapshotId: await this._context.vm().makeSnapshot(),
      txPoolSnapshotId: await this._context.memPool().makeSnapshot(),
      blockTimeOffsetSeconds: this.getTimeIncrement(),
      nextBlockTimestamp: this.getNextBlockTimestamp(),
      userProvidedNextBlockBaseFeePerGas:
        this.getUserProvidedNextBlockBaseFeePerGas(),
      coinbase: this.getCoinbaseAddress(),
      nextPrevRandao: this._context.blockMiner().prevRandaoGeneratorSeed(),
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
    const newOffset =
      snapshot.blockTimeOffsetSeconds + BigInt(offsetToSnapshotInSecs);

    // We delete all following blocks, changes the state root, and all the
    // relevant Node fields.
    //
    // Note: There's no need to copy the maps here, as snapshots can only be
    // used once
    await this._context
      .blockchain()
      .revertToBlock(snapshot.latestBlock.header.number);

    await this._context.vm().restoreSnapshot(snapshot.stateSnapshotId);
    this.setTimeIncrement(newOffset);
    this.setNextBlockTimestamp(snapshot.nextBlockTimestamp);
    await this._context.memPool().revertToSnapshot(snapshot.txPoolSnapshotId);

    if (snapshot.userProvidedNextBlockBaseFeePerGas !== undefined) {
      this.setUserProvidedNextBlockBaseFeePerGas(
        snapshot.userProvidedNextBlockBaseFeePerGas
      );
    } else {
      this._resetUserProvidedNextBlockBaseFeePerGas();
    }

    this._coinbase = snapshot.coinbase;

    this._context
      .blockMiner()
      .setPrevRandaoGeneratorNextValue(snapshot.nextPrevRandao);

    // We delete this and the following snapshots, as they can only be used
    // once in Ganache
    await this._removeSnapshot(snapshotIndex);

    return true;
  }

  public async newFilter(
    filterParams: FilterParams,
    isSubscription: boolean
  ): Promise<bigint> {
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

  public async newBlockFilter(isSubscription: boolean): Promise<bigint> {
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
  ): Promise<bigint> {
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
    filterId: bigint,
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
    filterId: bigint
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
    filterId: bigint
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
    return this._context.blockchain().getLogs(filterParams);
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

  public setAutomine(automine: boolean) {
    this._automine = automine;
  }

  public getAutomine() {
    return this._automine;
  }

  public async setBlockGasLimit(gasLimit: bigint | number) {
    if (typeof gasLimit === "number") {
      gasLimit = BigInt(gasLimit);
    }

    await this._context.memPool().setBlockGasLimit(gasLimit);
  }

  public async setMinGasPrice(minGasPrice: bigint) {
    this._minGasPrice = minGasPrice;
  }

  public async dropTransaction(hash: Buffer): Promise<boolean> {
    const removed = await this._context.memPool().removeTransaction(hash);

    if (removed) {
      return true;
    }

    const isTransactionMined = await this._isTransactionMined(hash);
    if (isTransactionMined) {
      throw new InvalidArgumentsError(
        `Transaction ${bufferToHex(
          hash
        )} cannot be dropped because it's already mined`
      );
    }

    return false;
  }

  public async setAccountBalance(
    address: Address,
    newBalance: bigint
  ): Promise<void> {
    const account = await this._context.vm().getAccount(address);
    account.balance = newBalance;
    await this._context.vm().putAccount(address, account, true);
  }

  public async setAccountCode(
    address: Address,
    newCode: Buffer
  ): Promise<void> {
    await this._context.vm().putContractCode(address, newCode, true);
  }

  public async setNextConfirmedNonce(
    address: Address,
    newNonce: bigint
  ): Promise<void> {
    if (await hasTransactions(this._context.memPool())) {
      throw new InternalError(
        "Cannot set account nonce when the transaction pool is not empty"
      );
    }
    const account = await this._context.vm().getAccount(address);
    if (newNonce < account.nonce) {
      throw new InvalidInputError(
        `New nonce (${newNonce.toString()}) must not be smaller than the existing nonce (${account.nonce.toString()})`
      );
    }
    account.nonce = newNonce;
    await this._context.vm().putAccount(address, account, true);
  }

  public async setStorageAt(
    address: Address,
    positionIndex: bigint,
    value: Buffer
  ) {
    await this._context
      .vm()
      .putContractStorage(
        address,
        setLengthLeft(bigIntToBuffer(positionIndex), 32),
        value,
        true
      );
  }

  public async traceTransaction(hash: Buffer, config: RpcDebugTracingConfig) {
    const block = await this.getBlockByTransactionHash(hash);
    if (block === undefined) {
      throw new InvalidInputError(
        `Unable to find a block containing transaction ${bufferToHex(hash)}`
      );
    }

    return this._runInBlockContext(block.header.number - 1n, async () => {
      return this._context.vm().traceTransaction(hash, block, config);
    });
  }

  public async traceCall(
    call: CallParams,
    blockNumberOrPending: bigint | "pending",
    traceConfig: RpcDebugTracingConfig
  ) {
    const tx = await this._getTransactionForCall(call, blockNumberOrPending);

    const blockNumber = await this._getBlockNumberForCall(blockNumberOrPending);

    return this._context.vm().traceCall(tx, blockNumber, traceConfig);
  }

  public async getFeeHistory(
    blockCount: bigint,
    newestBlock: bigint | "pending",
    rewardPercentiles: number[]
  ): Promise<FeeHistory> {
    const latestBlock = await this.getLatestBlockNumber();
    const pendingBlockNumber = latestBlock + 1n;

    const resolvedNewestBlock =
      newestBlock === "pending" ? pendingBlockNumber : newestBlock;

    const oldestBlock = BigIntUtils.max(
      resolvedNewestBlock - blockCount + 1n,
      0n
    );

    // This is part of a temporary fix to https://github.com/NomicFoundation/hardhat/issues/2380
    const rangeIncludesRemoteBlocks =
      this._forkBlockNumber !== undefined &&
      oldestBlock <= this._forkBlockNumber;

    const baseFeePerGas: bigint[] = [];
    const gasUsedRatio: number[] = [];
    const reward: bigint[][] = [];

    const lastBlock = resolvedNewestBlock + 1n;

    // This is part of a temporary fix to https://github.com/NomicFoundation/hardhat/issues/2380
    if (rangeIncludesRemoteBlocks) {
      try {
        const lastRemoteBlock = BigIntUtils.min(
          BigInt(this._forkBlockNumber!),
          lastBlock
        );

        const remoteBlockCount = lastRemoteBlock - oldestBlock + 1n;

        const remoteValues = await this._forkClient!.getFeeHistory(
          remoteBlockCount,
          lastRemoteBlock,
          rewardPercentiles
        );

        baseFeePerGas.push(...remoteValues.baseFeePerGas);
        gasUsedRatio.push(...remoteValues.gasUsedRatio);
        if (remoteValues.reward !== undefined) {
          reward.push(...remoteValues.reward);
        }
      } catch (e) {
        // TODO: we can return less blocks here still be compliant with the spec
        throw new InternalError(
          "Remote node did not answer to eth_feeHistory correctly",
          e instanceof Error ? e : undefined
        );
      }
    }

    // We get the pending block here, and only if necessary, as it's something
    // costly to do.
    let pendingBlock: Block | undefined;
    if (lastBlock >= pendingBlockNumber) {
      pendingBlock = await this.getBlockByNumber("pending");
    }

    // This is part of a temporary fix to https://github.com/NomicFoundation/hardhat/issues/2380
    const firstLocalBlock = !rangeIncludesRemoteBlocks
      ? oldestBlock
      : BigIntUtils.min(BigInt(this._forkBlockNumber!), lastBlock) + 1n;

    for (
      let blockNumber = firstLocalBlock; // This is part of a temporary fix to https://github.com/NomicFoundation/hardhat/issues/2380
      blockNumber <= lastBlock;
      blockNumber++
    ) {
      if (blockNumber < pendingBlockNumber) {
        // We know the block exists
        const block = (await this.getBlockByNumber(blockNumber))!;
        baseFeePerGas.push(block.header.baseFeePerGas ?? 0n);

        if (blockNumber < lastBlock) {
          gasUsedRatio.push(this._getGasUsedRatio(block));

          if (rewardPercentiles.length > 0) {
            reward.push(await this._getRewards(block, rewardPercentiles));
          }
        }
      } else if (blockNumber === pendingBlockNumber) {
        // This can only be run with EIP-1559, so this exists
        baseFeePerGas.push((await this.getNextBlockBaseFeePerGas())!);

        if (blockNumber < lastBlock) {
          gasUsedRatio.push(this._getGasUsedRatio(pendingBlock!));

          if (rewardPercentiles.length > 0) {
            // We don't compute this for the pending block, as there's no
            // effective miner fee yet.
            reward.push(rewardPercentiles.map((_) => 0n));
          }
        }
      } else if (blockNumber === pendingBlockNumber + 1n) {
        baseFeePerGas.push(pendingBlock!.header.calcNextBaseFee());
      } else {
        assertHardhatInvariant(false, "This should never happen");
      }
    }

    return {
      oldestBlock,
      baseFeePerGas,
      gasUsedRatio,
      reward: rewardPercentiles.length > 0 ? reward : undefined,
    };
  }

  public setCoinbase(coinbase: Address) {
    this._coinbase = coinbase;
  }

  private _getGasUsedRatio(block: Block): number {
    const FLOATS_PRECISION = 100_000;

    return (
      Number(
        (block.header.gasUsed * BigInt(FLOATS_PRECISION)) /
          block.header.gasLimit
      ) / FLOATS_PRECISION
    );
  }

  private async _getRewards(
    block: Block,
    rewardPercentiles: number[]
  ): Promise<bigint[]> {
    const FLOATS_PRECISION = 100_000;

    if (block.transactions.length === 0) {
      return rewardPercentiles.map((_) => 0n);
    }

    const receipts = await Promise.all(
      block.transactions
        .map((tx) => tx.hash())
        .map((hash) => this.getTransactionReceipt(hash))
    );

    const effectiveGasRewardAndGas = receipts
      .map((r, i) => {
        const tx = block.transactions[i];
        const baseFeePerGas = block.header.baseFeePerGas ?? 0n;

        // reward = min(maxPriorityFeePerGas, maxFeePerGas - baseFeePerGas)
        let effectiveGasReward: bigint;
        if ("maxPriorityFeePerGas" in tx) {
          effectiveGasReward = tx.maxFeePerGas - baseFeePerGas;
          if (tx.maxPriorityFeePerGas < effectiveGasReward) {
            effectiveGasReward = tx.maxPriorityFeePerGas;
          }
        } else {
          effectiveGasReward = tx.gasPrice - baseFeePerGas;
        }

        return {
          effectiveGasReward,
          gasUsed: rpcQuantityToBigInt(r?.gasUsed!),
        };
      })
      .sort((a, b) =>
        BigIntUtils.cmp(a.effectiveGasReward, b.effectiveGasReward)
      );

    return rewardPercentiles.map((p) => {
      let gasUsed = 0n;
      const targetGas =
        (block.header.gasLimit * BigInt(Math.ceil(p * FLOATS_PRECISION))) /
        BigInt(100 * FLOATS_PRECISION);

      for (const values of effectiveGasRewardAndGas) {
        gasUsed += values.gasUsed;

        if (targetGas <= gasUsed) {
          return values.effectiveGasReward;
        }
      }

      return effectiveGasRewardAndGas[effectiveGasRewardAndGas.length - 1]
        .effectiveGasReward;
    });
  }

  private async _addPendingTransaction(tx: TypedTransaction): Promise<string> {
    await this._context.memPool().addTransaction(tx);
    await this._notifyPendingTransaction(tx);
    return bufferToHex(tx.hash());
  }

  private async _mineTransaction(
    tx: TypedTransaction
  ): Promise<MineBlockResult> {
    await this._addPendingTransaction(tx);
    return this.mineBlock();
  }

  private async _mineTransactionAndPending(
    tx: TypedTransaction
  ): Promise<MineBlockResult[]> {
    const id = await this.takeSnapshot();

    let result;
    try {
      const txHash = await this._addPendingTransaction(tx);
      result = await this._mineBlocksUntilTransactionIsIncluded(txHash);
    } catch (err) {
      await this.revertToSnapshot(id);
      throw err;
    }

    const snapshotIndex = this._getSnapshotIndex(id);
    if (snapshotIndex !== undefined) {
      await this._removeSnapshot(id);
    }

    return result;
  }

  private async _mineBlocksUntilTransactionIsIncluded(
    txHash: string
  ): Promise<MineBlockResult[]> {
    const results = [];
    let txReceipt;
    do {
      if (!(await this._context.memPool().hasPendingTransactions())) {
        throw new TransactionExecutionError(
          "Failed to mine transaction for unknown reason, this should never happen"
        );
      }
      results.push(await this.mineBlock());
      txReceipt = await this.getTransactionReceipt(txHash);
    } while (txReceipt === undefined);

    while (await this._context.memPool().hasPendingTransactions()) {
      results.push(await this.mineBlock());
    }

    return results;
  }

  private async _finalizeBlockResult(
    result: PartialMineBlockResult
  ): Promise<MineBlockResult> {
    const numberOfResults = result.blockResult.results.length;
    const numberOfTraces = result.traces.length;
    if (numberOfResults !== numberOfTraces) {
      throw new Error(
        `The number of transaction results '${numberOfResults} should equal the number of traces '${numberOfTraces}'`
      );
    }

    const traces: GatherTracesResult[] = [];

    for (let idx = 0; idx < numberOfResults; ++idx) {
      const txResult = result.blockResult.results[idx];
      const trace = result.traces[idx];

      traces.push(await this._finalizeTrace(txResult, trace));
    }

    return {
      block: result.block,
      blockResult: result.blockResult,
      traces,
    };
  }

  private async _finalizeTrace(
    txResult: RunTxResult,
    traceResult: PartialTrace
  ): Promise<GatherTracesResult> {
    let vmTrace = traceResult.trace;
    const vmTracerError = traceResult.error;

    if (vmTrace !== undefined) {
      vmTrace = this._vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
    }

    const consoleLogMessages = await this._getConsoleLogMessages(
      vmTrace,
      vmTracerError
    );

    const error = await this._manageErrors(txResult, vmTrace, vmTracerError);

    return {
      trace: vmTrace,
      consoleLogMessages,
      error,
    };
  }

  private async _validateAutominedTx(tx: TypedTransaction) {
    let sender: Address;
    try {
      sender = tx.getSenderAddress(); // verifies signature as a side effect
    } catch (e) {
      if (e instanceof Error) {
        throw new InvalidInputError(e.message);
      }

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw e;
    }

    // validate nonce
    const nextPendingNonce = await this.getAccountNextPendingNonce(sender);
    const txNonce = tx.nonce;

    const expectedNonceMsg = `Expected nonce to be ${nextPendingNonce.toString()} but got ${txNonce.toString()}.`;
    if (txNonce > nextPendingNonce) {
      throw new InvalidInputError(
        `Nonce too high. ${expectedNonceMsg} Note that transactions can't be queued when automining.`
      );
    }
    if (txNonce < nextPendingNonce) {
      throw new InvalidInputError(`Nonce too low. ${expectedNonceMsg}`);
    }

    // validate gas price
    const txPriorityFee =
      "gasPrice" in tx ? tx.gasPrice : tx.maxPriorityFeePerGas;
    if (txPriorityFee < this._minGasPrice) {
      throw new InvalidInputError(
        `Transaction gas price is ${txPriorityFee.toString()}, which is below the minimum of ${this._minGasPrice.toString()}`
      );
    }

    // Validate that maxFeePerGas >= next block's baseFee
    const nextBlockGasFee = await this.getNextBlockBaseFeePerGas();
    if (nextBlockGasFee !== undefined) {
      if ("maxFeePerGas" in tx) {
        if (nextBlockGasFee > tx.maxFeePerGas) {
          throw new InvalidInputError(
            `Transaction maxFeePerGas (${tx.maxFeePerGas.toString()}) is too low for the next block, which has a baseFeePerGas of ${nextBlockGasFee.toString()}`
          );
        }
      } else {
        if (nextBlockGasFee > tx.gasPrice) {
          throw new InvalidInputError(
            `Transaction gasPrice (${tx.gasPrice.toString()}) is too low for the next block, which has a baseFeePerGas of ${nextBlockGasFee.toString()}`
          );
        }
      }
    }
  }

  private async _getFakeTransaction(
    txParams: TransactionParams
  ): Promise<
    | FakeSenderTransaction
    | FakeSenderAccessListEIP2930Transaction
    | FakeSenderEIP1559Transaction
  > {
    const sender = new Address(txParams.from);

    if ("maxFeePerGas" in txParams && txParams.maxFeePerGas !== undefined) {
      return new FakeSenderEIP1559Transaction(sender, txParams, {
        common: this._common,
      });
    }

    if ("accessList" in txParams && txParams.accessList !== undefined) {
      return new FakeSenderAccessListEIP2930Transaction(sender, txParams, {
        common: this._common,
      });
    }

    return new FakeSenderTransaction(sender, txParams, {
      common: this._common,
    });
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

  private async _removeSnapshot(snapshotIndex: number) {
    const deletedSnapshots = this._snapshots.splice(snapshotIndex);

    for (const deletedSnapshot of deletedSnapshots) {
      await this._context.vm().removeSnapshot(deletedSnapshot.stateSnapshotId);
    }
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
    vmResult: RunTxResult,
    vmTrace: MessageTrace | undefined,
    vmTracerError: Error | undefined
  ): Promise<SolidityError | TransactionExecutionError | undefined> {
    if (!vmResult.exit.isError()) {
      return undefined;
    }

    let stackTrace: SolidityStackTrace | undefined;

    try {
      if (vmTrace === undefined || vmTracerError !== undefined) {
        throw vmTracerError;
      }

      stackTrace = this._solidityTracer.getStackTrace(vmTrace);
    } catch (err) {
      this._failedStackTraces += 1;
      log(
        "Could not generate stack trace. Please report this to help us improve Hardhat.\n",
        err
      );
    }

    const exitCode = vmResult.exit;

    const isExitCode = exitCode instanceof Exit;

    // If this is not a VM error, or if it's an internal VM error, we just
    // rethrow. An example of a non-VmError being thrown here is an HTTP error
    // coming from the ForkedStateManager.
    if (!isExitCode || exitCode.kind === ExitCode.INTERNAL_ERROR) {
      throw exitCode;
    }

    if (exitCode.kind !== vmTrace?.exit.kind) {
      console.trace("execution:", exitCode);
      console.log("trace:", vmTrace?.exit);
      throw Error("Execution error does not match trace error");
    }

    if (exitCode.kind === ExitCode.CODESIZE_EXCEEDS_MAXIMUM) {
      if (stackTrace !== undefined) {
        return encodeSolidityStackTrace(
          "Transaction ran out of gas",
          stackTrace
        );
      }

      return new TransactionExecutionError("Transaction ran out of gas");
    }

    if (exitCode.kind === ExitCode.OUT_OF_GAS) {
      // if the error is an out of gas, we ignore the inferred error in the
      // trace
      return new TransactionExecutionError("Transaction ran out of gas");
    }

    const returnData = new ReturnData(vmResult.returnValue);

    let returnDataExplanation;
    if (returnData.isEmpty()) {
      returnDataExplanation = "without reason string";
    } else if (returnData.isErrorReturnData()) {
      returnDataExplanation = `with reason "${returnData.decodeError()}"`;
    } else if (returnData.isPanicReturnData()) {
      const panicCode = returnData.decodePanic().toString(16);
      returnDataExplanation = `with panic code "0x${panicCode}"`;
    } else {
      returnDataExplanation = "with unrecognized return data or custom error";
    }

    if (exitCode.kind === ExitCode.REVERT) {
      const fallbackMessage = `VM Exception while processing transaction: revert ${returnDataExplanation}`;

      if (stackTrace !== undefined) {
        return encodeSolidityStackTrace(fallbackMessage, stackTrace);
      }

      return new TransactionExecutionError(fallbackMessage);
    }

    if (stackTrace !== undefined) {
      return encodeSolidityStackTrace(
        `Transaction failed: revert ${returnDataExplanation}`,
        stackTrace
      );
    }

    return new TransactionExecutionError(
      `Transaction reverted ${returnDataExplanation}`
    );
  }

  private _calculateTimestampAndOffset(
    timestamp?: bigint
  ): [bigint, boolean, bigint] {
    let blockTimestamp: bigint;
    let offsetShouldChange: boolean;
    let newOffset: bigint = 0n;
    const currentTimestamp = BigInt(getCurrentTimestamp());

    // if timestamp is not provided, we check nextBlockTimestamp, if it is
    // set, we use it as the timestamp instead. If it is not set, we use
    // time offset + real time as the timestamp.
    if (timestamp === undefined || timestamp === 0n) {
      if (this.getNextBlockTimestamp() === 0n) {
        blockTimestamp = currentTimestamp + this.getTimeIncrement();
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
      newOffset = blockTimestamp - currentTimestamp;
    }

    return [blockTimestamp, offsetShouldChange, newOffset];
  }

  private _resetNextBlockTimestamp() {
    this.setNextBlockTimestamp(0n);
  }

  private async _notifyPendingTransaction(tx: TypedTransaction) {
    this._filters.forEach((filter) => {
      if (filter.type === Type.PENDING_TRANSACTION_SUBSCRIPTION) {
        const hash = bufferToHex(tx.hash());
        if (filter.subscription) {
          this._emitEthEvent(filter.id, hash);
          return;
        }

        filter.hashes.push(hash);
      }
    });
  }

  private _getLocalAccountPrivateKey(sender: Address): Buffer {
    const senderAddress = sender.toString();
    if (!this._localAccounts.has(senderAddress)) {
      throw new InvalidInputError(`unknown account ${senderAddress}`);
    }

    return this._localAccounts.get(senderAddress)!;
  }

  /**
   * Saves a block as successfully run. This method requires that the block
   * was added to the blockchain.
   */
  private async _saveBlockAsSuccessfullyRun(
    block: Block,
    transactionResults: RunTxResult[],
    totalDifficulty: bigint
  ) {
    const receipts = getRpcReceiptOutputsFromLocalBlockExecution(
      block,
      transactionResults,
      shouldShowTransactionTypeForHardfork(this._common)
    );

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
            this._emitEthEvent(
              filter.id,
              getRpcBlock(
                block,
                totalDifficulty,
                shouldShowTransactionTypeForHardfork(this._common),
                false
              )
            );
            return;
          }

          filter.hashes.push(bufferToHex(hash));
          break;
        case Type.LOGS_SUBSCRIPTION:
          if (
            bloomFilter(
              new Bloom(block.header.logsBloom),
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
    blockTimestamp: bigint
  ): Promise<boolean> {
    const latestBlock = await this.getLatestBlock();
    const latestBlockTimestamp = latestBlock.header.timestamp;

    return latestBlockTimestamp === blockTimestamp;
  }

  private async _runInBlockContext<T>(
    blockNumberOrPending: bigint | "pending",
    action: () => Promise<T>
  ): Promise<T> {
    if (blockNumberOrPending === "pending") {
      return this._runInPendingBlockContext(action);
    }

    const latestBlockNumber = await this.getLatestBlockNumber();
    if (blockNumberOrPending === latestBlockNumber) {
      return action();
    }

    await this._context.vm().setBlockContext(blockNumberOrPending);

    try {
      return await action();
    } finally {
      await this._context.vm().restoreBlockContext(latestBlockNumber);
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

  private async _correctInitialEstimation(
    blockNumberOrPending: bigint | "pending",
    txParams: TransactionParams,
    initialEstimation: bigint
  ): Promise<bigint> {
    let tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: initialEstimation,
    });

    if (tx.getBaseFee() >= initialEstimation) {
      initialEstimation = tx.getBaseFee() + 1n;

      tx = await this._getFakeTransaction({
        ...txParams,
        gasLimit: initialEstimation,
      });
    }

    const result = await this._runInBlockContext(blockNumberOrPending, () =>
      this._runTxAndRevertMutations(tx, blockNumberOrPending)
    );

    if (!result.exit.isError()) {
      return initialEstimation;
    }

    return this._binarySearchEstimation(
      blockNumberOrPending,
      txParams,
      initialEstimation,
      await this.getBlockGasLimit()
    );
  }

  private async _binarySearchEstimation(
    blockNumberOrPending: bigint | "pending",
    txParams: TransactionParams,
    highestFailingEstimation: bigint,
    lowestSuccessfulEstimation: bigint,
    roundNumber = 0
  ): Promise<bigint> {
    if (lowestSuccessfulEstimation <= highestFailingEstimation) {
      // This shouldn't happen, but we don't want to go into an infinite loop
      // if it ever happens
      return lowestSuccessfulEstimation;
    }

    const MAX_GAS_ESTIMATION_IMPROVEMENT_ROUNDS = 20;

    const diff = lowestSuccessfulEstimation - highestFailingEstimation;

    const minDiff =
      highestFailingEstimation >= 4_000_000n
        ? 50_000
        : highestFailingEstimation >= 1_000_000n
        ? 10_000
        : highestFailingEstimation >= 100_000n
        ? 1_000
        : highestFailingEstimation >= 50_000n
        ? 500
        : highestFailingEstimation >= 30_000n
        ? 300
        : 200;

    if (diff <= minDiff) {
      return lowestSuccessfulEstimation;
    }

    if (roundNumber > MAX_GAS_ESTIMATION_IMPROVEMENT_ROUNDS) {
      return lowestSuccessfulEstimation;
    }

    const binSearchNewEstimation = highestFailingEstimation + diff / 2n;

    const optimizedEstimation =
      roundNumber === 0
        ? 3n * highestFailingEstimation
        : binSearchNewEstimation;

    const newEstimation =
      optimizedEstimation > binSearchNewEstimation
        ? binSearchNewEstimation
        : optimizedEstimation;

    // Let other things execute
    await new Promise((resolve) => setImmediate(resolve));

    const tx = await this._getFakeTransaction({
      ...txParams,
      gasLimit: newEstimation,
    });

    const result = await this._runInBlockContext(blockNumberOrPending, () =>
      this._runTxAndRevertMutations(tx, blockNumberOrPending)
    );

    if (!result.exit.isError()) {
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
   */
  private async _runTxAndRevertMutations(
    tx: TypedTransaction,
    blockNumberOrPending: bigint | "pending",
    forceBaseFeeZero = false,
    stateOverrideSet: StateOverrideSet = {}
  ): Promise<RunTxResult> {
    const blockNumber = await this._getBlockNumberForCall(blockNumberOrPending);

    const result = await this._context
      .vm()
      .dryRun(tx, blockNumber, forceBaseFeeZero, stateOverrideSet);
    return result;
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

    if (newFilterParams.toBlock > latestBlockNumber) {
      newFilterParams.toBlock = latestBlockNumber;
    }
    if (newFilterParams.fromBlock > latestBlockNumber) {
      newFilterParams.fromBlock = latestBlockNumber;
    }

    return newFilterParams;
  }

  private _newDeadline(): Date {
    const dt = new Date();
    dt.setMinutes(dt.getMinutes() + 5); // This will not overflow
    return dt;
  }

  private _getNextFilterId(): bigint {
    this._lastFilterId++;

    return this._lastFilterId;
  }

  private _filterIdToFiltersKey(filterId: bigint): string {
    return filterId.toString();
  }

  private _emitEthEvent(filterId: bigint, result: any) {
    this.emit("ethEvent", {
      result,
      filterId,
    });
  }

  private async _getNonce(
    address: Address,
    blockNumberOrPending: bigint | "pending",
    stateOverrideSet: StateOverrideSet = {}
  ): Promise<bigint> {
    const overridenAccount = Object.entries(stateOverrideSet).find(([key]) =>
      Address.fromString(key).equals(address)
    )?.[1];

    if (overridenAccount?.nonce !== undefined) {
      const MAX_NONCE = 2n ** 64n - 1n;
      if (overridenAccount.nonce > MAX_NONCE) {
        throw new InvalidInputError(
          `The 'nonce' property should occupy a maximum of 8 bytes (nonce=${overridenAccount.nonce}).`
        );
      }
      return overridenAccount.nonce;
    }

    if (blockNumberOrPending === "pending") {
      return this.getAccountNextPendingNonce(address);
    }

    return this._runInBlockContext(blockNumberOrPending, async () => {
      const account = await this._context.vm().getAccount(address);

      return account.nonce;
    });
  }

  private async _isTransactionMined(hash: Buffer): Promise<boolean> {
    const txReceipt = await this.getTransactionReceipt(hash);
    return txReceipt !== undefined;
  }

  public async isEip1559Active(
    blockNumberOrPending?: bigint | "pending"
  ): Promise<boolean> {
    return hardforkGte(
      await this._context
        .blockchain()
        .getHardforkAtBlockNumber(blockNumberOrPending),
      HardforkName.LONDON
    );
  }

  public async isEip4895Active(
    blockNumberOrPending?: bigint | "pending"
  ): Promise<boolean> {
    return hardforkGte(
      await this._context
        .blockchain()
        .getHardforkAtBlockNumber(blockNumberOrPending),
      HardforkName.SHANGHAI
    );
  }

  public isPostMergeHardfork(): boolean {
    return hardforkGte(this.hardfork, HardforkName.MERGE);
  }

  public setPrevRandao(prevRandao: Buffer): void {
    this._context.blockMiner().setPrevRandaoGeneratorNextValue(prevRandao);
  }

  public async getClientVersion(): Promise<string> {
    const hardhatPackage = await getPackageJson();
    const ethereumjsVMPackage = require("@nomicfoundation/ethereumjs-vm/package.json");
    return `HardhatNetwork/${hardhatPackage.version}/@nomicfoundation/ethereumjs-vm/${ethereumjsVMPackage.version}`;
  }

  public async getMetadata(): Promise<HardhatMetadata> {
    const clientVersion = await this.getClientVersion();

    const instanceIdHex = BigIntUtils.toEvmWord(this._instanceId);
    const instanceId = `0x${instanceIdHex}`;

    const latestBlock = await this.getLatestBlock();

    const latestBlockHashHex = latestBlock.header.hash().toString("hex");
    const latestBlockHash = `0x${latestBlockHashHex}`;

    const metadata: HardhatMetadata = {
      clientVersion,
      chainId: this._configChainId,
      instanceId,
      latestBlockNumber: Number(latestBlock.header.number),
      latestBlockHash,
    };

    if (this._forkBlockNumber !== undefined) {
      assertHardhatInvariant(
        this._forkNetworkId !== undefined,
        "this._forkNetworkId should be defined if this._forkBlockNumber is defined"
      );
      assertHardhatInvariant(
        this._forkBlockHash !== undefined,
        "this._forkBlockhash should be defined if this._forkBlockNumber is defined"
      );

      metadata.forkedNetwork = {
        chainId: this._forkNetworkId,
        forkBlockNumber: Number(this._forkBlockNumber),
        forkBlockHash: this._forkBlockHash,
      };
    }

    return metadata;
  }

  private async _getEstimateGasFeePriceFields(
    callParams: CallParams,
    blockNumberOrPending: bigint | "pending"
  ): Promise<
    | { gasPrice: bigint }
    | { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }
  > {
    if (
      !(await this.isEip1559Active(blockNumberOrPending)) ||
      callParams.gasPrice !== undefined
    ) {
      return { gasPrice: callParams.gasPrice ?? (await this.getGasPrice()) };
    }

    let maxFeePerGas = callParams.maxFeePerGas;
    let maxPriorityFeePerGas = callParams.maxPriorityFeePerGas;

    if (maxPriorityFeePerGas === undefined) {
      maxPriorityFeePerGas = await this.getMaxPriorityFeePerGas();

      if (maxFeePerGas !== undefined && maxFeePerGas < maxPriorityFeePerGas) {
        maxPriorityFeePerGas = maxFeePerGas;
      }
    }

    if (maxFeePerGas === undefined) {
      if (blockNumberOrPending === "pending") {
        const baseFeePerGas = await this.getNextBlockBaseFeePerGas();
        maxFeePerGas = 2n * baseFeePerGas! + maxPriorityFeePerGas;
      } else {
        const block = await this.getBlockByNumber(blockNumberOrPending);

        maxFeePerGas =
          maxPriorityFeePerGas + (block!.header.baseFeePerGas ?? 0n);
      }
    }

    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  private async _getTransactionForCall(
    call: CallParams,
    blockNumberOrPending: bigint | "pending",
    stateOverrideSet: StateOverrideSet = {}
  ): Promise<
    | FakeSenderTransaction
    | FakeSenderAccessListEIP2930Transaction
    | FakeSenderEIP1559Transaction
  > {
    let txParams: TransactionParams;

    const nonce = await this._getNonce(
      new Address(call.from),
      blockNumberOrPending,
      stateOverrideSet
    );

    if (
      call.gasPrice !== undefined ||
      !(await this.isEip1559Active(blockNumberOrPending))
    ) {
      txParams = {
        gasPrice: 0n,
        nonce,
        ...call,
      };
    } else {
      const maxFeePerGas = call.maxFeePerGas ?? call.maxPriorityFeePerGas ?? 0n;
      const maxPriorityFeePerGas = call.maxPriorityFeePerGas ?? 0n;

      txParams = {
        ...call,
        nonce,
        maxFeePerGas,
        maxPriorityFeePerGas,
        accessList: call.accessList ?? [],
      };
    }

    return this._getFakeTransaction(txParams);
  }

  private async _getBlockNumberForCall(
    blockNumberOrPending: bigint | "pending"
  ): Promise<bigint> {
    if (blockNumberOrPending === "pending") {
      // the new block has already been mined by _runInBlockContext hence we take latest here
      return this.getLatestBlockNumber();
    } else {
      return blockNumberOrPending;
    }
  }
}
