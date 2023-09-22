import { Block } from "@nomicfoundation/ethereumjs-block";
import { HardforkName } from "../../util/hardforks";
import { RpcLogOutput, RpcReceiptOutput } from "./output";
import { FilterParams } from "./node-types";

export interface BlockchainAdapter {
  getBlockByHash(hash: Buffer): Promise<Block | undefined>;

  getBlockByNumber(number: bigint): Promise<Block | undefined>;

  getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined>;

  getHardforkAtBlockNumber(
    blockNumberOrPending?: bigint | "pending"
  ): Promise<HardforkName>;

  getLatestBlock(): Promise<Block>;

  getLatestBlockNumber(): Promise<bigint>;

  getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;

  getReceiptByTransactionHash(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | undefined>;

  getTotalDifficultyByHash(hash: Buffer): Promise<bigint | undefined>;

  /**
   * Reserves the specified number of blocks, using the latest block as the blueprint for the new blocks' headers.
   * @param count Number of blocks to reserve
   * @param interval Amount of time between blocks, in seconds. Used for the block's timestamp.
   */
  reserveBlocks(count: bigint, interval: bigint): Promise<void>;

  revertToBlock(blockNumber: bigint): Promise<void>;
}
