import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  EVM,
  EVMResult,
  InterpreterStep,
  Message,
} from "@nomicfoundation/ethereumjs-evm";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";
import {
  DefaultStateManager,
  StateManager,
} from "@nomicfoundation/ethereumjs-statemanager";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Account, Address } from "@nomicfoundation/ethereumjs-util";
import {
  EEI,
  RunTxResult as EthereumJSRunTxResult,
  VM,
} from "@nomicfoundation/ethereumjs-vm";
import { SuccessReason } from "rethnet-evm";
import { assertHardhatInvariant } from "../../../core/errors";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import {
  InternalError,
  InvalidInputError,
  TransactionExecutionError,
} from "../../../core/providers/errors";
import { MessageTrace } from "../../stack-traces/message-trace";
import { VMDebugTracer } from "../../stack-traces/vm-debug-tracer";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { ForkStateManager } from "../fork/ForkStateManager";
import { isForkedNodeConfig, NodeConfig } from "../node-types";
import { RpcDebugTraceOutput } from "../output";
import { FakeSenderAccessListEIP2930Transaction } from "../transactions/FakeSenderAccessListEIP2930Transaction";
import { FakeSenderEIP1559Transaction } from "../transactions/FakeSenderEIP1559Transaction";
import { FakeSenderTransaction } from "../transactions/FakeSenderTransaction";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";
import { Bloom } from "../utils/bloom";
import { makeForkClient } from "../utils/makeForkClient";
import { makeStateTrie } from "../utils/makeStateTrie";
import { Exit } from "./exit";
import { RunTxResult, Trace, VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class EthereumJSAdapter implements VMAdapter {
  private _blockStartStateRoot: Buffer | undefined;

  private _vmTracer: VMTracer;

  constructor(
    private readonly _vm: VM,
    private readonly _stateManager: StateManager,
    private readonly _blockchain: HardhatBlockchainInterface,
    private readonly _common: Common,
    private readonly _configNetworkId: number,
    private readonly _configChainId: number,
    private readonly _selectHardfork: (blockNumber: bigint) => string,
    private readonly _forkNetworkId?: number,
    private readonly _forkBlockNumber?: bigint
  ) {
    this._vmTracer = new VMTracer(_common, false);

    assertHardhatInvariant(
      this._vm.evm.events !== undefined,
      "EVM should have an 'events' property"
    );

    this._vm.evm.events.on("beforeMessage", this._beforeMessageHandler);
    this._vm.evm.events.on("step", this._stepHandler);
    this._vm.evm.events.on("afterMessage", this._afterMessageHandler);
  }

  public static async create(
    common: Common,
    blockchain: HardhatBlockchainInterface,
    config: NodeConfig,
    selectHardfork: (blockNumber: bigint) => string
  ): Promise<EthereumJSAdapter> {
    let stateManager: StateManager;
    let forkBlockNum: bigint | undefined;
    let forkNetworkId: number | undefined;

    if (isForkedNodeConfig(config)) {
      const { forkClient, forkBlockNumber } = await makeForkClient(
        config.forkConfig,
        config.forkCachePath
      );

      forkNetworkId = forkClient.getNetworkId();
      forkBlockNum = forkBlockNumber;

      const forkStateManager = new ForkStateManager(
        forkClient,
        forkBlockNumber
      );
      await forkStateManager.initializeGenesisAccounts(config.genesisAccounts);

      stateManager = forkStateManager;
    } else {
      const stateTrie = await makeStateTrie(config.genesisAccounts);

      stateManager = new DefaultStateManager({
        trie: stateTrie,
      });
    }

    const eei = new EEI(stateManager, common, blockchain);
    const evm = await EVM.create({
      eei,
      allowUnlimitedContractSize: config.allowUnlimitedContractSize,
      common,
    });

    const vm = await VM.create({
      evm,
      activatePrecompiles: true,
      common,
      stateManager,
      blockchain,
    });

    return new EthereumJSAdapter(
      vm,
      stateManager,
      blockchain,
      common,
      config.networkId,
      config.chainId,
      selectHardfork,
      forkNetworkId,
      forkBlockNum
    );
  }

  public async dryRun(
    tx: TypedTransaction,
    blockContext: Block,
    forceBaseFeeZero = false
  ): Promise<[RunTxResult, Trace]> {
    const initialStateRoot = await this.getStateRoot();

    let originalCommon: Common | undefined;

    try {
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
        this._isEip1559Active(blockContext.header.number) &&
        (blockContext.header.baseFeePerGas === undefined || forceBaseFeeZero)
      ) {
        blockContext = Block.fromBlockData(blockContext, {
          freeze: false,
          common: this._common,

          skipConsensusFormatValidation: true,
        });

        (blockContext.header as any).baseFeePerGas = 0n;
      }

      originalCommon = (this._vm as any)._common;

      (this._vm as any)._common = Common.custom(
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

      const vmDebugTracer = new VMDebugTracer(this._vm);
      let ethereumJSResult: EthereumJSRunTxResult | undefined;
      const trace = await vmDebugTracer.trace(
        async () => {
          ethereumJSResult = await this._vm.runTx({
            block: blockContext,
            tx,
            skipNonce: true,
            skipBalance: true,
            skipBlockGasLimitValidation: true,
          });
        },
        {
          disableStorage: true,
          disableMemory: true,
          disableStack: true,
        }
      );

      assertHardhatInvariant(
        ethereumJSResult !== undefined,
        "Should have a result"
      );

      const ethereumJSError = ethereumJSResult.execResult.exceptionError;
      const result: RunTxResult = {
        bloom: new Bloom(ethereumJSResult.bloom.bitvector),
        gasUsed: ethereumJSResult.totalGasSpent,
        receipt: ethereumJSResult.receipt,
        returnValue: ethereumJSResult.execResult.returnValue,
        createdAddress: ethereumJSResult.createdAddress,
        exit: Exit.fromEthereumJSEvmError(ethereumJSError),
      };

      return [result, trace];
    } finally {
      if (originalCommon !== undefined) {
        (this._vm as any)._common = originalCommon;
      }
      await this._stateManager.setStateRoot(initialStateRoot);
    }
  }

  public async getStateRoot(): Promise<Buffer> {
    return this._stateManager.getStateRoot();
  }

  public async getAccount(address: Address): Promise<Account> {
    return this._stateManager.getAccount(address);
  }

  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    return this._stateManager.getContractStorage(address, key);
  }

  public async getContractCode(address: Address): Promise<Buffer> {
    return this._stateManager.getContractCode(address);
  }

  public async putAccount(address: Address, account: Account): Promise<void> {
    return this._stateManager.putAccount(address, account);
  }

  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    return this._stateManager.putContractCode(address, value);
  }

  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    return this._stateManager.putContractStorage(address, key, value);
  }

  public async restoreContext(stateRoot: Buffer): Promise<void> {
    if (this._stateManager instanceof ForkStateManager) {
      return this._stateManager.restoreForkBlockContext(stateRoot);
    }
    return this._stateManager.setStateRoot(stateRoot);
  }

  public async setBlockContext(
    block: Block,
    irregularStateOrUndefined: Buffer | undefined
  ): Promise<void> {
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

  public async traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    const blockNumber = block.header.number;
    let vm = this._vm;
    if (
      this._forkBlockNumber !== undefined &&
      blockNumber <= this._forkBlockNumber
    ) {
      assertHardhatInvariant(
        this._forkNetworkId !== undefined,
        "this._forkNetworkId should exist if this._forkBlockNumber exists"
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
    const isPreSpuriousDragon = !vm._common.gteHardfork("spuriousDragon");
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
          common: vm._common,
        });
      } else if (tx.type === 1) {
        txWithCommon = new FakeSenderAccessListEIP2930Transaction(sender, tx, {
          common: vm._common,
        });
      } else if (tx.type === 2) {
        txWithCommon = new FakeSenderEIP1559Transaction(
          sender,
          { ...tx, gasPrice: undefined },
          {
            common: vm._common,
          }
        );
      } else {
        throw new InternalError(
          "Only legacy, EIP2930, and EIP1559 txs are supported"
        );
      }

      const txHash = txWithCommon.hash();
      if (txHash.equals(hash)) {
        const vmDebugTracer = new VMDebugTracer(vm);
        return vmDebugTracer.trace(async () => {
          await vm.runTx({ tx: txWithCommon, block });
        }, config);
      }
      await vm.runTx({ tx: txWithCommon, block });
    }
    throw new TransactionExecutionError(
      `Unable to find a transaction in a block that contains that transaction, this should never happen`
    );
  }

  public async startBlock(): Promise<void> {
    if (this._blockStartStateRoot !== undefined) {
      throw new Error("a block is already started");
    }

    this._blockStartStateRoot = await this.getStateRoot();
  }

  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]> {
    const vmTracer = new VMDebugTracer(this._vm);
    let ethereumJSResult: EthereumJSRunTxResult | undefined;
    const trace = await vmTracer.trace(
      async () => {
        ethereumJSResult = await this._vm.runTx({ tx, block });
      },
      {
        disableStorage: true,
        disableMemory: true,
        disableStack: true,
      }
    );

    assertHardhatInvariant(
      ethereumJSResult !== undefined,
      "Should have a result"
    );

    const ethereumJSError = ethereumJSResult.execResult.exceptionError;
    const result: RunTxResult = {
      bloom: new Bloom(ethereumJSResult.bloom.bitvector),
      gasUsed: ethereumJSResult.totalGasSpent,
      receipt: ethereumJSResult.receipt,
      returnValue: ethereumJSResult.execResult.returnValue,
      createdAddress: ethereumJSResult.createdAddress,
      exit: Exit.fromEthereumJSEvmError(ethereumJSError),
    };

    return [result, trace];
  }

  public async addBlockRewards(
    rewards: Array<[Address, bigint]>
  ): Promise<void> {
    for (const [address, reward] of rewards) {
      const account = await this._stateManager.getAccount(address);
      account.balance += reward;
      await this._stateManager.putAccount(address, account);
    }
  }

  public async sealBlock(): Promise<void> {
    if (this._blockStartStateRoot === undefined) {
      throw new Error("Cannot seal a block that wasn't started");
    }

    this._blockStartStateRoot = undefined;
  }

  public async revertBlock(): Promise<void> {
    if (this._blockStartStateRoot === undefined) {
      throw new Error("Cannot revert a block that wasn't started");
    }

    await this._stateManager.setStateRoot(this._blockStartStateRoot);
    this._blockStartStateRoot = undefined;
  }

  public async makeSnapshot(): Promise<Buffer> {
    return this.getStateRoot();
  }

  public getLastTrace(): {
    trace: MessageTrace | undefined;
    error: Error | undefined;
  } {
    const trace = this._vmTracer.getLastTopLevelMessageTrace();
    const error = this._vmTracer.getLastError();

    return { trace, error };
  }

  public clearLastError() {
    this._vmTracer.clearLastError();
  }

  private _getCommonForTracing(networkId: number, blockNumber: bigint): Common {
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

  private _isEip1559Active(blockNumberOrPending?: bigint | "pending"): boolean {
    if (
      blockNumberOrPending !== undefined &&
      blockNumberOrPending !== "pending"
    ) {
      return this._common.hardforkGteHardfork(
        this._selectHardfork(blockNumberOrPending),
        "london"
      );
    }
    return this._common.gteHardfork("london");
  }

  private _beforeMessageHandler = async (message: Message, next: any) => {
    try {
      const code =
        message.to !== undefined
          ? await this.getContractCode(message.codeAddress)
          : undefined;
      await this._vmTracer.addBeforeMessage({
        ...message,
        to: message.to?.toBuffer(),
        codeAddress:
          message.to !== undefined ? message.codeAddress.toBuffer() : undefined,
        code,
      });

      return next();
    } catch (e) {
      return next(e);
    }
  };

  private _stepHandler = async (step: InterpreterStep, next: any) => {
    try {
      await this._vmTracer.addStep({
        depth: step.depth,
        pc: BigInt(step.pc),
        opcode: step.opcode.name,
        // returnValue: 0, // Do we have error values in ethereumjs?
        gasCost: BigInt(step.opcode.fee) + (step.opcode.dynamicFee ?? 0n),
        gasRefunded: step.gasRefund,
        gasLeft: step.gasLeft,
        stack: step.stack,
        memory: step.memory,
        contract: {
          balance: step.account.balance,
          nonce: step.account.nonce,
          code: {
            hash: step.account.codeHash,
            code: Buffer.from([]),
          },
        },
        contractAddress: step.address.buf,
      });

      return next();
    } catch (e) {
      return next(e);
    }
  };

  private _afterMessageHandler = async (result: EVMResult, next: any) => {
    try {
      const gasUsed = result.execResult.executionGasUsed;

      let executionResult;

      if (result.execResult.exceptionError === undefined) {
        const reason =
          result.execResult.selfdestruct !== undefined &&
          Object.keys(result.execResult.selfdestruct).length > 0
            ? SuccessReason.SelfDestruct
            : result.createdAddress !== undefined ||
              result.execResult.returnValue.length > 0
            ? SuccessReason.Return
            : SuccessReason.Stop;

        executionResult = {
          reason,
          gasUsed,
          gasRefunded: result.execResult.gasRefund ?? 0n,
          logs:
            result.execResult.logs?.map((log) => {
              return {
                address: log[0],
                topics: log[1],
                data: log[2],
              };
            }) ?? [],
          output:
            result.createdAddress === undefined
              ? {
                  returnValue: result.execResult.returnValue,
                }
              : {
                  address: result.createdAddress.toBuffer(),
                  returnValue: result.execResult.returnValue,
                },
        };
      } else if (result.execResult.exceptionError.error === ERROR.REVERT) {
        executionResult = {
          gasUsed,
          output: result.execResult.returnValue,
        };
      } else {
        const vmError = Exit.fromEthereumJSEvmError(
          result.execResult.exceptionError
        );

        executionResult = {
          reason: vmError.getRethnetExceptionalHalt(),
          gasUsed,
        };
      }

      await this._vmTracer.addAfterMessage({
        executionResult: {
          result: executionResult,
          trace: {
            steps: [],
            returnValue: result.execResult.returnValue,
          },
        },
      });

      return next();
    } catch (e) {
      return next(e);
    }
  };
}
