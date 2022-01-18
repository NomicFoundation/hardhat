import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";

import { BlockchainData } from "./BlockchainData";
import { RpcReceiptOutput } from "./output";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export abstract class BlockchainBase {
  protected readonly _data = new BlockchainData();

  constructor(protected _common: Common) {}

  public abstract addBlock(block: Block): Promise<Block>;

  public addTransactionReceipts(receipts: RpcReceiptOutput[]) {
    for (const receipt of receipts) {
      this._data.addTransactionReceipt(receipt);
    }
  }

  public async delBlock(blockHash: Buffer) {
    this.deleteBlock(blockHash);
  }

  public deleteBlock(blockHash: Buffer) {
    const block = this._data.getBlockByHash(blockHash);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    this._delBlock(block.header.number);
  }

  public async getBaseFee(): Promise<BN> {
    const latestBlock = await this.getLatestBlock();
    return latestBlock.header.calcNextBaseFee();
  }

  public async getBlock(
    blockHashOrNumber: Buffer | BN | number
  ): Promise<Block | null> {
    if (
      (typeof blockHashOrNumber === "number" || BN.isBN(blockHashOrNumber)) &&
      this._data.isReservedBlock(new BN(blockHashOrNumber))
    ) {
      this._data.fulfillBlockReservation(
        new BN(blockHashOrNumber),
        this._common
      );
    }

    if (typeof blockHashOrNumber === "number") {
      return this._data.getBlockByNumber(new BN(blockHashOrNumber)) ?? null;
    }
    if (BN.isBN(blockHashOrNumber)) {
      return this._data.getBlockByNumber(blockHashOrNumber) ?? null;
    }
    return this._data.getBlockByHash(blockHashOrNumber) ?? null;
  }

  public abstract getLatestBlockNumber(): BN;

  public async getLatestBlock(): Promise<Block> {
    const block = await this.getBlock(this.getLatestBlockNumber());
    if (block === null) {
      throw new Error("Block not found");
    }
    return block;
  }

  public getLocalTransaction(
    transactionHash: Buffer
  ): TypedTransaction | undefined {
    return this._data.getTransaction(transactionHash);
  }

  public iterator(
    _name: string,
    _onBlock: (block: Block, reorg: boolean) => void | Promise<void>
  ): Promise<number | void> {
    throw new Error("Method not implemented.");
  }

  public async putBlock(block: Block): Promise<void> {
    await this.addBlock(block);
  }

  public reserveBlocks(count: BN, interval: BN) {
    this._data.reserveBlocks(
      this.getLatestBlockNumber().addn(1),
      count,
      interval,
      this._common
    );
  }

  protected _delBlock(blockNumber: BN): void {
    for (
      let i = blockNumber;
      i.lte(this.getLatestBlockNumber());
      i = i.addn(1)
    ) {
      if (this._data.isReservedBlock(i)) {
        this._data.cancelBlockReservation(i);
      } else {
        const current = this._data.getBlockByNumber(i);
        if (current !== undefined) {
          this._data.removeBlock(current);
        }
      }
    }
  }
}
