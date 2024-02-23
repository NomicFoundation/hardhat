import type { Address } from "@nomicfoundation/ethereumjs-util";

/**
 * These types are minimal versions of the values returned by ethereumjs
 * in the event listeners.
 */

export interface MinimalInterpreterStep {
  pc: number;
  depth: number;
  opcode: {
    name: string;
  };
  stack: bigint[];
}

export interface MinimalExecResult {
  executionGasUsed: bigint;
}

export interface MinimalEVMResult {
  execResult: MinimalExecResult;
}

export interface MinimalMessage {
  to?: Address;
  codeAddress?: Address;
  value: bigint;
  data: Uint8Array;
  caller: Address;
  gasLimit: bigint;
}
