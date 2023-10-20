import type { Block } from "@nomicfoundation/ethereumjs-block";
import type { Common } from "@nomicfoundation/ethereumjs-common";
import type { EVMResult, Message } from "@nomicfoundation/ethereumjs-evm";
import type { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import type { Account, Address } from "@nomicfoundation/ethereumjs-util";
import type { TxReceipt } from "@nomicfoundation/ethereumjs-vm";
import type { StateOverrideSet } from "../../../core/jsonrpc/types/input/callRequest";
import type { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import type { RpcDebugTraceOutput } from "../output";
import type { MinimalInterpreterStep } from "./proxy-vm";

import { MessageTrace } from "../../stack-traces/message-trace";
import { Bloom } from "../utils/bloom";
import { BlockBuilderAdapter, BuildBlockOpts } from "./block-builder";
import { Exit } from "./exit";

export interface PartialTrace {
  trace?: MessageTrace;
  error?: Error;
}

export type Trace = any;

export interface RunTxResult {
  bloom: Bloom;
  createdAddress?: Address;
  gasUsed: bigint;
  returnValue: Buffer;
  exit: Exit;
  receipt: TxReceipt;
}

export interface RunBlockResult {
  results: RunTxResult[];
  receipts: TxReceipt[];
  stateRoot: Buffer;
  logsBloom: Buffer;
  receiptsRoot: Buffer;
  gasUsed: bigint;
}

export interface VMAdapter {
  dryRun(
    tx: TypedTransaction,
    blockNumber: bigint,
    forceBaseFeeZero?: boolean,
    stateOverrideSet?: StateOverrideSet
  ): Promise<RunTxResult>;

  // getters
  getAccount(address: Address): Promise<Account>;
  getContractStorage(address: Address, key: Buffer): Promise<Buffer>;
  getContractCode(address: Address): Promise<Buffer>;

  /**
   * Update the account info for the given address.
   */
  putAccount(
    address: Address,
    account: Account,
    isIrregularChange?: boolean
  ): Promise<void>;

  /**
   * Update the contract code for the given address.
   */
  putContractCode(
    address: Address,
    value: Buffer,
    isIrregularChange?: boolean
  ): Promise<void>;

  /**
   * Update the value of the given storage slot.
   */
  putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer,
    isIrregularChange?: boolean
  ): Promise<void>;

  /**
   * Get the root of the current state trie.
   */
  getStateRoot(): Promise<Buffer>;

  /**
   * Set the state to the point after the block corresponding to the provided
   * block number was mined. If irregular state exists, use it as the state.
   */
  setBlockContext(blockNumber: bigint): Promise<void>;

  /**
   * Restore the state to the point after the block corresponding to the
   * provided block number was mined. If irregular state exists, use it as the
   * state.
   * @param blockNumber the number of the block to restore the state to
   */
  restoreBlockContext(blockNumber: bigint): Promise<void>;

  // methods for block-building
  runTxInBlock(tx: TypedTransaction, block: Block): Promise<RunTxResult>;

  // methods for tracing
  getLastTraceAndClear(): PartialTrace;
  traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput>;
  traceCall(
    tx: TypedTransaction,
    blockNumber: bigint,
    traceConfig: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput>;

  revert(): Promise<void>;

  // methods for snapshotting
  makeSnapshot(): Promise<number>;

  /**
   * Restores the state to the given snapshot, deleting the potential snapshot in the process.
   * @param snapshotId the snapshot to restore
   */
  restoreSnapshot(snapshotId: number): Promise<void>;
  removeSnapshot(snapshotId: number): Promise<void>;

  // for debugging purposes
  printState(): Promise<void>;

  createBlockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter>;

  onStep(cb: (step: MinimalInterpreterStep, next?: any) => Promise<void>): void;
  onBeforeMessage(cb: (message: Message, next?: any) => Promise<void>): void;
  onAfterMessage(cb: (result: EVMResult, next?: any) => Promise<void>): void;
}
