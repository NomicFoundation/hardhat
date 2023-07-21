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
import { makeAccount } from "../utils/makeAccount";
import { makeStateTrie } from "../utils/makeStateTrie";
import { Exit } from "./exit";
import { RunTxResult, Trace, VMAdapter } from "./vm-adapter";
import { BlockBuilderAdapter, BuildBlockOpts } from "./block-builder";
import { HardhatBlockBuilder } from "./block-builder/hardhat";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

// temporary wrapper class used to print the whole storage
class DefaultStateManagerWithAddresses extends DefaultStateManager {
  public addresses: Set<string> = new Set();

  public putAccount(address: Address, account: Account): Promise<void> {
    this.addresses.add(address.toString());
    return super.putAccount(address, account);
  }

  public deleteAccount(address: Address): Promise<void> {
    this.addresses.add(address.toString());
    return super.deleteAccount(address);
  }

  public modifyAccountFields(
    address: Address,
    accountFields: any
  ): Promise<void> {
    this.addresses.add(address.toString());
    return super.modifyAccountFields(address, accountFields);
  }

  public putContractCode(address: Address, value: Buffer): Promise<void> {
    this.addresses.add(address.toString());
    return super.putContractCode(address, value);
  }

  public putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    this.addresses.add(address.toString());
    return super.putContractStorage(address, key, value);
  }

  public clearContractStorage(address: Address): Promise<void> {
    this.addresses.add(address.toString());
    return super.clearContractStorage(address);
  }
}

interface Storage {
  [address: string]: {
    balance: string;
    nonce: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    code_hash: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    storage_root: string;
    storage: {
      [storageSlot: string]: string;
    };
  };
}

type StateManagerWithAddresses = StateManager & {
  addresses: Set<string>;
};

export class EthereumJSAdapter implements VMAdapter {
  private _vmTracer: VMTracer;

  constructor(
    private readonly _vm: VM,
    public readonly _stateManager: StateManagerWithAddresses,
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

    this._vm.evm.events.on(
      "beforeMessage",
      this._beforeMessageHandler.bind(this)
    );
    this._vm.evm.events.on("step", this._stepHandler.bind(this));
    this._vm.evm.events.on(
      "afterMessage",
      this._afterMessageHandler.bind(this)
    );
  }

  public getForkBlockNumber() {
    return this._forkBlockNumber;
  }

  public static async create(
    common: Common,
    blockchain: HardhatBlockchainInterface,
    config: NodeConfig,
    selectHardfork: (blockNumber: bigint) => string
  ): Promise<EthereumJSAdapter> {
    let stateManager: StateManagerWithAddresses;
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

      stateManager = new DefaultStateManagerWithAddresses({
        trie: stateTrie,
      });

      for (const genesisAccount of config.genesisAccounts) {
        const { address } = makeAccount(genesisAccount);
        stateManager.addresses.add(address.toString());
      }
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

      // If this VM is running without EIP4895, but the block has withdrawals,
      // we remove them and the withdrawal root from the block
      if (
        !this._isEip4895Active(blockContext.header.number) &&
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
            common: this._vm._common,

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
            skipHardForkValidation: true,
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
          await vm.runTx({
            tx: txWithCommon,
            block,
            skipHardForkValidation: true,
          });
        }, config);
      }
      await vm.runTx({ tx: txWithCommon, block, skipHardForkValidation: true });
    }
    throw new TransactionExecutionError(
      `Unable to find a transaction in a block that contains that transaction, this should never happen`
    );
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

  public async makeSnapshot(): Promise<Buffer> {
    return this.getStateRoot();
  }

  public async removeSnapshot(_stateRoot: Buffer): Promise<void> {
    // No way of deleting snapshot
  }

  public getLastTraceAndClear(): {
    trace: MessageTrace | undefined;
    error: Error | undefined;
  } {
    const trace = this._vmTracer.getLastTopLevelMessageTrace();
    const error = this._vmTracer.getLastError();

    this._vmTracer.clearLastError();

    return { trace, error };
  }

  public async printState() {
    const storage: Storage = {};

    for (const address of this._stateManager.addresses) {
      const account = await this._stateManager.getAccount(
        Address.fromString(address)
      );

      const nonce = Number(account.nonce);
      const balance = `0x${account.balance.toString(16).padStart(64, "0")}`;
      const codeHash = `0x${account.codeHash
        .toString("hex")
        .padStart(64, "0")}`;

      const storageRoot = `0x${account.storageRoot
        .toString("hex")
        .padStart(64, "0")}`;

      const accountStorage: Record<string, string> = {};

      if (this._forkBlockNumber === undefined) {
        const dumpedAccountStorage = await this._stateManager.dumpStorage(
          Address.fromString(address)
        );

        for (const [key, value] of Object.entries(dumpedAccountStorage)) {
          accountStorage[`0x${key.padStart(64, "0")}`] = `0x${value.padStart(
            64,
            "0"
          )}`;
        }
      }

      if (
        nonce === 0 &&
        account.balance === 0n &&
        // empty code
        codeHash ===
          "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470" &&
        // empty storage
        storageRoot ===
          "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"
      ) {
        if (Object.entries(accountStorage).length > 0) {
          // sanity check
          throw new Error(
            "Assertion error: storage root is empty but storage has data"
          );
        }

        // we don't add empty accounts
        continue;
      }

      storage[address] = {
        nonce,
        balance,
        code_hash: codeHash,
        storage_root: storageRoot,
        storage: accountStorage,
      };
    }

    const replacer = (_key: any, value: any) =>
      typeof value === "object" && !Array.isArray(value) && value !== null
        ? Object.keys(value)
            .sort()
            .reduce((sorted: any, key: any) => {
              sorted[key] = value[key];
              return sorted;
            }, {})
        : value;

    console.log(JSON.stringify(storage, replacer, 2));
  }

  public async createBlockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter> {
    return HardhatBlockBuilder.create(this, common, opts);
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

  private _isEip4895Active(blockNumberOrPending?: bigint | "pending"): boolean {
    if (
      blockNumberOrPending !== undefined &&
      blockNumberOrPending !== "pending"
    ) {
      return this._vm._common.hardforkGteHardfork(
        this._selectHardfork(blockNumberOrPending),
        "shanghai"
      );
    }
    return this._vm._common.gteHardfork("shanghai");
  }

  private async _beforeMessageHandler(
    message: Message,
    next: any
  ): Promise<void> {
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
  }

  private async _stepHandler(step: InterpreterStep, next: any): Promise<void> {
    try {
      await this._vmTracer.addStep({
        depth: step.depth,
        pc: BigInt(step.pc),
        // opcode: step.opcode.name,
        // returnValue: 0, // Do we have error values in ethereumjs?
        // gasCost: BigInt(step.opcode.fee) + (step.opcode.dynamicFee ?? 0n),
        // gasRefunded: step.gasRefund,
        // gasLeft: step.gasLeft,
        // stack: step.stack,
        // memory: step.memory,
        // contract: {
        //   balance: step.account.balance,
        //   nonce: step.account.nonce,
        //   code: {
        //     hash: step.account.codeHash,
        //     code: Buffer.from([]),
        //   },
        // },
        // contractAddress: step.address.buf,
      });

      return next();
    } catch (e) {
      return next(e);
    }
  }

  private async _afterMessageHandler(
    result: EVMResult,
    next: any
  ): Promise<void> {
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
        },
      });

      return next();
    } catch (e) {
      return next(e);
    }
  }
}
