import { Transaction } from "ethereumjs-tx";
import { BN } from "ethereumjs-util";
import { callbackify } from "util";

import { Block } from "./Block";
import { Blockchain } from "./Blockchain";
import { Callback } from "./Callback";

export interface PBlockchain {
  getBlock(blockHashOrNumber: Buffer | number | BN): Promise<Block | undefined>;
  getLatestBlock(): Promise<Block>;
  getTransaction(transactionHash: Buffer): Promise<Transaction | undefined>;
  getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined>;
  putBlock(block: Block): Promise<Block>;
  delBlock(blockHash: Buffer): Promise<void>;
  deleteAllFollowingBlocks(block: Block): void;
  getBlockTotalDifficulty(blockHash: Buffer): Promise<BN>;
}

export function toBlockchain(pb: PBlockchain): Blockchain {
  async function getBlock(blockTag: number | Buffer | BN) {
    const block = await pb.getBlock(blockTag);
    if (block === undefined) {
      // tslint:disable-next-line only-buidler-error
      throw new Error("Block not found");
    }
  }
  return {
    getBlock: callbackify(getBlock),
    putBlock: callbackify(pb.putBlock.bind(pb)),
    delBlock: callbackify(pb.delBlock.bind(pb)),
    getDetails,
    iterator,
  };
}

function getDetails(_: string, cb: Callback<void>) {
  cb(null);
}

function iterator() {
  // tslint:disable-next-line only-buidler-error
  throw new Error(".iterator() is not supported");
}
