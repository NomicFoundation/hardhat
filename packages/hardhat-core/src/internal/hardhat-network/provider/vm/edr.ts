import type { EVMResult, Message } from "@nomicfoundation/ethereumjs-evm";
import type { MinimalInterpreterStep } from "./proxy-vm";

import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  Account,
  Address,
  bufferToBigInt,
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
  Tracer,
  TracingMessage,
  ExecutionResult,
  IrregularState,
} from "@ignored/edr";

import {
  ethereumjsHeaderDataToEdrBlockConfig,
  ethereumjsTransactionToEdrTransactionRequest,
  ethereumjsTransactionToEdrSignedTransaction,
  hardhatDebugTraceConfigToEdr,
  edrResultToRunTxResult,
  edrRpcDebugTraceToHardhat,
  edrTracingMessageToEthereumjsMessage,
  ethereumjsMessageToEdrTracingMessage,
  edrResultToEthereumjsEvmResult,
  ethereumjsEvmResultToEdrResult,
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
import { EdrIrregularState } from "../EdrIrregularState";
import { RunTxResult, VMAdapter } from "./vm-adapter";
import { BlockBuilderAdapter, BuildBlockOpts } from "./block-builder";
import { EdrBlockBuilder } from "./block-builder/edr";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

interface Snapshot {
  irregularState: IrregularState;
  state: State;
}

export class EdrAdapter implements VMAdapter {
  private _vmTracer: VMTracer;

  private _idToSnapshot: Map<number, Snapshot> = new Map();
  private _nextSnapshotId = 0;

  private _stepListeners: Array<
    (step: MinimalInterpreterStep, next?: any) => Promise<void>
  > = [];
  private _beforeMessageListeners: Array<
    (message: Message, next?: any) => Promise<void>
  > = [];
  private _afterMessageListeners: Array<
    (result: EVMResult, next?: any) => Promise<void>
  > = [];

  constructor(
    private _blockchain: Blockchain,
    private readonly _irregularState: EdrIrregularState,
    private readonly _state: EdrStateManager,
    private readonly _common: Common,
    private readonly _limitContractCodeSize: bigint | undefined,
    private readonly _limitInitcodeSize: bigint | undefined,
    private readonly _enableTransientStorage: boolean
  ) {
    this._vmTracer = new VMTracer(_common, false);
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

        if (storageDiff !== undefined && storage !== undefined) {
          throw new InvalidInputError(
            "The properties 'state' and 'stateDiff' cannot be used simultaneously when configuring the state override set passed to the eth_call method."
          );
        }

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
      true,
      this._tracer()
    );

    const trace = edrResult.trace!;
    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        await this._vmTracer.addStep(traceItem);
      } else if ("executionResult" in traceItem) {
        await this._vmTracer.addAfterMessage(traceItem.executionResult);
      } else {
        await this._vmTracer.addBeforeMessage(traceItem);
      }
    }

    // For solidity-coverage compatibility
    for (const step of this._vmTracer.tracingSteps) {
      for (const listener of this._stepListeners) {
        await listener({
          pc: Number(step.pc),
          depth: step.depth,
          opcode: { name: step.opcode },
          stack: step.stackTop !== undefined ? [step.stackTop] : [],
        });
      }
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
  public async putAccount(
    address: Address,
    account: Account,
    isIrregularChange: boolean = false
  ): Promise<void> {
    const contractCode =
      account.codeHash === KECCAK256_NULL
        ? undefined
        : await this._state.getContractCode(address);

    const modifiedAccount = await this._state.modifyAccount(
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

    if (isIrregularChange === true) {
      await this._persistIrregularAccount(address, modifiedAccount);
    }
  }

  /**
   * Update the contract code for the given address.
   */
  public async putContractCode(
    address: Address,
    value: Buffer,
    isIrregularChange: boolean = false
  ): Promise<void> {
    const codeHash = keccak256(value);
    const modifiedAccount = await this._state.modifyAccount(
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

    if (isIrregularChange === true) {
      await this._persistIrregularAccount(address, modifiedAccount);
    }
  }

  /**
   * Update the value of the given storage slot.
   */
  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer,
    isIrregularChange: boolean = false
  ): Promise<void> {
    const index = bufferToBigInt(key);
    const newValue = bufferToBigInt(value);

    const oldValue = await this._state.putContractStorage(
      address,
      index,
      newValue
    );

    if (isIrregularChange === true) {
      const account = await this._state.getAccount(address);
      await this._persistIrregularStorageSlot(
        address,
        index,
        oldValue,
        newValue,
        account
      );
    }
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
  public async setBlockContext(blockNumber: bigint): Promise<void> {
    const state = await this._blockchain.stateAtBlockNumber(
      blockNumber,
      this._irregularState.asInner()
    );
    this._state.setInner(state);
  }

  /**
   * Reset the state trie to the point where it had the given state root.
   *
   * Throw if it can't.
   */
  public async restoreBlockContext(blockNumber: bigint): Promise<void> {
    await this.setBlockContext(blockNumber);
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
      true,
      this._tracer()
    );

    const trace = edrResult.trace!;
    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        await this._vmTracer.addStep(traceItem);
      } else if ("executionResult" in traceItem) {
        await this._vmTracer.addAfterMessage(traceItem.executionResult);
      } else {
        await this._vmTracer.addBeforeMessage(traceItem);
      }
    }

    // For solidity-coverage compatibility
    for (const step of this._vmTracer.tracingSteps) {
      for (const listener of this._stepListeners) {
        await listener({
          pc: Number(step.pc),
          depth: step.depth,
          opcode: { name: step.opcode },
          stack: step.stackTop !== undefined ? [step.stackTop] : [],
        });
      }
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

  public async revert(): Promise<void> {
    // EDR is stateless, so we don't need to revert anything
  }

  public async makeSnapshot(): Promise<number> {
    const id = this._nextSnapshotId++;
    this._idToSnapshot.set(id, {
      irregularState: await this._irregularState.asInner().deepClone(),
      state: await this._state.asInner().deepClone(),
    });
    return id;
  }

  public async restoreSnapshot(snapshotId: number): Promise<void> {
    const snapshot = this._idToSnapshot.get(snapshotId);
    if (snapshot === undefined) {
      throw new Error(`No snapshot with id ${snapshotId}`);
    }

    this._irregularState.setInner(snapshot.irregularState);
    this._state.setInner(snapshot.state);

    this._idToSnapshot.delete(snapshotId);
  }

  public async removeSnapshot(snapshotId: number): Promise<void> {
    this._idToSnapshot.delete(snapshotId);
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

  public onStep(
    cb: (step: MinimalInterpreterStep, next?: any) => Promise<void>
  ) {
    this._stepListeners.push(cb);
  }

  public onBeforeMessage(cb: (message: Message, next?: any) => Promise<void>) {
    this._beforeMessageListeners.push(cb);
  }

  public onAfterMessage(cb: (result: EVMResult, next?: any) => Promise<void>) {
    this._afterMessageListeners.push(cb);
  }

  private _tracer(): Tracer | undefined {
    if (!this._hasListeners()) {
      return undefined;
    }

    return new Tracer({
      beforeCall: async (tracingMessage: TracingMessage, next: any) => {
        const message = edrTracingMessageToEthereumjsMessage(tracingMessage);

        for (const listener of this._beforeMessageListeners) {
          await listener(message);
        }

        return ethereumjsMessageToEdrTracingMessage(message);
      },
      afterCall: async (result: ExecutionResult, next: any) => {
        const evmResult = edrResultToEthereumjsEvmResult(result);
        for (const listener of this._afterMessageListeners) {
          await listener(evmResult);
        }

        return ethereumjsEvmResultToEdrResult(evmResult);
      },
    });
  }

  private _hasListeners(): boolean {
    return (
      this._beforeMessageListeners.length > 0 ||
      this._afterMessageListeners.length > 0
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
  private async _persistIrregularAccount(
    address: Address,
    account: EdrAccount
  ): Promise<void> {
    const [blockNumber, stateRoot] = await this._persistIrregularState();
    await this._irregularState
      .asInner()
      .applyAccountChanges(blockNumber, stateRoot, [[address.buf, account]]);
  }

  private async _persistIrregularStorageSlot(
    address: Address,
    index: bigint,
    oldValue: bigint,
    newValue: bigint,
    account: EdrAccount | null
  ) {
    const [blockNumber, stateRoot] = await this._persistIrregularState();
    await this._irregularState
      .asInner()
      .applyAccountStorageChange(
        blockNumber,
        stateRoot,
        address.buf,
        index,
        oldValue,
        newValue,
        account
      );
  }

  private async _persistIrregularState(): Promise<[bigint, Buffer]> {
    return Promise.all([
      this._blockchain.lastBlockNumber(),
      this.getStateRoot(),
    ]);
  }
}
