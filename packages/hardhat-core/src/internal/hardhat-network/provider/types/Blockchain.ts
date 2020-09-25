import { BN } from "ethereumjs-util";

import { Block } from "./Block";
import { Callback } from "./Callback";

export interface Blockchain {
  /**
   * Adds a block to the blockchain.
   *
   * @param block - The block to be added to the blockchain.
   * @param cb - The callback. It is given two parameters `err` and the saved `block`
   */
  putBlock(block: Block, cb: Callback<Block>): void;
  /**
   * Deletes a block from the blockchain. All child blocks in the chain are deleted and any
   * encountered heads are set to the parent block.
   *
   * @param blockHash - The hash of the block to be deleted
   * @param cb - A callback.
   */
  delBlock(blockHash: Buffer, cb: Callback): void;
  /**
   * Returns a block by its hash or number.
   */
  getBlock(blockTag: Buffer | number | BN, cb: Callback<Block>): void;
  /**
   * Iterates through blocks starting at the specified iterator head and calls the onBlock function
   * on each block.
   *
   * @param name - Name of the state root head
   * @param onBlock - Function called on each block with params (block, reorg, cb)
   * @param cb - A callback function
   */
  iterator(name: string, onBlock: any, cb: Callback): void;
  /**
   * This method is only here for backwards compatibility. It can be removed once
   * [this PR](https://github.com/ethereumjs/ethereumjs-block/pull/72/files) gets merged, released,
   * and ethereumjs-block is updated here.
   *
   * The method should just call `cb` with `null` as first argument.
   */
  getDetails(_: string, cb: Callback): void;
}
