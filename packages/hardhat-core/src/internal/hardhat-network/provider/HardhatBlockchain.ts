import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { BN, zeros } from "ethereumjs-util";

import { BlockchainBase } from "./BlockchainBase";
import { FilterParams } from "./node-types";
import { RpcLogOutput } from "./output";
import { HardhatBlockchainInterface } from "./types/HardhatBlockchainInterface";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class HardhatBlockchain
  extends BlockchainBase
  implements HardhatBlockchainInterface
{
  private _length = 0;

  constructor(common: Common) {
    super(common);
  }

  public getLatestBlockNumber(): BN {
    return new BN(this._length - 1);
  }

  public async addBlock(block: Block): Promise<Block> {
    this._validateBlock(block);
    const totalDifficulty = await this._computeTotalDifficulty(block);
    this._data.addBlock(block, totalDifficulty);
    this._length += 1;
    return block;
  }

  public reserveBlocks(
    count: BN,
    interval: BN,
    previousBlockStateRoot: Buffer,
    previousBlockTotalDifficulty: BN,
    previousBlockBaseFeePerGas: BN | undefined
  ) {
    super.reserveBlocks(
      count,
      interval,
      previousBlockStateRoot,
      previousBlockTotalDifficulty,
      previousBlockBaseFeePerGas
    );
    this._length = this._length + count.toNumber();
  }

  public deleteLaterBlocks(block: Block): void {
    const actual = this._data.getBlockByHash(block.hash());
    if (actual === undefined) {
      throw new Error("Invalid block");
    }

    this._delBlock(actual.header.number.addn(1));
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
    const blockNumber = block.header.number.toNumber();
    const parentHash = block.header.parentHash;
    const parent = this._data.getBlockByNumber(new BN(blockNumber - 1));

    if (this._length !== blockNumber) {
      throw new Error(
        `Invalid block number ${blockNumber}. Expected ${this._length}.`
      );
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

  protected _delBlock(blockNumber: BN): void {
    super._delBlock(blockNumber);
    this._length = blockNumber.toNumber();
  }
}
