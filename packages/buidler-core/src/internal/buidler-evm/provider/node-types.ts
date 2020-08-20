import { BN } from "ethereumjs-util";

import { CompilerInput, CompilerOutput } from "../stack-traces/compiler-types";

import { RpcReceiptOutput } from "./output";
import { Block } from "./types/Block";

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
  blockHashToTxReceipts: Map<string, RpcReceiptOutput[]>;
}
