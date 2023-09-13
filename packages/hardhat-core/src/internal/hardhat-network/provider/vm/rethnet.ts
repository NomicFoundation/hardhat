import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  Account,
  Address,
  KECCAK256_NULL,
} from "@nomicfoundation/ethereumjs-util";
import { Capability, TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Account as RethnetAccount,
  Blockchain,
  Bytecode,
  RethnetContext,
  guaranteedDryRun,
  run,
  ConfigOptions,
} from "rethnet-evm";

import { isForkedNodeConfig, NodeConfig } from "../node-types";
import {
  ethereumjsHeaderDataToRethnetBlockConfig,
  ethereumjsTransactionToRethnetTransactionRequest,
  ethereumsjsHardforkToRethnet,
  rethnetResultToRunTxResult,
} from "../utils/convertToRethnet";
import {
  getHardforkName,
  hardforkGte,
  HardforkName,
} from "../../../util/hardforks";
import { keccak256 } from "../../../util/keccak";
import { RpcDebugTraceOutput } from "../output";
import { RethnetStateManager } from "../RethnetState";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { MessageTrace } from "../../stack-traces/message-trace";
import { VMTracer } from "../../stack-traces/vm-tracer";

import { RunTxResult, Trace, VMAdapter } from "./vm-adapter";
import { BlockBuilderAdapter, BuildBlockOpts } from "./block-builder";
import { RethnetBlockBuilder } from "./block-builder/rethnet";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

export const globalRethnetContext = new RethnetContext();

export class RethnetAdapter implements VMAdapter {
  private _vmTracer: VMTracer;
  private _stateRootToState: Map<Buffer, RethnetStateManager> = new Map();
  private _stateRootToSnapshot: Map<Buffer, RethnetStateManager> = new Map();

  constructor(
    private _blockchain: Blockchain,
    private _state: RethnetStateManager,
    private readonly _selectHardfork: (blockNumber: bigint) => string,
    private readonly _common: Common,
    private readonly _limitContractCodeSize: bigint | null
  ) {
    this._vmTracer = new VMTracer(_common, false);
  }

  public static async create(
    config: NodeConfig,
    selectHardfork: (blockNumber: bigint) => string,
    getBlockHash: (blockNumber: bigint) => Promise<Buffer>,
    common: Common
  ): Promise<RethnetAdapter> {
    const blockchain = new Blockchain(globalRethnetContext, getBlockHash);

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

    return new RethnetAdapter(
      blockchain,
      state,
      selectHardfork,
      common,
      limitContractCodeSize
    );
  }

  /**
   * Run `tx` with the given `blockContext`, without modifying the state.
   */
  public async dryRun(
    tx: TypedTransaction,
    blockContext: Block,
    forceBaseFeeZero?: boolean
  ): Promise<[RunTxResult, Trace]> {
    if (
      tx.supports(Capability.EIP1559FeeMarket) &&
      !blockContext._common.hardforkGteHardfork(
        this._selectHardfork(blockContext.header.number),
        "london"
      )
    ) {
      throw new Error("Cannot run transaction: EIP 1559 is not activated.");
    }

    const rethnetTx = ethereumjsTransactionToRethnetTransactionRequest(tx);

    const difficulty = this._getBlockEnvDifficulty(
      blockContext.header.difficulty
    );

    const prevRandao = this._getBlockPrevRandao(
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
        blockContext.header.gasUsed
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

  /**
   * Update the account info for the given address.
   */
  public async putAccount(address: Address, account: Account): Promise<void> {
    const contractCode =
      account.codeHash === KECCAK256_NULL
        ? undefined
        : await this._state.getContractCode(address);

    return this._state.modifyAccount(
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
  }

  /**
   * Update the contract code for the given address.
   */
  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    const codeHash = keccak256(value);
    return this._state.modifyAccount(
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
      const state = this._stateRootToSnapshot.get(irregularStateOrUndefined);
      if (state === undefined) {
        throw new Error("Unknown state root");
      }
      this._state = state;
    }

    this._stateRootToState.set(
      block.header.stateRoot,
      await this._state.deepClone()
    );

    this._state.setInner(
      await this._blockchain.stateAtBlock(block.header.number)
    );
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

    this._state = state;
  }

  /**
   * Must be called after `startBlock`, and before `seal`.
   */
  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]> {
    if (
      tx.supports(Capability.EIP1559FeeMarket) &&
      !block._common.hardforkGteHardfork(
        this._selectHardfork(block.header.number),
        "london"
      )
    ) {
      throw new Error("Cannot run transaction: EIP 1559 is not activated.");
    }

    const rethnetTx = ethereumjsTransactionToRethnetTransactionRequest(tx);

    const difficulty = this._getBlockEnvDifficulty(block.header.difficulty);

    const prevRandao = this._getBlockPrevRandao(
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
        block.header.gasUsed
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

  public async makeSnapshot(): Promise<Buffer> {
    const stateRoot = await this._state.getStateRoot();
    this._stateRootToSnapshot.set(stateRoot, this._state);

    return stateRoot;
  }

  public async removeSnapshot(stateRoot: Buffer): Promise<void> {
    this._stateRootToSnapshot.delete(stateRoot);
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

  private _getBlockPrevRandao(
    blockNumber: bigint,
    mixHash: Buffer | undefined
  ): Buffer | undefined {
    const hardfork = this._selectHardfork(blockNumber);
    const isPostMergeHardfork = hardforkGte(
      hardfork as HardforkName,
      HardforkName.MERGE
    );

    if (isPostMergeHardfork) {
      if (mixHash === undefined) {
        throw new Error("mixHash must be set for post-merge hardfork");
      }

      return mixHash;
    }

    return undefined;
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
    specId: ethereumsjsHardforkToRethnet(getHardforkName(common.hardfork())),
    limitContractCodeSize: limitContractCodeSize ?? undefined,
    disableBlockGasLimit,
    disableEip3607,
  };
}
