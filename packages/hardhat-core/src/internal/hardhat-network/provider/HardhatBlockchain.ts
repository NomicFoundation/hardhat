import { Block } from "@ethereumjs/block";
import { TypedTransaction } from "@ethereumjs/tx";
import { BN, zeros } from "ethereumjs-util";

import { BlockchainData } from "./BlockchainData";
import { FilterParams } from "./node-types";
import { RpcLogOutput, RpcReceiptOutput } from "./output";
import { HardhatBlockchainInterface } from "./types/HardhatBlockchainInterface";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class HardhatBlockchain implements HardhatBlockchainInterface {
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
  ): Promise<Block | null> {
    if (typeof blockHashOrNumber === "number") {
      return this._data.getBlockByNumber(new BN(blockHashOrNumber)) ?? null;
    }
    if (BN.isBN(blockHashOrNumber)) {
      return this._data.getBlockByNumber(blockHashOrNumber) ?? null;
    }
    return this._data.getBlockByHash(blockHashOrNumber) ?? null;
  }

  public async addBlock(block: Block): Promise<Block> {
    this._validateBlock(block);
    const totalDifficulty = this._computeTotalDifficulty(block);
    this._data.addBlock(block, totalDifficulty);
    this._length += 1;
    return block;
  }

  public async putBlock(block: Block): Promise<void> {
    await this.addBlock(block);
  }

  public deleteBlock(blockHash: Buffer) {
    const block = this._data.getBlockByHash(blockHash);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    this._delBlock(block);
  }

  public async delBlock(blockHash: Buffer) {
    this.deleteBlock(blockHash);
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
  ): Promise<TypedTransaction | undefined> {
    return this.getLocalTransaction(transactionHash);
  }

  public getLocalTransaction(
    transactionHash: Buffer
  ): TypedTransaction | undefined {
    return this._data.getTransaction(transactionHash);
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | null> {
    const block = this._data.getBlockByTransactionHash(transactionHash);
    return block ?? null;
  }

  public async getTransactionReceipt(transactionHash: Buffer) {
    return this._data.getTransactionReceipt(transactionHash) ?? null;
  }

  public addTransactionReceipts(receipts: RpcReceiptOutput[]) {
    for (const receipt of receipts) {
      this._data.addTransactionReceipt(receipt);
    }
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    return this._data.getLogs(filterParams);
  }

  public iterator(
    _name: string,
    _onBlock: (block: Block, reorg: boolean) => void | Promise<void>
  ): Promise<number | void> {
    throw new Error("Method not implemented.");
  }

  public async getBaseFee(): Promise<BN> {
    const latestBlock = await this.getLatestBlock();
    return latestBlock.header.calcNextBaseFee();
  }

  private _validateBlock(block: Block) {
    const blockNumber = block.header.number.toNumber();
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
    const blockNumber = block.header.number.toNumber();
    for (let i = blockNumber; i < this._length; i++) {
      const current = this._data.getBlockByNumber(new BN(i));
      if (current !== undefined) {
        this._data.removeBlock(current);
      }
    }
    this._length = blockNumber;
  }
}
