import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { zeros } from "@nomicfoundation/ethereumjs-util";

import { BlockchainBase } from "./BlockchainBase";
import { FilterParams } from "./node-types";
import { RpcLogOutput } from "./output";
import { HardhatBlockchainInterface } from "./types/HardhatBlockchainInterface";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class HardhatBlockchain
  extends BlockchainBase
  implements HardhatBlockchainInterface
{
  private _length = 0n;

  constructor(common: Common) {
    super(common);
  }

  public getLatestBlockNumber(): bigint {
    return BigInt(this._length - 1n);
  }

  public async addBlock(block: Block): Promise<Block> {
    this._validateBlock(block);
    const totalDifficulty = await this._computeTotalDifficulty(block);
    this._data.addBlock(block, totalDifficulty);
    this._length += 1n;
    return block;
  }

  public reserveBlocks(
    count: bigint,
    interval: bigint,
    previousBlockStateRoot: Buffer,
    previousBlockTotalDifficulty: bigint,
    previousBlockBaseFeePerGas: bigint | undefined
  ) {
    super.reserveBlocks(
      count,
      interval,
      previousBlockStateRoot,
      previousBlockTotalDifficulty,
      previousBlockBaseFeePerGas
    );
    this._length += count;
  }

  public deleteLaterBlocks(block: Block): void {
    const actual = this._data.getBlockByHash(block.hash());
    if (actual === undefined) {
      throw new Error("Invalid block");
    }

    this._delBlock(actual.header.number + 1n);
  }

  public async getTotalDifficulty(blockHash: Buffer): Promise<bigint> {
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

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | null> {
    const block = this._data.getBlockByTransactionHash(transactionHash);
    return block ?? null;
  }

  public async getTransactionReceipt(transactionHash: Buffer) {
    return this._data.getTransactionReceipt(transactionHash) ?? null;
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    return this._data.getLogs(filterParams);
  }

  private _validateBlock(block: Block) {
    const blockNumber = block.header.number;
    const parentHash = block.header.parentHash;
    const parent = this._data.getBlockByNumber(BigInt(blockNumber - 1n));

    if (BigInt(this._length) !== blockNumber) {
      throw new Error(
        `Invalid block number ${blockNumber}. Expected ${this._length}.`
      );
    }

    if (
      (blockNumber === 0n && !parentHash.equals(zeros(32))) ||
      (blockNumber > 0 &&
        parent !== undefined &&
        !parentHash.equals(parent.hash()))
    ) {
      throw new Error("Invalid parent hash");
    }
  }

  protected _delBlock(blockNumber: bigint): void {
    super._delBlock(blockNumber);
    this._length = blockNumber;
  }
}
