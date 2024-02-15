import { Block, HeaderData } from "@nomicfoundation/ethereumjs-block";
import {
  Common,
  EVMStateManagerInterface,
} from "@nomicfoundation/ethereumjs-common";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/cjs/exceptions";
import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  LegacyTransaction,
  TypedTransaction,
  BlobEIP4844Transaction,
} from "@nomicfoundation/ethereumjs-tx";
import {
  Address,
  ECDSASignature,
  bigIntToBytes,
  bytesToHex as bufferToHex,
  ecsign,
  equalsBytes,
  hashPersonalMessage,
  privateToAddress,
  setLengthLeft,
  toBytes,
  bytesToBigInt,
  Account,
} from "@nomicfoundation/ethereumjs-util";
import {
  Bloom,
  RunBlockResult,
  RunTxResult,
  VM,
} from "@nomicfoundation/ethereumjs-vm";
import { EVM, EVMResult } from "@nomicfoundation/ethereumjs-evm";
import { DefaultStateManager } from "@nomicfoundation/ethereumjs-statemanager";
import { SignTypedDataVersion, signTypedData } from "@metamask/eth-sig-util";
import chalk from "chalk";
import { randomBytes } from "crypto";
import debug from "debug";
import EventEmitter from "events";

import * as BigIntUtils from "../../util/bigint";
import { CompilerInput, CompilerOutput } from "../../../types";
import { HardforkHistoryConfig } from "../../../types/config";
import { HARDHAT_NETWORK_SUPPORTED_HARDFORKS } from "../../constants";
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
import { Reporter } from "../../sentry/reporter";
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
import { VMDebugTracer } from "../stack-traces/vm-debug-tracer";
import { VmTraceDecoder } from "../stack-traces/vm-trace-decoder";
import { VMTracer } from "../stack-traces/vm-tracer";

import "./ethereumjs-workarounds";
import { rpcQuantityToBigInt } from "../../core/jsonrpc/types/base-types";
import { JsonRpcClient } from "../jsonrpc/client";
import {
  StateOverrideSet,
  StateProperties,
} from "../../core/jsonrpc/types/input/callRequest";
import { bloomFilter, Filter, filterLogs, LATEST_BLOCK, Type } from "./filter";
import { ForkBlockchain } from "./fork/ForkBlockchain";
import { ForkStateManager } from "./fork/ForkStateManager";
import { HardhatBlockchain } from "./HardhatBlockchain";
import {
  CallParams,
  EstimateGasResult,
  FeeHistory,
  FilterParams,
  GatherTracesResult,
  GenesisAccount,
  isForkedNodeConfig,
  MempoolOrder,
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
import { TxPool } from "./TxPool";
import { TransactionQueue } from "./TransactionQueue";
import { HardhatBlockchainInterface } from "./types/HardhatBlockchainInterface";
import { getCurrentTimestamp } from "./utils/getCurrentTimestamp";
import { makeCommon } from "./utils/makeCommon";
import { makeForkClient } from "./utils/makeForkClient";
import { makeStateTrie } from "./utils/makeStateTrie";
import { putGenesisBlock } from "./utils/putGenesisBlock";
import { txMapToArray } from "./utils/txMapToArray";
import { RandomBufferGenerator } from "./utils/random";

type ExecResult = EVMResult["execResult"];

const BEACON_ROOT_ADDRESS = "0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02";
const BEACON_ROOT_BYTECODE =
  "0x3373fffffffffffffffffffffffffffffffffffffffe14604d57602036146024575f5ffd5b5f35801560495762001fff810690815414603c575f5ffd5b62001fff01545f5260205ff35b5f5ffd5b62001fff42064281555f359062001fff015500";

const log = debug("hardhat:core:hardhat-network:node");

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class HardhatNode extends EventEmitter {
  public static async create(
    config: NodeConfig
  ): Promise<[Common, HardhatNode]> {
    const {
      automine,
      genesisAccounts,
      blockGasLimit,
      tracingConfig,
      minGasPrice,
      mempoolOrder,
      networkId,
      chainId,
      allowBlocksWithSameTimestamp,
      enableTransientStorage,
    } = config;

    const allowUnlimitedContractSize =
      config.allowUnlimitedContractSize ?? false;

    let stateManager: EVMStateManagerInterface;
    let blockchain: HardhatBlockchainInterface;
    let initialBlockTimeOffset: bigint | undefined;
    let nextBlockBaseFeePerGas: bigint | undefined;
    let forkNetworkId: number | undefined;
    let forkBlockNum: bigint | undefined;
    let forkBlockHash: string | undefined;
    let hardforkActivations: HardforkHistoryConfig = new Map();

    const initialBaseFeePerGasConfig =
      config.initialBaseFeePerGas !== undefined
        ? BigInt(config.initialBaseFeePerGas)
        : undefined;

    const hardfork = getHardforkName(config.hardfork);
    const mixHashGenerator = RandomBufferGenerator.create("randomMixHashSeed");
    const parentBeaconBlockRootGenerator = RandomBufferGenerator.create(
      "randomParentBeaconBlockRootSeed"
    );

    let forkClient: JsonRpcClient | undefined;

    const common = makeCommon(config);

    if (isForkedNodeConfig(config)) {
      const {
        forkClient: _forkClient,
        forkBlockNumber,
        forkBlockTimestamp,
        forkBlockHash: _forkBlockHash,
      } = await makeForkClient(config.forkConfig, config.forkCachePath);
      forkClient = _forkClient;

      forkNetworkId = forkClient.getNetworkId();
      forkBlockNum = forkBlockNumber;
      forkBlockHash = _forkBlockHash;

      this._validateHardforks(
        config.forkConfig.blockNumber,
        common,
        forkNetworkId
      );

      const forkStateManager = new ForkStateManager(
        forkClient,
        forkBlockNumber
      );
      await forkStateManager.initializeGenesisAccounts(genesisAccounts);

      if (hardforkGte(hardfork, HardforkName.CANCUN)) {
        await forkStateManager.putContractCode(
          Address.fromString(BEACON_ROOT_ADDRESS),
          Buffer.from(toBytes(BEACON_ROOT_BYTECODE))
        );
      }

      stateManager = forkStateManager;

      blockchain = new ForkBlockchain(forkClient, forkBlockNumber, common);

      initialBlockTimeOffset = BigInt(
        getDifferenceInSeconds(new Date(forkBlockTimestamp), new Date())
      );

      // If the hardfork is London or later we need a base fee per gas for the
      // first local block. If initialBaseFeePerGas config was provided we use
      // that. Otherwise, what we do depends on the block we forked from. If
      // it's an EIP-1559 block we don't need to do anything here, as we'll
      // end up automatically computing the next base fee per gas based on it.
      if (hardforkGte(hardfork, HardforkName.LONDON)) {
        if (initialBaseFeePerGasConfig !== undefined) {
          nextBlockBaseFeePerGas = initialBaseFeePerGasConfig;
        } else {
          const latestBlock = await blockchain.getLatestBlock();
          if (latestBlock.header.baseFeePerGas === undefined) {
            nextBlockBaseFeePerGas = BigInt(
              HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS
            );
          }
        }
      }

      if (config.chains.has(forkNetworkId)) {
        hardforkActivations = config.chains.get(forkNetworkId)!.hardforkHistory;
      }
    } else {
      const stateTrie = await makeStateTrie(genesisAccounts);

      stateManager = new DefaultStateManager({
        trie: stateTrie,
      });

      if (hardforkGte(hardfork, HardforkName.CANCUN)) {
        await stateManager.putContractCode(
          Address.fromString(BEACON_ROOT_ADDRESS),
          Buffer.from(toBytes(BEACON_ROOT_BYTECODE))
        );
      }

      const hardhatBlockchain = new HardhatBlockchain(common);

      const genesisBlockBaseFeePerGas = hardforkGte(
        hardfork,
        HardforkName.LONDON
      )
        ? initialBaseFeePerGasConfig ??
          BigInt(HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS)
        : undefined;

      await putGenesisBlock(
        hardhatBlockchain,
        common,
        config,
        await stateManager.getStateRoot(),
        hardfork,
        mixHashGenerator.next(),
        parentBeaconBlockRootGenerator.next(),
        genesisBlockBaseFeePerGas
      );

      if (config.initialDate !== undefined) {
        initialBlockTimeOffset = BigInt(
          getDifferenceInSeconds(config.initialDate, new Date())
        );
      }

      blockchain = hardhatBlockchain;
    }

    const txPool = new TxPool(stateManager, BigInt(blockGasLimit), common);

    const evm = new EVM({
      allowUnlimitedContractSize,
      allowUnlimitedInitCodeSize: allowUnlimitedContractSize,
      blockchain,
      common,
      stateManager,
    });

    const vm = await VM.create({
      evm,
      activatePrecompiles: true,
      common,
      stateManager,
      blockchain,
    });

    const instanceId = bytesToBigInt(randomBytes(32));

    const node = new HardhatNode(
      vm,
      instanceId,
      stateManager,
      blockchain,
      txPool,
      automine,
      minGasPrice,
      initialBlockTimeOffset,
      mempoolOrder,
      config.coinbase,
      genesisAccounts,
      networkId,
      chainId,
      hardfork,
      hardforkActivations,
      mixHashGenerator,
      parentBeaconBlockRootGenerator,
      allowUnlimitedContractSize,
      allowBlocksWithSameTimestamp,
      tracingConfig,
      forkNetworkId,
      forkBlockNum,
      forkBlockHash,
      nextBlockBaseFeePerGas,
      forkClient,
      enableTransientStorage
    );

    return [common, node];
  }

  private static _validateHardforks(
    forkBlockNumber: number | undefined,
    common: Common,
    remoteChainId: number
  ): void {
    if (!common.gteHardfork("spuriousDragon")) {
      throw new InternalError(
        `Invalid hardfork selected in Hardhat Network's config.

The hardfork must be at least spuriousDragon, but ${common.hardfork()} was given.`
      );
    }

    if (forkBlockNumber !== undefined) {
      let upstreamCommon: Common;
      try {
        upstreamCommon = new Common({ chain: remoteChainId });
      } catch {
        // If ethereumjs doesn't have a common it will throw and we won't have
        // info about the activation block of each hardfork, so we don't run
        // this validation.
        return;
      }

      upstreamCommon.setHardforkBy({ blockNumber: forkBlockNumber });

      if (!upstreamCommon.gteHardfork("spuriousDragon")) {
        throw new InternalError(
          `Cannot fork ${upstreamCommon.chainName()} from block ${forkBlockNumber}.

Hardhat Network's forking functionality only works with blocks from at least spuriousDragon.`
        );
      }
    }
  }

  private readonly _localAccounts: Map<string, Uint8Array> = new Map(); // address => private key
  private readonly _impersonatedAccounts: Set<string> = new Set(); // address

  private _nextBlockTimestamp: bigint = 0n;
  private _userProvidedNextBlockBaseFeePerGas?: bigint;

  private _lastFilterId: bigint = 0n;
  private _filters: Map<string, Filter> = new Map();

  private _nextSnapshotId = 1; // We start in 1 to mimic Ganache
  private readonly _snapshots: Snapshot[] = [];

  private readonly _vmTracer: VMTracer;
  private readonly _vmTraceDecoder: VmTraceDecoder;
  private readonly _solidityTracer: SolidityTracer;
  private readonly _consoleLogger: ConsoleLogger = new ConsoleLogger();
  private _failedStackTraces = 0;

  // blockNumber => state root
  private _irregularStatesByBlockNumber: Map<bigint, Uint8Array> = new Map();

  private constructor(
    private readonly _vm: VM,
    private readonly _instanceId: bigint,
    private readonly _stateManager: EVMStateManagerInterface,
    private readonly _blockchain: HardhatBlockchainInterface,
    private readonly _txPool: TxPool,
    private _automine: boolean,
    private _minGasPrice: bigint,
    private _blockTimeOffsetSeconds: bigint = 0n,
    private _mempoolOrder: MempoolOrder,
    private _coinbase: string,
    genesisAccounts: GenesisAccount[],
    private readonly _configNetworkId: number,
    private readonly _configChainId: number,
    public readonly hardfork: HardforkName,
    private readonly _hardforkActivations: HardforkHistoryConfig,
    private _mixHashGenerator: RandomBufferGenerator,
    private _parentBeaconBlockRootGenerator: RandomBufferGenerator,
    public readonly allowUnlimitedContractSize: boolean,
    private _allowBlocksWithSameTimestamp: boolean,
    tracingConfig?: TracingConfig,
    private _forkNetworkId?: number,
    private _forkBlockNumber?: bigint,
    private _forkBlockHash?: string,
    nextBlockBaseFee?: bigint,
    private _forkClient?: JsonRpcClient,
    private readonly _enableTransientStorage: boolean = false
  ) {
    super();

    this._initLocalAccounts(genesisAccounts);

    if (nextBlockBaseFee !== undefined) {
      this.setUserProvidedNextBlockBaseFeePerGas(nextBlockBaseFee);
    }

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

      if (error instanceof Error) {
        Reporter.reportError(error);
      }
    }
  }

  public async getSignedTransaction(
    txParams: TransactionParams
  ): Promise<TypedTransaction> {
    const senderAddress = bufferToHex(txParams.from);

    const pk = this._localAccounts.get(senderAddress);
    if (pk !== undefined) {
      let tx: TypedTransaction;

      if ("blobs" in txParams) {
        tx = BlobEIP4844Transaction.fromTxData(txParams, {
          common: this._vm.common,
          allowUnlimitedInitCodeSize: true,
        });
      } else if ("maxFeePerGas" in txParams) {
        tx = FeeMarketEIP1559Transaction.fromTxData(txParams, {
          common: this._vm.common,
          allowUnlimitedInitCodeSize: true,
        });
      } else if ("accessList" in txParams) {
        tx = AccessListEIP2930Transaction.fromTxData(txParams, {
          common: this._vm.common,
          allowUnlimitedInitCodeSize: true,
        });
      } else {
        tx = LegacyTransaction.fromTxData(txParams, {
          common: this._vm.common,
          allowUnlimitedInitCodeSize: true,
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

    if (
      this._txPool.hasPendingTransactions() ||
      this._txPool.hasQueuedTransactions()
    ) {
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

    let result: MineBlockResult;
    try {
      result = await this._mineBlockWithPendingTxs(blockTimestamp);
    } catch (err) {
      if (err instanceof Error) {
        if (err?.message.includes("sender doesn't have enough funds")) {
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

    await this._saveBlockAsSuccessfullyRun(result.block, result.blockResult);

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
      mineBlockResults.push(await this.mineBlock(nextTimestamp));
    };

    // then we mine any pending transactions
    while (
      count > mineBlockResults.length &&
      this._txPool.hasPendingTransactions()
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
    const latestBlock = await this.getLatestBlock();
    this._blockchain.reserveBlocks(
      remainingBlockCount - 1n,
      interval,
      await this._stateManager.getStateRoot(),
      await this.getBlockTotalDifficulty(latestBlock),
      (await this.getLatestBlock()).header.baseFeePerGas
    );

    await mineBlock();

    return mineBlockResults;
  }

  public async runCall(
    call: CallParams,
    blockNumberOrPending: bigint | "pending",
    stateOverrideSet: StateOverrideSet = {}
  ): Promise<RunCallResult> {
    let txParams: TransactionParams;

    const nonce = await this._getNonce(
      new Address(call.from),
      blockNumberOrPending
    );

    if (
      call.gasPrice !== undefined ||
      !this.isEip1559Active(blockNumberOrPending)
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

    const tx = await this._getFakeTransaction(txParams);

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

    const traces = await this._gatherTraces(result.execResult);

    return {
      ...traces,
      result: new ReturnData(result.execResult.returnValue),
    };
  }

  public async getAccountBalance(
    address: Address,
    blockNumberOrPending?: bigint | "pending"
  ): Promise<bigint> {
    if (blockNumberOrPending === undefined) {
      blockNumberOrPending = this.getLatestBlockNumber();
    }

    const account = await this._runInBlockContext(blockNumberOrPending, () =>
      this._stateManager.getAccount(address)
    );

    return account?.balance ?? 0n;
  }

  public async getNextConfirmedNonce(
    address: Address,
    blockNumberOrPending: bigint | "pending"
  ): Promise<bigint> {
    const account = await this._runInBlockContext(blockNumberOrPending, () =>
      this._stateManager.getAccount(address)
    );

    return account?.nonce ?? 0n;
  }

  public async getAccountNextPendingNonce(address: Address): Promise<bigint> {
    return this._txPool.getNextPendingNonce(address);
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
    return this._blockchain.getLatestBlock();
  }

  public getLatestBlockNumber(): bigint {
    return this._blockchain.getLatestBlockNumber();
  }

  public async getPendingBlockAndTotalDifficulty(): Promise<[Block, bigint]> {
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

  public getBlockGasLimit(): bigint {
    return this._txPool.getBlockGasLimit();
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

    const initialEstimation = result.totalGasSpent;

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
    return Address.fromString(this._coinbase);
  }

  public async getStorageAt(
    address: Address,
    positionIndex: bigint,
    blockNumberOrPending: bigint | "pending"
  ): Promise<Buffer> {
    const key = setLengthLeft(bigIntToBytes(positionIndex), 32);

    const data = await this._runInBlockContext(
      blockNumberOrPending,
      async () => {
        const account = await this._stateManager.getAccount(address);
        if (account === undefined) {
          return Uint8Array.from([]);
        }
        return this._stateManager.getContractStorage(address, key);
      }
    );

    const EXPECTED_DATA_SIZE = 32;
    if (data.length < EXPECTED_DATA_SIZE) {
      return Buffer.concat(
        [Buffer.alloc(EXPECTED_DATA_SIZE - data.length, 0), data],
        EXPECTED_DATA_SIZE
      );
    }

    return Buffer.from(data);
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
        this._blockchain.getLatestBlock()
      );
    }

    try {
      const block = await this._blockchain.getBlock(blockNumberOrPending);
      return block;
    } catch {
      return undefined;
    }
  }

  public async getBlockByHash(blockHash: Buffer): Promise<Block | undefined> {
    try {
      const block = await this._blockchain.getBlock(blockHash);
      return block;
    } catch {
      return undefined;
    }
  }

  public async getBlockByTransactionHash(
    hash: Buffer
  ): Promise<Block | undefined> {
    const block = await this._blockchain.getBlockByTransactionHash(hash);
    return block ?? undefined;
  }

  public async getBlockTotalDifficulty(block: Block): Promise<bigint> {
    return this._blockchain.getTotalDifficulty(block.hash());
  }

  public async getCode(
    address: Address,
    blockNumberOrPending: bigint | "pending"
  ): Promise<Buffer> {
    return this._runInBlockContext(blockNumberOrPending, () =>
      this._stateManager.getContractCode(address).then(Buffer.from)
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

  public async getPendingTransaction(
    hash: Buffer
  ): Promise<TypedTransaction | undefined> {
    return this._txPool.getTransactionByHash(hash)?.data;
  }

  public async getTransactionReceipt(
    hash: Uint8Array | string
  ): Promise<RpcReceiptOutput | undefined> {
    const hashBuffer = hash instanceof Buffer ? hash : toBytes(hash);
    const receipt = await this._blockchain.getTransactionReceipt(hashBuffer);
    return receipt ?? undefined;
  }

  public async getPendingTransactions(): Promise<TypedTransaction[]> {
    const txPoolPending = txMapToArray(this._txPool.getPendingTransactions());
    const txPoolQueued = txMapToArray(this._txPool.getQueuedTransactions());
    return txPoolPending.concat(txPoolQueued);
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
      privateKey: Buffer.from(privateKey),
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
      stateRoot: await this._stateManager.getStateRoot(),
      txPoolSnapshotId: this._txPool.snapshot(),
      blockTimeOffsetSeconds: this.getTimeIncrement(),
      nextBlockTimestamp: this.getNextBlockTimestamp(),
      irregularStatesByBlockNumber: this._irregularStatesByBlockNumber,
      userProvidedNextBlockBaseFeePerGas:
        this.getUserProvidedNextBlockBaseFeePerGas(),
      coinbase: this.getCoinbaseAddress().toString(),
      mixHashGenerator: this._mixHashGenerator.clone(),
      parentBeaconBlockRootGenerator:
        this._parentBeaconBlockRootGenerator.clone(),
    };

    this._irregularStatesByBlockNumber = new Map(
      this._irregularStatesByBlockNumber
    );

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
    this._blockchain.deleteLaterBlocks(snapshot.latestBlock);
    this._irregularStatesByBlockNumber = snapshot.irregularStatesByBlockNumber;
    const irregularStateOrUndefined = this._irregularStatesByBlockNumber.get(
      (await this.getLatestBlock()).header.number
    );
    await this._stateManager.setStateRoot(
      irregularStateOrUndefined ?? snapshot.stateRoot
    );
    this.setTimeIncrement(newOffset);
    this.setNextBlockTimestamp(snapshot.nextBlockTimestamp);
    this._txPool.revert(snapshot.txPoolSnapshotId);

    if (snapshot.userProvidedNextBlockBaseFeePerGas !== undefined) {
      this.setUserProvidedNextBlockBaseFeePerGas(
        snapshot.userProvidedNextBlockBaseFeePerGas
      );
    } else {
      this._resetUserProvidedNextBlockBaseFeePerGas();
    }

    this._coinbase = snapshot.coinbase;

    this._mixHashGenerator = snapshot.mixHashGenerator;
    this._parentBeaconBlockRootGenerator =
      snapshot.parentBeaconBlockRootGenerator;

    // We delete this and the following snapshots, as they can only be used
    // once in Ganache
    this._snapshots.splice(snapshotIndex);

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

  public setAutomine(automine: boolean) {
    this._automine = automine;
  }

  public getAutomine() {
    return this._automine;
  }

  public async setBlockGasLimit(gasLimit: bigint | number) {
    this._txPool.setBlockGasLimit(gasLimit);
    await this._txPool.updatePendingAndQueued();
  }

  public async setMinGasPrice(minGasPrice: bigint) {
    this._minGasPrice = minGasPrice;
  }

  public async dropTransaction(hash: Buffer): Promise<boolean> {
    const removed = this._txPool.removeTransaction(hash);

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
    const account = await this._stateManager.getAccount(address);

    await this._stateManager.putAccount(
      address,
      Account.fromAccountData({
        nonce: account?.nonce,
        balance: newBalance,
        storageRoot: account?.storageRoot,
        codeHash: account?.codeHash,
      })
    );
    await this._persistIrregularWorldState();
  }

  public async setAccountCode(
    address: Address,
    newCode: Buffer
  ): Promise<void> {
    await this._stateManager.putContractCode(address, newCode);
    await this._persistIrregularWorldState();
  }

  public async setNextConfirmedNonce(
    address: Address,
    newNonce: bigint
  ): Promise<void> {
    if (!this._txPool.isEmpty()) {
      throw new InternalError(
        "Cannot set account nonce when the transaction pool is not empty"
      );
    }
    const account = await this._stateManager.getAccount(address);
    const accountNonce = account?.nonce ?? 0n;
    if (newNonce < accountNonce) {
      throw new InvalidInputError(
        `New nonce (${newNonce.toString()}) must not be smaller than the existing nonce (${accountNonce.toString()})`
      );
    }
    await this._stateManager.putAccount(
      address,
      Account.fromAccountData({
        nonce: newNonce,
        balance: account?.balance,
        storageRoot: account?.storageRoot,
        codeHash: account?.codeHash,
      })
    );
    await this._persistIrregularWorldState();
  }

  public async setStorageAt(
    address: Address,
    positionIndex: bigint,
    value: Buffer
  ) {
    // create the account if it doesn't exist
    const account = await this._stateManager.getAccount(address);
    if (account === undefined) {
      await this._stateManager.putAccount(address, new Account());
    }

    await this._stateManager.putContractStorage(
      address,
      setLengthLeft(bigIntToBytes(positionIndex), 32),
      value
    );
    await this._persistIrregularWorldState();
  }

  public async traceCall(
    callParams: CallParams,
    block: bigint | "pending",
    traceConfig: RpcDebugTracingConfig
  ) {
    const vmDebugTracer = new VMDebugTracer(this._vm);

    return vmDebugTracer.trace(async () => {
      await this.runCall(callParams, block);
    }, traceConfig);
  }

  public async traceTransaction(hash: Buffer, config: RpcDebugTracingConfig) {
    const block = await this.getBlockByTransactionHash(hash);
    if (block === undefined) {
      throw new InvalidInputError(
        `Unable to find a block containing transaction ${bufferToHex(hash)}`
      );
    }

    return this._runInBlockContext(block.header.number - 1n, async () => {
      const blockNumber = block.header.number;
      const blockchain = this._blockchain;
      let vm = this._vm;
      if (
        blockchain instanceof ForkBlockchain &&
        blockNumber <= blockchain.getForkBlockNumber()
      ) {
        assertHardhatInvariant(
          this._forkNetworkId !== undefined,
          "this._forkNetworkId should exist if the blockchain is an instance of ForkBlockchain"
        );

        const common = this._getCommonForTracing(
          this._forkNetworkId,
          blockNumber
        );

        vm = await VM.create({
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
      const isPreSpuriousDragon = !vm.common.gteHardfork("spuriousDragon");
      if (isPreSpuriousDragon) {
        throw new InvalidInputError(
          "Tracing is not supported for transactions using hardforks older than Spurious Dragon. "
        );
      }

      for (const tx of block.transactions) {
        let txWithCommon: TypedTransaction;
        const sender = tx.getSenderAddress();
        if (tx.type === 0) {
          txWithCommon = new FakeSenderTransaction(sender, tx, {
            common: vm.common,
          });
        } else if (tx.type === 1) {
          txWithCommon = new FakeSenderAccessListEIP2930Transaction(
            sender,
            tx,
            { common: vm.common }
          );
        } else if (tx.type === 2) {
          txWithCommon = new FakeSenderEIP1559Transaction(
            sender,
            { ...tx, gasPrice: undefined },
            { common: vm.common }
          );
        } else {
          throw new InternalError(
            "Only legacy, EIP2930, and EIP1559 txs are supported"
          );
        }

        const txHash = txWithCommon.hash();
        if (equalsBytes(txHash, hash)) {
          const vmDebugTracer = new VMDebugTracer(vm);
          return vmDebugTracer.trace(async () => {
            await vm.runTx({
              tx: txWithCommon,
              block,
              skipHardForkValidation: true,
            });
          }, config);
        }
        await vm.runTx({
          tx: txWithCommon,
          block,
          skipHardForkValidation: true,
        });
      }
      throw new TransactionExecutionError(
        `Unable to find a transaction in a block that contains that transaction, this should never happen`
      );
    });
  }

  public async getFeeHistory(
    blockCount: bigint,
    newestBlock: bigint | "pending",
    rewardPercentiles: number[]
  ): Promise<FeeHistory> {
    const latestBlock = this.getLatestBlockNumber();
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

  public async setCoinbase(coinbase: Address) {
    this._coinbase = coinbase.toString();
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
    await this._txPool.addTransaction(tx);
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
      results.push(await this.mineBlock());
      txReceipt = await this.getTransactionReceipt(txHash);
    } while (txReceipt === undefined);

    while (this._txPool.hasPendingTransactions()) {
      results.push(await this.mineBlock());
    }

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
    const nextPendingNonce = await this._txPool.getNextPendingNonce(sender);
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

  /**
   * Mines a new block with as many pending txs as possible, adding it to
   * the VM's blockchain.
   *
   * This method reverts any modification to the state manager if it throws.
   */
  private async _mineBlockWithPendingTxs(
    blockTimestamp: bigint
  ): Promise<MineBlockResult> {
    const parentBlock = await this.getLatestBlock();

    const headerData: HeaderData = {
      gasLimit: this.getBlockGasLimit(),
      coinbase: this.getCoinbaseAddress(),
      nonce: this.isPostMergeHardfork()
        ? "0x0000000000000000"
        : "0x0000000000000042",
      timestamp: blockTimestamp,
    };

    if (this.isPostMergeHardfork()) {
      headerData.mixHash = this._getNextMixHash();
    }

    if (this.isPostCancunHardfork()) {
      headerData.parentBeaconBlockRoot = this._getNextParentBeaconBlockRoot();
    }

    headerData.baseFeePerGas = await this.getNextBlockBaseFeePerGas();

    const blockBuilder = await this._vm.buildBlock({
      parentBlock,
      headerData,
      blockOpts: { calcDifficultyFromHeader: parentBlock.header },
    });

    try {
      const traces: GatherTracesResult[] = [];

      const blockGasLimit = this.getBlockGasLimit();
      const minTxFee = this._getMinimalTransactionFee();
      const pendingTxs = this._txPool.getPendingTransactions();
      const transactionQueue = new TransactionQueue(
        pendingTxs,
        this._mempoolOrder,
        headerData.baseFeePerGas
      );

      let tx = transactionQueue.getNextTransaction();

      const results = [];
      const receipts = [];

      while (
        blockGasLimit - blockBuilder.gasUsed >= minTxFee &&
        tx !== undefined
      ) {
        if (
          !this._isTxMinable(tx, headerData.baseFeePerGas) ||
          tx.gasLimit > blockGasLimit - blockBuilder.gasUsed
        ) {
          transactionQueue.removeLastSenderTransactions();
        } else {
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
          logsBloom: block.header.logsBloom,
          receiptsRoot: block.header.receiptTrie,
          gasUsed: block.header.gasUsed,
        },
        traces,
      };
    } catch (err) {
      await blockBuilder.revert();
      throw err;
    }
  }

  private _getMinimalTransactionFee(): bigint {
    // Typically 21_000 gas
    return this._vm.common.param("gasPrices", "tx");
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
        common: this._vm.common,
      });
    }

    if ("accessList" in txParams && txParams.accessList !== undefined) {
      return new FakeSenderAccessListEIP2930Transaction(sender, txParams, {
        common: this._vm.common,
      });
    }

    return new FakeSenderTransaction(sender, txParams, {
      common: this._vm.common,
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

  private _removeSnapshot(id: number) {
    const snapshotIndex = this._getSnapshotIndex(id);
    if (snapshotIndex === undefined) {
      return;
    }
    this._snapshots.splice(snapshotIndex);
  }

  private _initLocalAccounts(genesisAccounts: GenesisAccount[]) {
    const privateKeys = genesisAccounts.map((acc) => toBytes(acc.privateKey));
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
    } catch (err) {
      this._failedStackTraces += 1;
      log(
        "Could not generate stack trace. Please report this to help us improve Hardhat.\n",
        err
      );
    }

    const error = vmResult.exceptionError;

    // we don't use `instanceof` in case someone uses a different VM dependency
    // see https://github.com/nomiclabs/hardhat/issues/1317
    const isVmError = "error" in error && typeof error.error === "string";

    // If this is not a VM error, or if it's an internal VM error, we just
    // rethrow. An example of a non-VmError being thrown here is an HTTP error
    // coming from the ForkedStateManager.
    if (!isVmError || error.error === ERROR.INTERNAL_ERROR) {
      throw error;
    }

    if (error.error === ERROR.CODESIZE_EXCEEDS_MAXIMUM) {
      if (stackTrace !== undefined) {
        return encodeSolidityStackTrace(
          "Transaction ran out of gas",
          stackTrace
        );
      }

      return new TransactionExecutionError("Transaction ran out of gas");
    }

    if (error.error === ERROR.OUT_OF_GAS) {
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

    if (error.error === ERROR.REVERT) {
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

  private _getLocalAccountPrivateKey(sender: Address): Uint8Array {
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
    runBlockResult: RunBlockResult
  ) {
    const receipts = getRpcReceiptOutputsFromLocalBlockExecution(
      block,
      runBlockResult,
      shouldShowTransactionTypeForHardfork(this._vm.common)
    );

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
            this._emitEthEvent(
              filter.id,
              getRpcBlock(
                block,
                td,
                shouldShowTransactionTypeForHardfork(this._vm.common),
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

    if (blockNumberOrPending === this.getLatestBlockNumber()) {
      return action();
    }

    const block = await this.getBlockByNumber(blockNumberOrPending);
    if (block === undefined) {
      // TODO handle this better
      throw new Error(
        `Block with number ${blockNumberOrPending.toString()} doesn't exist. This should never happen.`
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
    const irregularStateOrUndefined = this._irregularStatesByBlockNumber.get(
      block.header.number
    );

    if (this._stateManager instanceof ForkStateManager) {
      return this._stateManager.setBlockContext(
        block.header.stateRoot,
        block.header.number,
        irregularStateOrUndefined
      );
    }

    return this._stateManager.setStateRoot(
      irregularStateOrUndefined ?? block.header.stateRoot
    );
  }

  private async _restoreBlockContext(stateRoot: Uint8Array) {
    if (this._stateManager instanceof ForkStateManager) {
      return this._stateManager.restoreForkBlockContext(stateRoot);
    }
    return this._stateManager.setStateRoot(stateRoot);
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

  private async _applyStateOverrideSet(stateOverrideSet: StateOverrideSet) {
    // Multiple state override set can be configured for different addresses, hence the loop
    for (const [addrToOverride, stateOverrideOptions] of Object.entries(
      stateOverrideSet
    )) {
      const address = new Address(toBytes(addrToOverride));

      const { balance, nonce, code, state, stateDiff } = stateOverrideOptions;

      await this._overrideBalanceAndNonce(address, balance, nonce);
      await this._overrideCode(address, code);
      await this._overrideStateAndStateDiff(address, state, stateDiff);
    }
  }

  private async _overrideBalanceAndNonce(
    address: Address,
    balance: bigint | undefined,
    nonce: bigint | undefined
  ) {
    const MAX_NONCE = 2n ** 64n - 1n;
    const MAX_BALANCE = 2n ** 256n - 1n;

    if (nonce !== undefined && nonce > MAX_NONCE) {
      throw new InvalidInputError(
        `The 'nonce' property should occupy a maximum of 8 bytes (nonce=${nonce}).`
      );
    }

    if (balance !== undefined && balance > MAX_BALANCE) {
      throw new InvalidInputError(
        `The 'balance' property should occupy a maximum of 32 bytes (balance=${balance}).`
      );
    }

    await this._stateManager.modifyAccountFields(address, {
      balance,
      nonce,
    });
  }

  private async _overrideCode(address: Address, code: Buffer | undefined) {
    if (code === undefined) return;

    await this._stateManager.putContractCode(address, code);
  }

  private async _overrideStateAndStateDiff(
    address: Address,
    state: StateProperties | undefined,
    stateDiff: StateProperties | undefined
  ) {
    let newState;

    if (state !== undefined && stateDiff === undefined) {
      await this._stateManager.clearContractStorage(address);
      newState = state;
    } else if (state === undefined && stateDiff !== undefined) {
      newState = stateDiff;
    } else if (state === undefined && stateDiff === undefined) {
      // nothing to do
      return;
    } else {
      throw new InvalidInputError(
        "The properties 'state' and 'stateDiff' cannot be used simultaneously when configuring the state override set passed to the eth_call method."
      );
    }

    for (const [storageKey, value] of Object.entries(newState)) {
      await this._stateManager.putContractStorage(
        address,
        toBytes(storageKey),
        setLengthLeft(bigIntToBytes(value), 32)
      );
    }
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
    const initialStateRoot = await this._stateManager.getStateRoot();

    await this._applyStateOverrideSet(stateOverrideSet);

    let blockContext: Block | undefined;
    let originalCommon: Common | undefined;

    try {
      if (blockNumberOrPending === "pending") {
        // the new block has already been mined by _runInBlockContext hence we take latest here
        blockContext = await this.getLatestBlock();
      } else {
        // We know that this block number exists, because otherwise
        // there would be an error in the RPC layer.
        const block = await this.getBlockByNumber(blockNumberOrPending);
        assertHardhatInvariant(
          block !== undefined,
          "Tried to run a tx in the context of a non-existent block"
        );

        blockContext = block;

        // we don't need to add the tx to the block because runTx doesn't
        // know anything about the txs in the current block
      }

      originalCommon = (this._vm as any).common;

      assertTransientStorageCompatibility(
        this._enableTransientStorage,
        this._vm.common.hardfork() as HardforkName
      );

      (this._vm as any).common = Common.custom(
        {
          chainId:
            this._forkBlockNumber === undefined ||
            blockContext.header.number >= this._forkBlockNumber
              ? this._configChainId
              : this._forkNetworkId,
          networkId: this._forkNetworkId ?? this._configNetworkId,
        },
        {
          hardfork: this._selectHardfork(blockContext.header.number),
        }
      );

      // If this VM is running without EIP4895, but the block has withdrawals,
      // we remove them and the withdrawal root from the block
      if (
        !this.isEip4895Active(blockNumberOrPending) &&
        blockContext.withdrawals !== undefined
      ) {
        blockContext = Block.fromBlockData(
          {
            ...blockContext,
            withdrawals: undefined,
            header: {
              ...blockContext.header,
              withdrawalsRoot: undefined,
            },
          },
          {
            freeze: false,
            common: this._vm.common,

            skipConsensusFormatValidation: true,
          }
        );
      }

      // If this VM is running without cancun, but the block has cancun fields,
      // we remove them from the block
      if (
        !this.isCancunBlock(blockNumberOrPending) &&
        blockContext.header.blobGasUsed !== undefined
      ) {
        blockContext = Block.fromBlockData(
          {
            ...blockContext,
            header: {
              ...blockContext.header,
              blobGasUsed: undefined,
              excessBlobGas: undefined,
              parentBeaconBlockRoot: undefined,
            },
          },
          {
            freeze: false,
            common: this._vm.common,

            skipConsensusFormatValidation: true,
          }
        );
      }

      // NOTE: This is a workaround of both an @nomicfoundation/ethereumjs-vm limitation, and
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
      if (
        this.isEip1559Active(blockNumberOrPending) &&
        (blockContext.header.baseFeePerGas === undefined || forceBaseFeeZero)
      ) {
        blockContext = Block.fromBlockData(blockContext, {
          freeze: false,
          common: this._vm.common,

          skipConsensusFormatValidation: true,
        });

        (blockContext.header as any).baseFeePerGas = 0n;
      }

      return await this._vm.runTx({
        block: blockContext,
        tx,
        skipNonce: true,
        skipBalance: true,
        skipBlockGasLimitValidation: true,
        skipHardForkValidation: true,
      });
    } finally {
      if (originalCommon !== undefined) {
        (this._vm as any).common = originalCommon;
      }
      await this._stateManager.setStateRoot(initialStateRoot);
    }
  }

  private async _computeFilterParams(
    filterParams: FilterParams,
    isFilter: boolean
  ): Promise<FilterParams> {
    const latestBlockNumber = this.getLatestBlockNumber();
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
    blockNumberOrPending: bigint | "pending"
  ): Promise<bigint> {
    if (blockNumberOrPending === "pending") {
      return this.getAccountNextPendingNonce(address);
    }

    return this._runInBlockContext(blockNumberOrPending, async () => {
      const account = await this._stateManager.getAccount(address);

      return account?.nonce ?? 0n;
    });
  }

  private async _isTransactionMined(hash: Buffer): Promise<boolean> {
    const txReceipt = await this.getTransactionReceipt(hash);
    return txReceipt !== undefined;
  }

  private _isTxMinable(
    tx: TypedTransaction,
    nextBlockBaseFeePerGas?: bigint
  ): boolean {
    const txMaxFee = "gasPrice" in tx ? tx.gasPrice : tx.maxFeePerGas;

    const canPayBaseFee =
      nextBlockBaseFeePerGas !== undefined
        ? txMaxFee >= nextBlockBaseFeePerGas
        : true;

    const atLeastMinGasPrice = txMaxFee >= this._minGasPrice;

    return canPayBaseFee && atLeastMinGasPrice;
  }

  private async _persistIrregularWorldState(): Promise<void> {
    this._irregularStatesByBlockNumber.set(
      this.getLatestBlockNumber(),
      await this._stateManager.getStateRoot()
    );
  }

  public isEip1559Active(blockNumberOrPending?: bigint | "pending"): boolean {
    if (
      blockNumberOrPending !== undefined &&
      blockNumberOrPending !== "pending"
    ) {
      return this._vm.common.hardforkGteHardfork(
        this._selectHardfork(blockNumberOrPending),
        "london"
      );
    }
    return this._vm.common.gteHardfork("london");
  }

  public isEip4895Active(blockNumberOrPending?: bigint | "pending"): boolean {
    if (
      blockNumberOrPending !== undefined &&
      blockNumberOrPending !== "pending"
    ) {
      return this._vm.common.hardforkGteHardfork(
        this._selectHardfork(blockNumberOrPending),
        "shanghai"
      );
    }
    return this._vm.common.gteHardfork("shanghai");
  }

  public isCancunBlock(blockNumberOrPending?: bigint | "pending"): boolean {
    if (
      blockNumberOrPending !== undefined &&
      blockNumberOrPending !== "pending"
    ) {
      return this._vm.common.hardforkGteHardfork(
        this._selectHardfork(blockNumberOrPending),
        "cancun"
      );
    }
    return this._vm.common.gteHardfork("cancun");
  }

  public isPostMergeHardfork(): boolean {
    return hardforkGte(this.hardfork, HardforkName.MERGE);
  }

  public isPostCancunHardfork(): boolean {
    return hardforkGte(this.hardfork, HardforkName.CANCUN);
  }

  public setPrevRandao(prevRandao: Buffer): void {
    this._mixHashGenerator.setNext(prevRandao);
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

    const latestBlockHashHex = Buffer.from(latestBlock.header.hash()).toString(
      "hex"
    );
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

  private _getNextMixHash(): Uint8Array {
    return this._mixHashGenerator.next();
  }

  private _getNextParentBeaconBlockRoot(): Uint8Array {
    return this._parentBeaconBlockRootGenerator.next();
  }

  private async _getEstimateGasFeePriceFields(
    callParams: CallParams,
    blockNumberOrPending: bigint | "pending"
  ): Promise<
    | { gasPrice: bigint }
    | { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }
  > {
    if (
      !this.isEip1559Active(blockNumberOrPending) ||
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

  private _selectHardfork(blockNumber: bigint): string {
    if (
      this._forkBlockNumber === undefined ||
      blockNumber >= this._forkBlockNumber
    ) {
      return this._vm.common.hardfork() as HardforkName;
    }

    if (this._hardforkActivations.size === 0) {
      throw new InternalError(
        `No known hardfork for execution on historical block ${blockNumber.toString()} (relative to fork block number ${
          this._forkBlockNumber
        }). The node was not configured with a hardfork activation history.  See http://hardhat.org/custom-hardfork-history`
      );
    }

    /** search this._hardforkActivations for the highest block number that
     * isn't higher than blockNumber, and then return that found block number's
     * associated hardfork name. */
    const hardforkHistory: Array<[name: string, block: number]> = Array.from(
      this._hardforkActivations.entries()
    );
    const [hardfork, activationBlock] = hardforkHistory.reduce(
      ([highestHardfork, highestBlock], [thisHardfork, thisBlock]) =>
        thisBlock > highestBlock && thisBlock <= blockNumber
          ? [thisHardfork, thisBlock]
          : [highestHardfork, highestBlock]
    );
    if (hardfork === undefined || blockNumber < activationBlock) {
      throw new InternalError(
        `Could not find a hardfork to run for block ${blockNumber.toString()}, after having looked for one in the HardhatNode's hardfork activation history, which was: ${JSON.stringify(
          hardforkHistory
        )}. For more information, see https://hardhat.org/hardhat-network/reference/#config`
      );
    }

    if (!HARDHAT_NETWORK_SUPPORTED_HARDFORKS.includes(hardfork)) {
      throw new InternalError(
        `Tried to run a call or transaction in the context of a block whose hardfork is "${hardfork}", but Hardhat Network only supports the following hardforks: ${HARDHAT_NETWORK_SUPPORTED_HARDFORKS.join(
          ", "
        )}`
      );
    }

    return hardfork === "merge" ? "mergeForkIdTransition" : hardfork;
  }

  private _getCommonForTracing(networkId: number, blockNumber: bigint): Common {
    assertTransientStorageCompatibility(
      this._enableTransientStorage,
      this._vm.common.hardfork() as HardforkName
    );

    try {
      const common = Common.custom(
        {
          chainId: networkId,
          networkId,
        },
        {
          hardfork: this._selectHardfork(BigInt(blockNumber)),
        }
      );

      return common;
    } catch {
      throw new InternalError(
        `Network id ${networkId} does not correspond to a network that Hardhat can trace`
      );
    }
  }
}

export function assertTransientStorageCompatibility(
  enableTransientStorage: boolean,
  hardfork: HardforkName
) {
  if (enableTransientStorage && !hardforkGte(hardfork, HardforkName.CANCUN)) {
    throw new InternalError(
      `Transient storage is not compatible with hardfork "${hardfork}". To use transient storage, set the hardfork to "cancun" or later.`
    );
  }
}
