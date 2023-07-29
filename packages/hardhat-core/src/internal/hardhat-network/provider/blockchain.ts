import { Block } from "@nomicfoundation/ethereumjs-block";
import { HardforkName } from "../../util/hardforks";
import { RpcLogOutput, RpcReceiptOutput } from "./output";
import { FilterParams } from "./node-types";

export interface BlockchainAdapter {
  blockSupportsHardfork(
    hardfork: HardforkName,
    blockNumberOrPending?: bigint | "pending"
  ): Promise<boolean>;

  getBlockByHash(hash: Buffer): Promise<Block | undefined>;

  getBlockByNumber(number: bigint): Promise<Block | undefined>;

  getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined>;

  getLatestBlock(): Promise<Block>;

  getLatestBlockNumber(): Promise<bigint>;

  getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]>;

  getReceiptByTransactionHash(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | undefined>;

  getTotalDifficultyByHash(hash: Buffer): Promise<bigint | undefined>;

  revertToBlock(blockNumber: bigint): Promise<void>;
}
