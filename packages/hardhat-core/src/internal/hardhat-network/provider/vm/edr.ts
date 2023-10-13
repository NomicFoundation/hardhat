import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { InterpreterStep } from "@nomicfoundation/ethereumjs-evm";
import {
  Account,
  Address,
  bufferToBigInt,
  AsyncEventEmitter,
  KECCAK256_NULL,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Account as EdrAccount,
  Blockchain,
  Bytecode,
  SpecId,
  guaranteedDryRun,
  debugTraceTransaction,
  debugTraceCall,
  run,
  ConfigOptions,
  State,
  PendingTransaction,
  StateOverrides,
  AccountOverride,
} from "@ignored/edr";

import { isForkedNodeConfig, NodeConfig } from "../node-types";
import {
  ethereumjsHeaderDataToEdrBlockConfig,
  ethereumjsTransactionToEdrTransactionRequest,
  ethereumjsTransactionToEdrSignedTransaction,
  hardhatDebugTraceConfigToEdr,
  edrResultToRunTxResult,
  edrRpcDebugTraceToHardhat,
} from "../utils/convertToEdr";
import { keccak256 } from "../../../util/keccak";
import { RpcDebugTraceOutput } from "../output";
import { EdrStateManager } from "../EdrState";
import { assertHardhatInvariant } from "../../../core/errors";
import { StateOverrideSet } from "../../../core/jsonrpc/types/input/callRequest";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { InvalidInputError } from "../../../core/providers/errors";
import { MessageTrace } from "../../stack-traces/message-trace";
import { VMTracer } from "../../stack-traces/vm-tracer";

import {
  globalEdrContext,
  UNLIMITED_CONTRACT_SIZE_VALUE,
} from "../context/edr";
import { RunTxResult, VMAdapter } from "./vm-adapter";
import { BlockBuilderAdapter, BuildBlockOpts } from "./block-builder";
import { EdrBlockBuilder } from "./block-builder/edr";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class EdrAdapter implements VMAdapter {
  private _vmTracer: VMTracer;
  private _stateRootToState: Map<Buffer, State> = new Map();

  constructor(
    private _blockchain: Blockchain,
    private _state: EdrStateManager,
    private readonly _common: Common,
    private readonly _limitContractCodeSize: bigint | undefined,
    private readonly _limitInitcodeSize: bigint | undefined,
    private readonly _enableTransientStorage: boolean,
    // For solidity-coverage compatibility. Name cannot be changed.
    private _vm: VMStub
  ) {
    this._vmTracer = new VMTracer(_common, false);
  }

  public static async create(
    config: NodeConfig,
    blockchain: Blockchain,
    common: Common
  ): Promise<EdrAdapter> {
    let state: EdrStateManager;
    if (isForkedNodeConfig(config)) {
      state = await EdrStateManager.forkRemote(
        globalEdrContext,
        config.forkConfig,
        config.genesisAccounts
      );
    } else {
      state = EdrStateManager.withGenesisAccounts(
        globalEdrContext,
        config.genesisAccounts
      );
    }

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true
        ? UNLIMITED_CONTRACT_SIZE_VALUE
        : undefined;

    const limitInitcodeSize =
      config.allowUnlimitedContractSize === true
        ? UNLIMITED_CONTRACT_SIZE_VALUE
        : undefined;

    const vmStub: VMStub = {
      evm: {
        events: new AsyncEventEmitter(),
      },
    };

    return new EdrAdapter(
      blockchain,
      state,
      common,
      limitContractCodeSize,
      limitInitcodeSize,
      config.enableTransientStorage,
      vmStub
    );
  }

  /**
   * Run `tx` with the given `blockContext`, without modifying the state.
   */
  public async dryRun(
    tx: TypedTransaction,
    blockNumber: bigint,
    forceBaseFeeZero?: boolean,
    stateOverrideSet: StateOverrideSet = {}
  ): Promise<RunTxResult> {
    // We know that this block number exists, because otherwise
    // there would be an error in the RPC layer.
    const blockContext = await this._blockchain.blockByNumber(blockNumber);
    assertHardhatInvariant(
      blockContext !== null,
      "Tried to run a tx in the context of a non-existent block"
    );

    // we don't need to add the tx to the block because runTx doesn't
    // know anything about the txs in the current block

    const edrTx = ethereumjsTransactionToEdrTransactionRequest(tx);

    const difficulty = this._getBlockEnvDifficulty(
      blockContext.header.difficulty
    );

    const prevRandao = await this._getBlockPrevRandao(
      blockContext.header.number,
      blockContext.header.mixHash
    );

    const specId = await this._blockchain.specAtBlockNumber(
      blockContext.header.number
    );
    const config: ConfigOptions = {
      chainId: this._common.chainId(),
      // Enable Cancun if transient storage is enabled
      specId: this._enableTransientStorage ? SpecId.Cancun : specId,
      limitContractCodeSize: this._limitContractCodeSize,
      limitInitcodeSize: this._limitInitcodeSize,
      disableBlockGasLimit: true,
      disableEip3607: true,
    };

    const MAX_NONCE = 2n ** 64n - 1n;
    const MAX_BALANCE = 2n ** 256n - 1n;
    const overrides = new StateOverrides(
      Object.entries(stateOverrideSet).map(([address, account]) => {
        if (account.nonce !== undefined && account.nonce > MAX_NONCE) {
          throw new InvalidInputError(
            `The 'nonce' property should occupy a maximum of 8 bytes (nonce=${account.nonce}).`
          );
        }

        if (account.balance !== undefined && account.balance > MAX_BALANCE) {
          throw new InvalidInputError(
            `The 'balance' property should occupy a maximum of 32 bytes (balance=${account.balance}).`
          );
        }

        const storage =
          account.state !== undefined
            ? Object.entries(account.state).map(([key, value]) => {
                const index = bufferToBigInt(toBuffer(key));
                const number = bufferToBigInt(toBuffer(value));

                return {
                  index,
                  value: number,
                };
              })
            : undefined;

        const storageDiff =
          account.stateDiff !== undefined
            ? Object.entries(account.stateDiff).map(([key, value]) => {
                const index = bufferToBigInt(toBuffer(key));
                const number = bufferToBigInt(toBuffer(value));

                return {
                  index,
                  value: number,
                };
              })
            : undefined;

        const accountOverride: AccountOverride = {
          balance: account.balance,
          nonce: account.nonce,
          code: account.code,
          storage,
          storageDiff,
        };

        return [toBuffer(address), accountOverride];
      })
    );

    const edrResult = await guaranteedDryRun(
      this._blockchain,
      this._state.asInner(),
      overrides,
      config,
      edrTx,
      {
        number: blockContext.header.number,
        beneficiary: blockContext.header.beneficiary,
        timestamp: blockContext.header.timestamp,
        baseFee:
          forceBaseFeeZero === true ? 0n : blockContext.header.baseFeePerGas,
        gasLimit: blockContext.header.gasLimit,
        difficulty,
        mixHash: prevRandao,
        blobExcessGas: blockContext.header.blobGas?.excessGas,
      },
      true
    );

    const trace = edrResult.trace!;
    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        // TODO: these "as any" shouldn't be necessary, we had
        // to add them after merging the changes in main
        await this._vmTracer.addStep(traceItem as any);
      } else if ("executionResult" in traceItem) {
        await this._vmTracer.addAfterMessage(traceItem as any);
      } else {
        await this._vmTracer.addBeforeMessage(traceItem as any);
      }
    }

    // For solidity-coverage compatibility
    for (const step of this._vmTracer.tracingSteps) {
      this._vm.evm.events.emit("step", {
        pc: Number(step.pc),
        depth: step.depth,
        opcode: { name: step.opcode },
        stackTop: step.stackTop,
      });
    }

    try {
      const result = edrResultToRunTxResult(
        edrResult.result,
        blockContext.header.gasUsed + edrResult.result.result.gasUsed
      );
      return result;
    } catch (e) {
      // console.log("EDR trace");
      // console.log(edrResult.execResult.trace);
      throw e;
    }
  }

  /**
   * Get the account info for the given address.
   */
  public async getAccount(address: Address): Promise<Account> {
    const [accountInfo, storageRoot] = await Promise.all([
      this._state.getAccount(address),
      this._state.getAccountStorageRoot(address),
    ]);
    return new Account(
      accountInfo?.nonce,
      accountInfo?.balance,
      storageRoot ?? undefined,
      accountInfo?.code?.hash
    );
  }

  /**
   * Get the storage value at the given address and slot.
   */
  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    return this._state.getContractStorage(address, key);
  }

  /**
   * Get the contract code at the given address.
   */
  public async getContractCode(address: Address): Promise<Buffer> {
    return this._state.getContractCode(address);
  }

  /**
   * Update the account info for the given address.
   */
  public async putAccount(address: Address, account: Account): Promise<void> {
    const contractCode =
      account.codeHash === KECCAK256_NULL
        ? undefined
        : await this._state.getContractCode(address);

    await this._state.modifyAccount(
      address,
      async function (
        balance: bigint,
        nonce: bigint,
        code: Bytecode | undefined
      ): Promise<EdrAccount> {
        const newCode: Bytecode | undefined =
          account.codeHash === KECCAK256_NULL
            ? undefined
            : account.codeHash === code?.hash
            ? code
            : {
                hash: account.codeHash,
                code: contractCode!,
              };

        return {
          balance: account.balance,
          nonce: account.nonce,
          code: newCode,
        };
      }
    );

    this._stateRootToState.set(
      await this.getStateRoot(),
      await this._state.asInner().deepClone()
    );
  }

  /**
   * Update the contract code for the given address.
   */
  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    const codeHash = keccak256(value);
    await this._state.modifyAccount(
      address,
      async function (
        balance: bigint,
        nonce: bigint,
        code: Bytecode | undefined
      ): Promise<EdrAccount> {
        const newCode: Bytecode | undefined =
          codeHash === KECCAK256_NULL
            ? undefined
            : codeHash === code?.hash
            ? code
            : {
                hash: codeHash,
                code: value,
              };

        return {
          balance,
          nonce,
          code: newCode,
        };
      }
    );

    this._stateRootToState.set(
      await this.getStateRoot(),
      await this._state.asInner().deepClone()
    );
  }

  /**
   * Update the value of the given storage slot.
   */
  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    await this._state.putContractStorage(address, key, value);

    this._stateRootToState.set(
      await this.getStateRoot(),
      await this._state.asInner().deepClone()
    );
  }

  /**
   * Get the root of the current state trie.
   */
  public async getStateRoot(): Promise<Buffer> {
    return this._state.getStateRoot();
  }

  /**
   * Reset the state trie to the point after `block` was mined. If
   * `irregularStateOrUndefined` is passed, use it as the state root.
   */
  public async setBlockContext(
    block: Block,
    irregularStateOrUndefined: Buffer | undefined
  ): Promise<void> {
    if (irregularStateOrUndefined !== undefined) {
      const state = this._stateRootToState.get(irregularStateOrUndefined);
      if (state === undefined) {
        throw new Error("Unknown state root");
      }
      this._state.setInner(await state.deepClone());
    } else {
      this._state.setInner(
        await this._blockchain.stateAtBlockNumber(block.header.number)
      );
    }
  }

  /**
   * Reset the state trie to the point where it had the given state root.
   *
   * Throw if it can't.
   */
  public async restoreContext(stateRoot: Buffer): Promise<void> {
    const state = this._stateRootToState.get(stateRoot);
    if (state === undefined) {
      throw new Error("Unknown state root");
    }

    this._state.setInner(state);
  }

  /**
   * Must be called after `startBlock`, and before `seal`.
   */
  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<RunTxResult> {
    const edrTx = ethereumjsTransactionToEdrTransactionRequest(tx);

    const difficulty = this._getBlockEnvDifficulty(block.header.difficulty);

    const prevRandao = await this._getBlockPrevRandao(
      block.header.number,
      block.header.mixHash
    );

    const specId = await this._blockchain.specAtBlockNumber(
      block.header.number
    );
    const config: ConfigOptions = {
      chainId: this._common.chainId(),
      specId,
      limitContractCodeSize: this._limitContractCodeSize,
      disableBlockGasLimit: false,
      disableEip3607: true,
    };

    const edrResult = await run(
      this._blockchain,
      this._state.asInner(),
      config,
      edrTx,
      ethereumjsHeaderDataToEdrBlockConfig(
        block.header,
        difficulty,
        prevRandao
      ),
      true
    );

    const trace = edrResult.trace!;
    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        await this._vmTracer.addStep(traceItem);
      } else if ("executionResult" in traceItem) {
        await this._vmTracer.addAfterMessage(traceItem);
      } else {
        await this._vmTracer.addBeforeMessage(traceItem);
      }
    }

    // For solidity-coverage compatibility
    for (const step of this._vmTracer.tracingSteps) {
      this._vm.evm.events.emit("step", {
        pc: Number(step.pc),
        depth: step.depth,
        opcode: { name: step.opcode },
        stackTop: step.stackTop,
      });
    }

    try {
      const result = edrResultToRunTxResult(
        edrResult.result,
        edrResult.result.result.gasUsed
      );
      return result;
    } catch (e) {
      // console.log("EDR trace");
      // console.log(edrResult.trace);
      throw e;
    }
  }

  /**
   * Re-execute the transactions in the block up until the transaction with the
   * given hash, and trace the execution of that transaction.
   */
  public async traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    const difficulty = this._getBlockEnvDifficulty(block.header.difficulty);

    const prevRandao = await this._getBlockPrevRandao(
      block.header.number,
      block.header.mixHash
    );

    const specId = await this._blockchain.specAtBlockNumber(
      block.header.number
    );
    const evmConfig: ConfigOptions = {
      chainId: this._common.chainId(),
      // Enable Cancun if transient storage is enabled
      specId: this._enableTransientStorage ? SpecId.Cancun : specId,
      limitContractCodeSize: this._limitContractCodeSize,
      disableBlockGasLimit: false,
      disableEip3607: true,
    };

    // TODO This deadlocks if more than 3 are executed in parallel
    // https://github.com/NomicFoundation/edr/issues/189
    const transactions = [];
    for (const tx of block.transactions) {
      const caller = tx.getSenderAddress().toBuffer();
      const pendingTx = await PendingTransaction.create(
        this._state.asInner(),
        evmConfig.specId!,
        ethereumjsTransactionToEdrSignedTransaction(tx),
        caller
      );
      transactions.push(pendingTx);
    }

    const result = await debugTraceTransaction(
      this._blockchain,
      this._state.asInner(),
      evmConfig,
      hardhatDebugTraceConfigToEdr(config),
      ethereumjsHeaderDataToEdrBlockConfig(
        block.header,
        difficulty,
        prevRandao
      ),
      transactions,
      hash
    );

    return edrRpcDebugTraceToHardhat(result);
  }

  public async traceCall(
    tx: TypedTransaction,
    blockNumber: bigint,
    traceConfig: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    // We know that this block number exists, because otherwise
    // there would be an error in the RPC layer.
    const blockContext = await this._blockchain.blockByNumber(blockNumber);
    assertHardhatInvariant(
      blockContext !== null,
      "Tried to run a tx in the context of a non-existent block"
    );

    // we don't need to add the tx to the block because runTx doesn't
    // know anything about the txs in the current block

    const edrTx = ethereumjsTransactionToEdrTransactionRequest(tx);

    const difficulty = this._getBlockEnvDifficulty(
      blockContext.header.difficulty
    );

    const prevRandao = await this._getBlockPrevRandao(
      blockContext.header.number,
      blockContext.header.mixHash
    );

    const specId = await this._blockchain.specAtBlockNumber(
      blockContext.header.number
    );
    const evmConfig: ConfigOptions = {
      chainId: this._common.chainId(),
      specId,
      limitContractCodeSize: this._limitContractCodeSize,
      disableBlockGasLimit: true,
      disableEip3607: true,
    };

    const result = await debugTraceCall(
      this._blockchain,
      this._state.asInner(),
      evmConfig,
      hardhatDebugTraceConfigToEdr(traceConfig),
      {
        number: blockContext.header.number,
        beneficiary: blockContext.header.beneficiary,
        timestamp: blockContext.header.timestamp,
        baseFee: 0n,
        gasLimit: blockContext.header.gasLimit,
        difficulty,
        mixHash: prevRandao,
      },
      edrTx
    );

    return edrRpcDebugTraceToHardhat(result);
  }

  public async makeSnapshot(): Promise<Buffer> {
    const stateRoot = await this.getStateRoot();
    this._stateRootToState.set(
      stateRoot,
      await this._state.asInner().deepClone()
    );

    return stateRoot;
  }

  public async removeSnapshot(stateRoot: Buffer): Promise<void> {
    this._stateRootToState.delete(stateRoot);
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
    console.log(await this._state.serialize());
  }

  public async createBlockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter> {
    return EdrBlockBuilder.create(
      this._blockchain,
      this._state,
      this._vmTracer,
      common,
      opts,
      this._limitContractCodeSize
    );
  }

  private _getBlockEnvDifficulty(
    difficulty: bigint | undefined
  ): bigint | undefined {
    const MAX_DIFFICULTY = 2n ** 32n - 1n;
    if (difficulty !== undefined && difficulty > MAX_DIFFICULTY) {
      console.warn(
        "Difficulty is larger than U256::max:",
        difficulty.toString(16)
      );
      return MAX_DIFFICULTY;
    }

    return difficulty;
  }

  private async _getBlockPrevRandao(
    blockNumber: bigint,
    mixHash: Buffer | undefined
  ): Promise<Buffer | undefined> {
    const isPostMergeHardfork =
      (await this._blockchain.specAtBlockNumber(blockNumber)) >= SpecId.Merge;

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (isPostMergeHardfork) {
      if (mixHash === undefined) {
        throw new Error("mixHash must be set for post-merge hardfork");
      }

      return mixHash;
    }

    return undefined;
  }
}

type InterpreterStepStub = Pick<InterpreterStep, "pc" | "depth"> & {
  opcode: { name: string };
  stackTop?: bigint;
};

interface EVMStub {
  events: AsyncEventEmitter<{
    step: (data: InterpreterStepStub, resolve?: (result?: any) => void) => void;
  }>;
}

// For compatibility with solidity-coverage that attaches a listener to the step event.
export interface VMStub {
  evm: EVMStub;
}
