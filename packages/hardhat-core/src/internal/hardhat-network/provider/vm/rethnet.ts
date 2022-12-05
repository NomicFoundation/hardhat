import { Block } from "@nomicfoundation/ethereumjs-block";
import { StateManager } from "@nomicfoundation/ethereumjs-statemanager";
import {
  Account,
  Address,
  bufferToBigInt,
} from "@nomicfoundation/ethereumjs-util";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Rethnet } from "rethnet-evm";

import { NodeConfig } from "../node-types";
import {
  createRethnetFromHardhatDB,
  ethereumjsTransactionToRethnet,
  HardhatDB,
  rethnetResultToRunTxResult,
} from "../utils/convertToRethnet";
import { hardforkGte, HardforkName } from "../../../util/hardforks";
import { RpcDebugTraceOutput } from "../output";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";

import { RunTxResult, Trace, TracingCallbacks, VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class RethnetAdapter implements VMAdapter {
  constructor(
    private _rethnet: Rethnet,
    private readonly _selectHardfork: (blockNumber: bigint) => string
  ) {}

  public static async create(
    stateManager: StateManager,
    config: NodeConfig,
    selectHardfork: (blockNumber: bigint) => string,
    getBlockHash: (blockNumber: bigint) => Promise<Buffer>
  ): Promise<RethnetAdapter> {
    const hardhatDB = new HardhatDB(stateManager, getBlockHash);

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true ? 2n ** 64n - 1n : undefined;

    const rethnet = createRethnetFromHardhatDB(
      {
        chainId: BigInt(config.chainId),
        limitContractCodeSize,
        disableBlockGasLimit: true,
        disableEip3607: true,
      },
      hardhatDB
    );

    return new RethnetAdapter(rethnet, selectHardfork);
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

    await this._rethnet.guaranteeTransaction(rethnetTx);
    const rethnetResult = await this._rethnet.dryRun(rethnetTx, {
      number: blockContext.header.number,
      coinbase: blockContext.header.coinbase.buf,
      timestamp: blockContext.header.timestamp,
      basefee:
        forceBaseFeeZero === true ? 0n : blockContext.header.baseFeePerGas,
      gasLimit: blockContext.header.gasLimit,
      difficulty,
    });

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
    throw new Error("not implemented");
  }

  /**
   * Must be called after `startBlock`, and before `addBlockRewards`.
   */
  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]> {
    throw new Error("not implemented");
  }

  /**
   * Must be called after `startBlock` and all `runTxInBlock` calls.
   */
  public async addBlockRewards(
    rewards: Array<[Address, bigint]>
  ): Promise<void> {
    throw new Error("not implemented");
  }

  /**
   * Finish the block successfully. Must be called after `addBlockRewards`.
   */
  public async sealBlock(): Promise<void> {
    throw new Error("not implemented");
  }

  /**
   * Revert the block and discard the changes to the state. Can be called
   * at any point after `startBlock`.
   */
  public async revertBlock(): Promise<void> {
    throw new Error("not implemented");
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
  public enableTracing(callbacks: TracingCallbacks): void {
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
