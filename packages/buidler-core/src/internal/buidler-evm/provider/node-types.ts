import { Transaction } from "ethereumjs-tx";
import { BN } from "ethereumjs-util";

import { CompilerInput, CompilerOutput } from "../stack-traces/compiler-types";

import { Block } from "./Block";
import { RpcLogOutput } from "./output";

export interface GenesisAccount {
  privateKey: string;
  balance: string | number | BN;
}

export interface CallParams {
  to: Buffer;
  from: Buffer;
  gasLimit: BN;
  gasPrice: BN;
  value: BN;
  data: Buffer;
}

export interface TransactionParams {
  to: Buffer;
  from: Buffer;
  gasLimit: BN;
  gasPrice: BN;
  value: BN;
  data: Buffer;
  nonce: BN;
}

export interface FilterParams {
  fromBlock: BN;
  toBlock: BN;
  addresses: Buffer[];
  normalizedTopics: Array<Array<Buffer | null> | null>;
}

export interface TxReceipt {
  status: 0 | 1;
  gasUsed: Buffer;
  bitvector: Buffer;
  logs: RpcLogOutput[];
}

export interface TxBlockResult {
  receipt: TxReceipt;
  createAddresses: Buffer | undefined;
  bloomBitvector: Buffer;
}

export interface SolidityTracerOptions {
  solidityVersion: string;
  compilerInput: CompilerInput;
  compilerOutput: CompilerOutput;
}

export interface Snapshot {
  id: number;
  date: Date;
  latestBlock: Block;
  stateRoot: Buffer;
  blockTimeOffsetSeconds: BN;
  nextBlockTimestamp: BN;
  transactionByHash: Map<string, Transaction>;
  transactionHashToBlockHash: Map<string, string>;
  blockHashToTxBlockResults: Map<string, TxBlockResult[]>;
  blockHashToTotalDifficulty: Map<string, BN>;
}
