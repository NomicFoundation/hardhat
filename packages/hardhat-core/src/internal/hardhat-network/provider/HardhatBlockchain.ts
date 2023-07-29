import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { zeros } from "@nomicfoundation/ethereumjs-util";

import { HardforkName } from "../../util/hardforks";
import { BlockchainBase } from "./BlockchainBase";
import { FilterParams } from "./node-types";
import { RpcLogOutput, RpcReceiptOutput } from "./output";
import { HardhatBlockchainInterface } from "./types/HardhatBlockchainInterface";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class HardhatBlockchain
  extends BlockchainBase
  implements HardhatBlockchainInterface
{
  private _length = 0n;

  constructor(common: Common) {
    super(common);
  }

  public async getLatestBlockNumber(): Promise<bigint> {
    return BigInt(this._length - 1n);
  }

  public async addBlock(block: Block): Promise<Block> {
    this._validateBlock(block);
    const totalDifficulty = await this._computeTotalDifficulty(block);
    this._data.addBlock(block, totalDifficulty);
    this._length += 1n;
    return block;
  }

  public async reserveBlocks(
    count: bigint,
    interval: bigint,
    previousBlockStateRoot: Buffer,
    previousBlockTotalDifficulty: bigint,
    previousBlockBaseFeePerGas: bigint | undefined
  ) {
    await super.reserveBlocks(
      count,
      interval,
      previousBlockStateRoot,
      previousBlockTotalDifficulty,
      previousBlockBaseFeePerGas
    );
    this._length += count;
  }

  public async getTotalDifficultyByHash(blockHash: Buffer): Promise<bigint> {
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

  public async getBlockByHash(hash: Buffer): Promise<Block | undefined> {
    return this._data.getBlockByHash(hash);
  }

  public async getBlockByNumber(number: bigint): Promise<Block | undefined> {
    return this._data.getBlockByNumber(number);
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined> {
    return this._data.getBlockByTransactionHash(transactionHash);
  }

  public async getReceiptByTransactionHash(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | undefined> {
    return this._data.getTransactionReceipt(transactionHash);
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    return this._data.getLogs(filterParams);
  }

  public async blockSupportsHardfork(
    hardfork: HardforkName,
    _blockNumberOrPending?: bigint | "pending"
  ): Promise<boolean> {
    return this._common.gteHardfork(hardfork.toString());
  }

  public async revertToBlock(blockNumber: bigint): Promise<void> {
    const block = this._data.getBlockByNumber(blockNumber);
    if (block === undefined) {
      throw new Error("Invalid block");
    }

    await this._delBlock(blockNumber + 1n);
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

  protected async _delBlock(blockNumber: bigint): Promise<void> {
    await super._delBlock(blockNumber);
    this._length = blockNumber;
  }
}
