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
}
