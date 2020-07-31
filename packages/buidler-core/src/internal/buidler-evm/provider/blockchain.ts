import { BN, bufferToHex, bufferToInt } from "ethereumjs-util";

import { BlockchainInterface } from "./BlockchainInterface";
import { Callback } from "./Callback";

export type Block = any;

export class Blockchain implements BlockchainInterface {
  private readonly _blocks: Block[] = [];
  private readonly _blockNumberByHash: Map<string, number> = new Map();

  public getLatestBlock(cb: any): void {
    if (this._blocks.length === 0) {
      cb(new Error("No block available"));
    }

    cb(null, this._blocks[this._blocks.length - 1]);
  }

  public putBlock(block: any, cb: Callback<Block>): void {
    const blockNumber = bufferToInt(block.header.number);

    if (this._blocks.length !== blockNumber) {
      cb(new Error("Invalid block number"), undefined);
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

  public getBlock(
    hashOrBlockNumber: Buffer | BN,
    cb: Callback<Block | undefined>
  ): void {
    let blockNumber: number;

    if (BN.isBN(hashOrBlockNumber)) {
      blockNumber = hashOrBlockNumber.toNumber();
    } else {
      const hash = bufferToHex(hashOrBlockNumber);

      if (!this._blockNumberByHash.has(hash)) {
        cb(new Error("Block not found"), undefined);
        return;
      }

      blockNumber = this._blockNumberByHash.get(hash)!;
    }

    cb(null, this._blocks[blockNumber]);
  }

  public iterator(name: string, onBlock: any, cb: Callback): void {
    let n = 0;

    const iterate = (err?: Error | undefined | null) => {
      if (err !== null || err !== undefined) {
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
}
