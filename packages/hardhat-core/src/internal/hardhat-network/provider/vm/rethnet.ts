import type { Message } from "@nomicfoundation/ethereumjs-evm";
import type { RunTxResult } from "@nomicfoundation/ethereumjs-vm";
import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { StateManager as StateManagerInterface } from "@nomicfoundation/ethereumjs-statemanager";
import {
  Account,
  Address,
  bufferToBigInt,
} from "@nomicfoundation/ethereumjs-util";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { BlockBuilder, Rethnet, StateManager } from "rethnet-evm";

import { NodeConfig } from "../node-types";
import {
  ethereumjsHeaderDataToRethnet,
  ethereumjsTransactionToRethnet,
  rethnetResultToRunTxResult,
} from "../utils/convertToRethnet";
import { RethnetStateManager } from "../RethnetState";
import { hardforkGte, HardforkName } from "../../../util/hardforks";
import { RpcDebugTraceOutput } from "../output";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";

import { Trace, VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class RethnetAdapter implements VMAdapter {
  constructor(
    private _state: StateManager,
    private _rethnet: Rethnet,
    private readonly _selectHardfork: (blockNumber: bigint) => string
  ) {}

  public static async create(
    stateManager: StateManagerInterface,
    config: NodeConfig,
    selectHardfork: (blockNumber: bigint) => string,
    getBlockHash: (blockNumber: bigint) => Promise<Buffer>
  ): Promise<RethnetAdapter> {
    // const hardhatDB = new HardhatDB(stateManager, getBlockHash);

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true ? 2n ** 64n - 1n : undefined;

    const state = RethnetStateManager.withGenesisAccounts(
      config.genesisAccounts
    );

    const rethnet = new Rethnet(state.asInner(), {
      chainId: BigInt(config.chainId),
      limitContractCodeSize,
      disableBlockGasLimit: true,
      disableEip3607: true,
    });

    return new RethnetAdapter(state.asInner(), rethnet, selectHardfork);
  }

  /**
   * Run `tx` with the given `blockContext`, without modifying the state.
   */
  public async dryRun(
    tx: TypedTransaction,
    blockContext: Block,
    forceBaseFeeZero?: boolean
  ): Promise<[RunTxResult, Trace]> {
    const rethnetTx = ethereumjsTransactionToRethnet(tx);

    const difficulty = this._getBlockEnvDifficulty(
      blockContext.header.number,
      blockContext.header.difficulty,
      bufferToBigInt(blockContext.header.mixHash)
    );

    const rethnetResult = await this._rethnet.guaranteedDryRun(rethnetTx, {
      number: blockContext.header.number,
      coinbase: blockContext.header.coinbase.buf,
      timestamp: blockContext.header.timestamp,
      basefee:
        forceBaseFeeZero === true ? 0n : blockContext.header.baseFeePerGas,
      gasLimit: blockContext.header.gasLimit,
      difficulty,
    });

    console.log("rethnet dryRun:", rethnetResult);
    const result = rethnetResultToRunTxResult(rethnetResult.execResult);

    return [result, null];
  }

  /**
   * Get the account info for the given address.
   */
  public async getAccount(address: Address): Promise<Account> {
    throw new Error("not implemented");
  }

  /**
   * Get the storage value at the given address and slot.
   */
  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    throw new Error("not implemented");
  }

  /**
   * Get the contract code at the given address.
   */
  public async getContractCode(address: Address): Promise<Buffer> {
    throw new Error("not implemented");
  }

  /**
   * Update the account info for the given address.
   */
  public async putAccount(address: Address, account: Account): Promise<void> {
    throw new Error("not implemented");
  }

  /**
   * Update the contract code for the given address.
   */
  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    throw new Error("not implemented");
  }

  /**
   * Update the value of the given storage slot.
   */
  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    throw new Error("not implemented");
  }

  /**
   * Get the root of the current state trie.
   */
  public async getStateRoot(): Promise<Buffer> {
    throw new Error("not implemented");
  }

  /**
   * Reset the state trie to the point after `block` was mined. If
   * `irregularStateOrUndefined` is passed, use it as the state root.
   */
  public async setBlockContext(
    block: Block,
    irregularStateOrUndefined: Buffer | undefined
  ): Promise<void> {
    throw new Error("not implemented");
  }

  /**
   * Reset the state trie to the point where it had the given state root.
   *
   * Throw if it can't.
   */
  public async restoreContext(stateRoot: Buffer): Promise<void> {
    throw new Error("not implemented");
  }

  /**
   * Start a new block and accept transactions sent with `runTxInBlock`.
   */
  public async startBlock(): Promise<void> {
    await this._state.checkpoint();
  }

  /**
   * Must be called after `startBlock`, and before `addBlockRewards`.
   */
  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]> {
    const rethnetTx = ethereumjsTransactionToRethnet(tx);

    const difficulty = this._getBlockEnvDifficulty(
      block.header.number,
      block.header.difficulty,
      bufferToBigInt(block.header.mixHash)
    );

    const rethnetResult = await this._rethnet.run(
      rethnetTx,
      ethereumjsHeaderDataToRethnet(block.header, difficulty)
    );

    console.log("rethnet in block:", rethnetResult);

    const result = rethnetResultToRunTxResult(rethnetResult);

    return [result, null];
  }

  /**
   * Must be called after `startBlock` and all `runTxInBlock` calls.
   */
  public async addBlockRewards(
    rewards: Array<[Address, bigint]>
  ): Promise<void> {
    const blockBuilder = await BlockBuilder.new(
      this._state,
      {},
      {
        // Dummy values
        parentHash: Buffer.alloc(32, 0),
        ommersHash: Buffer.alloc(32, 0),
        beneficiary: Buffer.alloc(20, 0),
        stateRoot: Buffer.alloc(32, 0),
        transactionsRoot: Buffer.alloc(32, 0),
        receiptsRoot: Buffer.alloc(32, 0),
        logsBloom: Buffer.alloc(256, 0),
        difficulty: 0n,
        number: 0n,
        gasLimit: 0n,
        gasUsed: 0n,
        timestamp: 0n,
        extraData: Buffer.allocUnsafe(0),
        mixHash: Buffer.alloc(32, 0),
        nonce: 0n,
      },
      {}
    );

    await blockBuilder.finalize(
      rewards.map(([address, reward]) => {
        return [address.buf, reward];
      })
    );
  }

  /**
   * Finish the block successfully. Must be called after `addBlockRewards`.
   */
  public async sealBlock(): Promise<void> {}

  /**
   * Revert the block and discard the changes to the state. Can be called
   * at any point after `startBlock`.
   */
  public async revertBlock(): Promise<void> {
    await this._state.revert();
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
    throw new Error("not implemented");
  }

  /**
   * Start tracing the VM execution with the given callbacks.
   */
  public enableTracing(callbacks: {
    beforeMessage: (message: Message, next: any) => Promise<void>;
    step: () => Promise<void>;
    afterMessage: () => Promise<void>;
  }): void {
    throw new Error("not implemented");
  }

  /**
   * Stop tracing the execution.
   */
  public disableTracing(): void {
    throw new Error("not implemented");
  }

  private _getBlockEnvDifficulty(
    blockNumber: bigint,
    difficulty: bigint | undefined,
    mixHash: bigint | undefined
  ): bigint | undefined {
    const hardfork = this._selectHardfork(blockNumber);
    const isPostMergeHardfork = hardforkGte(
      hardfork as HardforkName,
      HardforkName.MERGE
    );

    if (isPostMergeHardfork) {
      return mixHash;
    }

    return difficulty;
  }
}
