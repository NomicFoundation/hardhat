import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex, bufferToInt, zeros } from "ethereumjs-util";

import { Block } from "./types/Block";
import { Blockchain } from "./types/Blockchain";
import { Callback } from "./types/Callback";
import { PBlockchain } from "./types/PBlockchain";
import { promisify } from "./utils/promisify";

// TODO: figure out what errors we wanna throw
/* tslint:disable only-buidler-error */

export class BuidlerBlockchain implements Blockchain {
  private readonly _blocks: Block[] = [];
  private readonly _blockHashToNumber: Map<string, number> = new Map();
  private readonly _blockHashToTotalDifficulty: Map<string, BN> = new Map();
  private readonly _transactions: Map<string, Transaction> = new Map();
  private readonly _transactionHashToBlockHash: Map<string, string> = new Map();

  public getLatestBlock(cb: Callback<Block>): void {
    if (this._blocks.length === 0) {
      cb(new Error("No block available"));
    }

    cb(null, this._blocks[this._blocks.length - 1]);
  }

  public putBlock(block: Block, cb: Callback<Block>): void {
    const blockNumber = bufferToInt(block.header.number);
    const blockHash = bufferToHex(block.hash());
    let totalDifficulty: BN;

    try {
      this._validateBlock(block);
      totalDifficulty = this._computeTotalDifficulty(block);
    } catch (err) {
      cb(err);
      return;
    }

    this._blocks.push(block);
    this._blockHashToNumber.set(blockHash, blockNumber);
    this._blockHashToTotalDifficulty.set(blockHash, totalDifficulty);

    for (const transaction of block.transactions) {
      const hash = bufferToHex(transaction.hash());
      this._transactions.set(hash, transaction);
      this._transactionHashToBlockHash.set(hash, blockHash);
    }

    cb(null, block);
  }

  public delBlock(blockHash: Buffer, cb: Callback): void {
    try {
      this._delBlock(blockHash);
    } catch (err) {
      cb(err);
      return;
    }
    cb(null);
  }

  public getBlock(
    blockHashOrNumber: Buffer | BN | number,
    cb: Callback<Block>
  ): void {
    let blockNumber;

    if (typeof blockHashOrNumber === "number") {
      blockNumber = blockHashOrNumber;
    } else if (BN.isBN(blockHashOrNumber)) {
      blockNumber = blockHashOrNumber.toNumber();
    } else {
      const hash = bufferToHex(blockHashOrNumber);
      blockNumber = this._blockHashToNumber.get(hash);
    }

    if (blockNumber === undefined || blockNumber >= this._blocks.length) {
      cb(new Error("Block not found"));
      return;
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
      throw new Error("Invalid block");
    }

    const nextBlock = this._blocks[blockNumber + 1];
    if (nextBlock !== undefined) {
      this._delBlock(nextBlock.hash());
    }
  }

  public async getBlockTotalDifficulty(blockHash: Buffer): Promise<BN> {
    const totalDifficulty = this._blockHashToTotalDifficulty.get(
      bufferToHex(blockHash)
    );
    if (totalDifficulty === undefined) {
      throw new Error("Block not found");
    }

    return totalDifficulty;
  }

  public async getTransaction(transactionHash: Buffer): Promise<Transaction> {
    const tx = this._transactions.get(bufferToHex(transactionHash));
    if (tx === undefined) {
      throw new Error("Transaction not found");
    }
    return tx;
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
      getBlockTotalDifficulty: this.getBlockTotalDifficulty.bind(this),
      getTransaction: this.getTransaction.bind(this),
    };
  }

  private _validateBlock(block: Block) {
    const blockNumber = bufferToInt(block.header.number);
    const parentHash = block.header.parentHash;

    if (this._blocks.length !== blockNumber) {
      throw new Error("Invalid block number");
    }
    if (
      (blockNumber === 0 && !parentHash.equals(zeros(32))) ||
      (blockNumber > 0 &&
        !parentHash.equals(this._blocks[blockNumber - 1].hash()))
    ) {
      throw new Error("Invalid parent hash");
    }
  }

  private _computeTotalDifficulty(block: Block): BN {
    const difficulty = new BN(block.header.difficulty);
    if (block.header.parentHash.equals(zeros(32))) {
      return difficulty;
    }

    const parentHash = bufferToHex(block.header.parentHash);
    const parentTD = this._blockHashToTotalDifficulty.get(parentHash);
    if (parentTD === undefined) {
      throw new Error("This should never happen");
    }
    return parentTD.add(difficulty);
  }

  private _delBlock(blockHash: Buffer): void {
    const blockNumber = this._blockHashToNumber.get(bufferToHex(blockHash));
    if (blockNumber === undefined) {
      throw new Error("Block not found");
    }

    for (let i = blockNumber; i < this._blocks.length; i++) {
      const block = this._blocks[i];
      this._blockHashToNumber.delete(bufferToHex(block.hash()));
      this._blockHashToTotalDifficulty.delete(bufferToHex(block.hash()));

      for (const transaction of block.transactions) {
        const transactionHash = bufferToHex(transaction.hash());
        this._transactions.delete(transactionHash);
        this._transactionHashToBlockHash.delete(transactionHash);
      }
    }
    this._blocks.splice(blockNumber);
  }
}
