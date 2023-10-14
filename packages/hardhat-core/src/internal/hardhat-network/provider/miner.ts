import type { MinimalInterpreterStep } from "./vm/proxy-vm";

import { Block } from "@nomicfoundation/ethereumjs-block";
import type { EVMResult, Message } from "@nomicfoundation/ethereumjs-evm";
import { Address } from "@nomicfoundation/ethereumjs-util";
import { PartialTrace, RunBlockResult } from "./vm/vm-adapter";

export interface PartialMineBlockResult {
  block: Block;
  blockResult: RunBlockResult;
  totalDifficultyAfterBlock: bigint;
  traces: PartialTrace[];
}

export interface BlockMinerAdapter {
  /**
   * Mines a new block with as many pending transactions as possible, adding
   * it to the blockchain.
   *
   * This method reverts any modification to the state manager if it throws.
   */
  mineBlock(
    blockTimestamp: bigint,
    coinbase: Address,
    minGasPrice: bigint,
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult>;

  prevRandaoGeneratorSeed(): Buffer;

  setPrevRandaoGeneratorNextValue(nextValue: Buffer): void;

  onStep(cb: (step: MinimalInterpreterStep, next?: any) => Promise<void>): void;
  onBeforeMessage(cb: (message: Message, next?: any) => Promise<void>): void;
  onAfterMessage(cb: (result: EVMResult, next?: any) => Promise<void>): void;
}
