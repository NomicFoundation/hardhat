import { Block } from "@nomicfoundation/ethereumjs-block";
import { PartialTrace, RunBlockResult } from "./vm/vm-adapter";

export interface PartialMineBlockResult {
  block: Block;
  blockResult: RunBlockResult;
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
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult>;

  /**
   * Mines `count` blocks with a difference of `interval` seconds between their
   * timestamps.
   *
   * Returns an array with the results of the blocks that were really mined (the
   * ones that were reserved are not included).
   */
  mineBlocks(
    blockTimestamp: bigint,
    minerReward: bigint,
    count: bigint,
    interval: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult[]>;
}
