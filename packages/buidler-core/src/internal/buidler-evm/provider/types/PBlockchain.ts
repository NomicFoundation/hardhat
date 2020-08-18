import { Transaction } from "ethereumjs-tx";
import { BN } from "ethereumjs-util";

import { Block } from "./Block";

export interface PBlockchain {
  getBlock(blockHashOrNumber: Buffer | number | BN): Promise<Block>;
  getLatestBlock(): Promise<Block>;
  putBlock(block: Block): Promise<Block>;
  delBlock(blockHash: Buffer): Promise<void>;
  getDetails(_: string): Promise<void>;
  iterator(name: string, onBlock: any): Promise<void>;
  deleteAllFollowingBlocks(block: Block): void;
  getBlockTotalDifficulty(blockHash: Buffer): Promise<BN>;
  getTransaction(transactionHash: Buffer): Promise<Transaction>;
}
