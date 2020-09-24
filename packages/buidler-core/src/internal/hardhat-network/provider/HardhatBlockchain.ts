import { Transaction } from "ethereumjs-tx";
import { BN, bufferToInt, zeros } from "ethereumjs-util";

import { BlockchainData } from "./BlockchainData";
import { FilterParams } from "./node-types";
import { RpcLogOutput, RpcReceiptOutput } from "./output";
import { Block } from "./types/Block";
import { Blockchain } from "./types/Blockchain";
import { PBlockchain, toBlockchain } from "./types/PBlockchain";

/* tslint:disable only-hardhat-error */

export class HardhatBlockchain implements PBlockchain {
  private readonly _data = new BlockchainData();
  private _length = 0;

  public async getLatestBlock(): Promise<Block> {
    const block = this._data.getBlockByNumber(new BN(this._length - 1));
    if (block === undefined) {
      throw new Error("No block available");
    }
    return block;
  }

  public async getBlock(
    blockHashOrNumber: Buffer | BN | number
  ): Promise<Block | undefined> {
    if (typeof blockHashOrNumber === "number") {
      return this._data.getBlockByNumber(new BN(blockHashOrNumber));
    }
    if (BN.isBN(blockHashOrNumber)) {
      return this._data.getBlockByNumber(blockHashOrNumber);
    }
    return this._data.getBlockByHash(blockHashOrNumber);
  }

  public async addBlock(block: Block): Promise<Block> {
    this._validateBlock(block);
    const totalDifficulty = this._computeTotalDifficulty(block);
    this._data.addBlock(block, totalDifficulty);
    this._length += 1;
    return block;
  }

  public deleteBlock(blockHash: Buffer) {
    const block = this._data.getBlockByHash(blockHash);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    this._delBlock(block);
  }

  public deleteLaterBlocks(block: Block): void {
    const actual = this._data.getBlockByHash(block.hash());
    if (actual === undefined) {
      throw new Error("Invalid block");
    }
    const nextBlock = this._data.getBlockByNumber(
      new BN(actual.header.number).addn(1)
    );
    if (nextBlock !== undefined) {
      this._delBlock(nextBlock);
    }
  }

  public async getTotalDifficulty(blockHash: Buffer): Promise<BN> {
    const totalDifficulty = this._data.getTotalDifficulty(blockHash);
    if (totalDifficulty === undefined) {
      throw new Error("Block not found");
    }
    return totalDifficulty;
  }

  public async getTransaction(
    transactionHash: Buffer
  ): Promise<Transaction | undefined> {
    return this.getLocalTransaction(transactionHash);
  }

  public getLocalTransaction(transactionHash: Buffer): Transaction | undefined {
    return this._data.getTransaction(transactionHash);
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined> {
    return this._data.getBlockByTransactionHash(transactionHash);
  }

  public async getTransactionReceipt(transactionHash: Buffer) {
    return this._data.getTransactionReceipt(transactionHash);
  }

  public addTransactionReceipts(receipts: RpcReceiptOutput[]) {
    for (const receipt of receipts) {
      this._data.addTransactionReceipt(receipt);
    }
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    return this._data.getLogs(filterParams);
  }

  public asBlockchain(): Blockchain {
    return toBlockchain(this);
  }

  private _validateBlock(block: Block) {
    const blockNumber = bufferToInt(block.header.number);
    const parentHash = block.header.parentHash;
    const parent = this._data.getBlockByNumber(new BN(blockNumber - 1));

    if (this._length !== blockNumber) {
      throw new Error("Invalid block number");
    }
    if (
      (blockNumber === 0 && !parentHash.equals(zeros(32))) ||
      (blockNumber > 0 &&
        parent !== undefined &&
        !parentHash.equals(parent.hash()))
    ) {
      throw new Error("Invalid parent hash");
    }
  }

  private _computeTotalDifficulty(block: Block): BN {
    const difficulty = new BN(block.header.difficulty);
    if (block.header.parentHash.equals(zeros(32))) {
      return difficulty;
    }
    const parentTD = this._data.getTotalDifficulty(block.header.parentHash);
    if (parentTD === undefined) {
      throw new Error("This should never happen");
    }
    return parentTD.add(difficulty);
  }

  private _delBlock(block: Block): void {
    const blockNumber = bufferToInt(block.header.number);
    for (let i = blockNumber; i < this._length; i++) {
      const current = this._data.getBlockByNumber(new BN(i));
      if (current !== undefined) {
        this._data.removeBlock(current);
      }
    }
    this._length = blockNumber;
  }
}
