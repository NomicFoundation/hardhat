import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  Account,
  Address,
  KECCAK256_NULL,
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

import { isForkedNodeConfig, NodeConfig } from "../node-types";
import {
  ethereumjsHeaderDataToRethnetBlockConfig,
  ethereumjsTransactionToRethnetTransactionRequest,
  ethereumsjsHardforkToRethnetSpecId,
  rethnetResultToRunTxResult,
} from "../utils/convertToRethnet";
import { getHardforkName } from "../../../util/hardforks";
import { keccak256 } from "../../../util/keccak";
import { RpcDebugTraceOutput } from "../output";
import { RethnetStateManager } from "../RethnetState";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { MessageTrace } from "../../stack-traces/message-trace";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { globalRethnetContext } from "../context/rethnet";
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

  private _irregularState = new IrregularState();
  private _idToSnapshot: Map<number, Snapshot> = new Map();
  private _nextSnapshotId = 0;

  constructor(
    private _blockchain: Blockchain,
    private _state: RethnetStateManager,
    private readonly _common: Common,
    private readonly _limitContractCodeSize: bigint | null
  ) {
    this._vmTracer = new VMTracer(_common, false);
  }

  public static async create(
    config: NodeConfig,
    blockchain: Blockchain,
    common: Common
  ): Promise<RethnetAdapter> {
    let state: RethnetStateManager;
    if (isForkedNodeConfig(config)) {
      state = await RethnetStateManager.forkRemote(
        globalRethnetContext,
        config.forkConfig,
        config.genesisAccounts
      );
    } else {
      state = RethnetStateManager.withGenesisAccounts(
        globalRethnetContext,
        config.genesisAccounts
      );
    }

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true ? 2n ** 64n - 1n : null;

    const adapter = new RethnetAdapter(
      blockchain,
      state,
      common,
      limitContractCodeSize
    );

    // If we're forking and using genesis account, add it as an irregular state
    if (isForkedNodeConfig(config) && config.genesisAccounts.length > 0) {
      await adapter._persistIrregularState();
    }

    return adapter;
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
    isIrregularChange?: boolean
  ): Promise<void> {
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
      await this._persistIrregularState();
    }
  }

  public async putContractCode(
    address: Address,
    value: Buffer,
    isIrregularChange?: boolean
  ): Promise<void> {
    const codeHash = keccak256(value);
    await this._state.modifyAccount(
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
      await this._persistIrregularState();
    }
  }

  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer,
    isIrregularChange?: boolean
  ): Promise<void> {
    await this._state.putContractStorage(address, key, value);

    if (isIrregularChange === true) {
      await this._persistIrregularState();
    }
  }

  public async getStateRoot(): Promise<Buffer> {
    return this._state.getStateRoot();
  }

  public async setBlockContext(blockNumber: bigint): Promise<void> {
    const irregularState = await this._irregularState.stateByBlockNumber(
      blockNumber
    );

    if (irregularState !== null) {
      this._state.setInner(irregularState);
      return;
    }

    const state = await this._blockchain.stateAtBlockNumber(blockNumber);
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
      irregularState: await this._irregularState.deepClone(),
      state: await this._state.asInner().deepClone(),
    });
    return id;
  }

  public async restoreSnapshot(snapshotId: number): Promise<void> {
    const snapshot = this._idToSnapshot.get(snapshotId);
    if (snapshot === undefined) {
      throw new Error(`No snapshot with id ${snapshotId}`);
    }

    this._irregularState = snapshot.irregularState;
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

  private async _persistIrregularState(): Promise<void> {
    const [blockNumber, _stateRoot] = await Promise.all([
      this._blockchain.lastBlockNumber(),
      // Get the state root to ensure that pseudorandom state roots are generated
      // for forked blockchains
      this.getStateRoot(),
    ]);

    await this._irregularState.insertState(blockNumber, this._state.asInner());
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
