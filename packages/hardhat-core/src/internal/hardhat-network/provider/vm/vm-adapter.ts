import type {
  EVMResult,
  InterpreterStep,
  Message,
} from "@nomicfoundation/ethereumjs-evm";
import type { RunTxResult } from "@nomicfoundation/ethereumjs-vm";
import type { Block } from "@nomicfoundation/ethereumjs-block";
import type { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import type { Account, Address } from "@nomicfoundation/ethereumjs-util";
import type { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import type { RpcDebugTraceOutput } from "../output";

export type Trace = any;

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
  putBlock(block: Block): Promise<void>;
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
  startBlock(): Promise<void>;
  runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]>;
  addBlockRewards(rewards: Array<[Address, bigint]>): Promise<void>;
  sealBlock(): Promise<void>;
  revertBlock(): Promise<void>;

  // methods for tracing
  traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput>;
  enableTracing(callbacks: {
    beforeMessage: (message: Message, next: any) => Promise<void>;
    step: (step: InterpreterStep, next: any) => Promise<void>;
    afterMessage: (result: EVMResult, next: any) => Promise<void>;
  }): void;
  disableTracing(): void;
}
