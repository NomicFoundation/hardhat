import { BN, bufferToHex, bufferToInt } from "ethereumjs-util";

import { Block } from "./Block";
import { Blockchain } from "./Blockchain";
import { Callback } from "./Callback";
import { PBlockchain } from "./PBlockchain";
import { promisify } from "./promisify";

export class BuidlerBlockchain implements Blockchain {
  private readonly _blocks: Block[] = [];
  private readonly _blockNumberByHash: Map<string, number> = new Map();

  public getLatestBlock(cb: Callback<Block>): void {
    if (this._blocks.length === 0) {
      cb(new Error("No block available"));
    }

    cb(null, this._blocks[this._blocks.length - 1]);
  }

  public putBlock(block: Block, cb: Callback<Block>): void {
    const blockNumber = bufferToInt(block.header.number);

    if (this._blocks.length !== blockNumber) {
      cb(new Error("Invalid block number"));
      return;
    }

    this._blocks.push(block);
    this._blockNumberByHash.set(bufferToHex(block.hash()), blockNumber);

    cb(null, block);
  }

  public delBlock(blockHash: Buffer, cb: Callback): void {
    const blockNumber = this._blockNumberByHash.get(bufferToHex(blockHash));

    if (blockNumber === undefined) {
      cb(new Error("Block not found"));
      return;
    }

    for (let n = blockNumber; n < this._blocks.length; n++) {
      const block = this._blocks[n];

      this._blockNumberByHash.delete(bufferToHex(block.hash()));
    }

    this._blocks.splice(blockNumber);
    cb(null);
  }

  public getBlock(blockHashOrNumber: Buffer | BN, cb: Callback<Block>): void {
    let blockNumber: number;

    if (BN.isBN(blockHashOrNumber)) {
      blockNumber = blockHashOrNumber.toNumber();
    } else {
      const hash = bufferToHex(blockHashOrNumber);

      if (!this._blockNumberByHash.has(hash)) {
        cb(new Error("Block not found"));
        return;
      }

      blockNumber = this._blockNumberByHash.get(hash)!;
    }

    cb(null, this._blocks[blockNumber]);
  }

  public iterator(name: string, onBlock: any, cb: Callback): void {
    let n = 0;

    const iterate = (err?: Error | undefined | null) => {
      if (err !== null && err !== undefined) {
        cb(err);
        return;
      }

      if (n >= this._blocks.length) {
        cb(null);
        return;
      }

      onBlock(this._blocks[n], false, (onBlockErr?: Error | null) => {
        n += 1;
        iterate(onBlockErr);
      });
    };

    iterate(null);
  }

  public getDetails(_: string, cb: Callback): void {
    cb(null);
  }

  public deleteAllFollowingBlocks(block: Block): void {
    const blockNumber = bufferToInt(block.header.number);
    const actualBlock = this._blocks[blockNumber];

    if (actualBlock === undefined || !block.hash().equals(actualBlock.hash())) {
      // tslint:disable-next-line only-buidler-error
      throw new Error("Invalid block");
    }

    for (let i = blockNumber + 1; i < this._blocks.length; i++) {
      const blockToDelete = this._blocks[i];
      this._blockNumberByHash.delete(bufferToHex(blockToDelete.hash()));
    }

    this._blocks.splice(blockNumber + 1);
  }

  public asPBlockchain(): PBlockchain {
    return {
      getBlock: promisify(this.getBlock.bind(this)),
      getLatestBlock: promisify(this.getLatestBlock.bind(this)),
      putBlock: promisify(this.putBlock.bind(this)),
      delBlock: promisify(this.delBlock.bind(this)),
      getDetails: promisify(this.getDetails.bind(this)),
      iterator: promisify(this.iterator.bind(this)),
      deleteAllFollowingBlocks: this.deleteAllFollowingBlocks.bind(this),
    };
  }
}
