import type { Block } from "@nomicfoundation/ethereumjs-block";
import type { Common } from "@nomicfoundation/ethereumjs-common";
import type { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import type { Account, Address } from "@nomicfoundation/ethereumjs-util";
import type { TxReceipt } from "@nomicfoundation/ethereumjs-vm";
import type { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import type { RpcDebugTraceOutput } from "../output";

import { MessageTrace } from "../../stack-traces/message-trace";
import { Bloom } from "../utils/bloom";
import { Exit } from "./exit";
import { BlockBuilderAdapter, BuildBlockOpts } from "./block-builder";

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
    blockContext: Block,
    forceBaseFeeZero?: boolean
  ): Promise<[RunTxResult, Trace]>;

  // getters
  getAccount(address: Address): Promise<Account>;
  getContractStorage(address: Address, key: Buffer): Promise<Buffer>;
  getContractCode(address: Address): Promise<Buffer>;

  // setters
  putAccount(address: Address, account: Account): Promise<void>;
  putContractCode(address: Address, value: Buffer): Promise<void>;
  putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void>;

  // getters/setters for the whole state
  getStateRoot(): Promise<Buffer>;
  setBlockContext(
    block: Block,
    irregularStateOrUndefined: Buffer | undefined
  ): Promise<void>;
  restoreContext(stateRoot: Buffer): Promise<void>;

  // methods for block-building
  runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]>;

  // methods for tracing
  getLastTraceAndClear(): PartialTrace;
  traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput>;

  // methods for snapshotting
  makeSnapshot(): Promise<Buffer>;
  removeSnapshot(stateRoot: Buffer): Promise<void>;

  // for debugging purposes
  printState(): Promise<void>;

  createBlockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter>;
}
