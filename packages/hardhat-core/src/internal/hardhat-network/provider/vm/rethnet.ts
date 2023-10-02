import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  Account,
  Address,
  KECCAK256_NULL,
  bufferToBigInt,
} from "@nomicfoundation/ethereumjs-util";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Account as RethnetAccount,
  Blockchain,
  Bytecode,
  SpecId,
  guaranteedDryRun,
  run,
  ConfigOptions,
  State,
  IrregularState,
} from "rethnet-evm";

import {
  ethereumjsHeaderDataToRethnetBlockConfig,
  ethereumjsTransactionToRethnetTransactionRequest,
  ethereumsjsHardforkToRethnetSpecId,
  rethnetResultToRunTxResult,
} from "../utils/convertToRethnet";
import { getHardforkName } from "../../../util/hardforks";
import { keccak256 } from "../../../util/keccak";
import { RpcDebugTraceOutput } from "../output";
import { EdrIrregularState } from "../EdrIrregularState";
import { RethnetStateManager } from "../RethnetState";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { MessageTrace } from "../../stack-traces/message-trace";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { RunTxResult, Trace, VMAdapter } from "./vm-adapter";
import { BlockBuilderAdapter, BuildBlockOpts } from "./block-builder";
import { RethnetBlockBuilder } from "./block-builder/rethnet";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

interface Snapshot {
  irregularState: IrregularState;
  state: State;
}

export class RethnetAdapter implements VMAdapter {
  private _vmTracer: VMTracer;

  private _idToSnapshot: Map<number, Snapshot> = new Map();
  private _nextSnapshotId = 0;

  constructor(
    private _blockchain: Blockchain,
    private readonly _irregularState: EdrIrregularState,
    private readonly _state: RethnetStateManager,
    private readonly _common: Common,
    private readonly _limitContractCodeSize: bigint | null
  ) {
    this._vmTracer = new VMTracer(_common, false);
  }

  /**
   * Run `tx` with the given `blockContext`, without modifying the state.
   */
  public async dryRun(
    tx: TypedTransaction,
    blockContext: Block,
    forceBaseFeeZero?: boolean
  ): Promise<[RunTxResult, Trace]> {
    const rethnetTx = ethereumjsTransactionToRethnetTransactionRequest(tx);

    const difficulty = this._getBlockEnvDifficulty(
      blockContext.header.difficulty
    );

    const prevRandao = await this._getBlockPrevRandao(
      blockContext.header.number,
      blockContext.header.mixHash
    );

    const rethnetResult = await guaranteedDryRun(
      this._blockchain,
      this._state.asInner(),
      makeConfigOptions(this._common, true, true, this._limitContractCodeSize),
      rethnetTx,
      {
        number: blockContext.header.number,
        beneficiary: blockContext.header.coinbase.buf,
        timestamp: blockContext.header.timestamp,
        baseFee:
          forceBaseFeeZero === true ? 0n : blockContext.header.baseFeePerGas,
        gasLimit: blockContext.header.gasLimit,
        difficulty,
        mixHash: prevRandao,
      },
      true
    );

    const trace = rethnetResult.trace!;
    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        await this._vmTracer.addStep(traceItem);
      } else if ("executionResult" in traceItem) {
        await this._vmTracer.addAfterMessage(traceItem);
      } else {
        await this._vmTracer.addBeforeMessage(traceItem);
      }
    }

    try {
      const result = rethnetResultToRunTxResult(
        rethnetResult.result,
        blockContext.header.gasUsed + rethnetResult.result.result.gasUsed
      );
      return [result, trace];
    } catch (e) {
      // console.log("Rethnet trace");
      // console.log(rethnetResult.execResult.trace);
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
      ): Promise<RethnetAccount> {
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
      ): Promise<RethnetAccount> {
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

  public async getStateRoot(): Promise<Buffer> {
    return this._state.getStateRoot();
  }

  public async setBlockContext(blockNumber: bigint): Promise<void> {
    const state = await this._blockchain.stateAtBlockNumber(
      blockNumber,
      this._irregularState.asInner()
    );
    this._state.setInner(state);
  }

  public async restoreBlockContext(blockNumber: bigint): Promise<void> {
    await this.setBlockContext(blockNumber);
  }

  /**
   * Must be called after `startBlock`, and before `seal`.
   */
  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]> {
    const rethnetTx = ethereumjsTransactionToRethnetTransactionRequest(tx);

    const difficulty = this._getBlockEnvDifficulty(block.header.difficulty);

    const prevRandao = await this._getBlockPrevRandao(
      block.header.number,
      block.header.mixHash
    );

    const rethnetResult = await run(
      this._blockchain,
      this._state.asInner(),
      makeConfigOptions(this._common, false, true, this._limitContractCodeSize),
      rethnetTx,
      ethereumjsHeaderDataToRethnetBlockConfig(
        block.header,
        difficulty,
        prevRandao
      ),
      true
    );

    const trace = rethnetResult.trace!;
    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        await this._vmTracer.addStep(traceItem);
      } else if ("executionResult" in traceItem) {
        await this._vmTracer.addAfterMessage(traceItem);
      } else {
        await this._vmTracer.addBeforeMessage(traceItem);
      }
    }

    try {
      const result = rethnetResultToRunTxResult(
        rethnetResult.result,
        rethnetResult.result.result.gasUsed
      );
      return [result, this._vmTracer.getLastTopLevelMessageTrace()];
    } catch (e) {
      // console.log("Rethnet trace");
      // console.log(rethnetResult.trace);
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
    throw new Error("traceTransaction not implemented for Rethnet");
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
    return RethnetBlockBuilder.create(
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

  private async _persistIrregularAccount(
    address: Address,
    account: RethnetAccount
  ): Promise<void> {
    const [blockNumber, stateRoot] = await this._persistIrregularState();
    this._irregularState
      .asInner()
      .applyAccountChanges(blockNumber, stateRoot, [[address.buf, account]]);
  }

  private async _persistIrregularStorageSlot(
    address: Address,
    index: bigint,
    oldValue: bigint,
    newValue: bigint,
    account: RethnetAccount | null
  ) {
    const [blockNumber, stateRoot] = await this._persistIrregularState();
    this._irregularState
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

export function makeConfigOptions(
  common: Common,
  disableBlockGasLimit: boolean,
  disableEip3607: boolean,
  limitContractCodeSize: bigint | null
): ConfigOptions {
  return {
    chainId: common.chainId(),
    specId: ethereumsjsHardforkToRethnetSpecId(
      getHardforkName(common.hardfork())
    ),
    limitContractCodeSize: limitContractCodeSize ?? undefined,
    disableBlockGasLimit,
    disableEip3607,
  };
}
