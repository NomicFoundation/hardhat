import { Block, BlockHeader } from "@ethereumjs/block";
import {
  BlockchainInterface,
  CasperConsensus,
  CliqueConsensus,
  Consensus,
  EthashConsensus,
} from "@ethereumjs/blockchain";
import { Common, ConsensusAlgorithm } from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";

import { assertHardhatInvariant } from "../../core/errors";
import { BigIntUtils } from "../../util/bigint";
import { BlockchainData } from "./BlockchainData";
import { RpcReceiptOutput } from "./output";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export abstract class BlockchainBase {
  protected readonly _data: BlockchainData;

  constructor(protected _common: Common) {
    this._data = new BlockchainData(_common);
  }

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

  public async getBlock(
    blockHashOrNumber: Buffer | bigint | number
  ): Promise<Block | null> {
    if (
      (typeof blockHashOrNumber === "number" || BN.isBN(blockHashOrNumber)) &&
      this._data.isReservedBlock(new BN(blockHashOrNumber))
    ) {
      this._data.fulfillBlockReservation(BigInt(blockHashOrNumber));
    }

    if (typeof blockHashOrNumber === "number") {
      return this._data.getBlockByNumber(BigInt(blockHashOrNumber)) ?? null;
    }
    if (BigIntUtils.isBigInt(blockHashOrNumber)) {
      return this._data.getBlockByNumber(blockHashOrNumber) ?? null;
    }
    return this._data.getBlockByHash(blockHashOrNumber) ?? null;
  }

  public abstract getLatestBlockNumber(): bigint;

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

  public reserveBlocks(
    count: bigint,
    interval: bigint,
    previousBlockStateRoot: Buffer,
    previousBlockTotalDifficulty: bigint,
    previousBlockBaseFeePerGas: bigint | undefined
  ) {
    this._data.reserveBlocks(
      this.getLatestBlockNumber() + 1n,
      count,
      interval,
      previousBlockStateRoot,
      previousBlockTotalDifficulty,
      previousBlockBaseFeePerGas
    );
  }

  protected _delBlock(blockNumber: BN): void {
    let i = blockNumber;

    while (i.lte(this.getLatestBlockNumber())) {
      if (this._data.isReservedBlock(i)) {
        const reservation = this._data.cancelReservationWithBlock(i);
        i = reservation.last.addn(1);
      } else {
        const current = this._data.getBlockByNumber(i);
        if (current !== undefined) {
          this._data.removeBlock(current);
        }
        i = i.addn(1);
      }
    }
  }

  protected async _computeTotalDifficulty(block: Block): Promise<bigint> {
    const difficulty = block.header.difficulty;
    const blockNumber = block.header.number;

    if (blockNumber.eqn(0)) {
      return difficulty;
    }

    const parentBlock = await this.getBlock(blockNumber.subn(1));
    assertHardhatInvariant(parentBlock !== null, "Parent block should exist");

    const parentHash = parentBlock.hash();
    const parentTD = this._data.getTotalDifficulty(parentHash);
    assertHardhatInvariant(
      parentTD !== undefined,
      "Parent block should have total difficulty"
    );

    return parentTD.add(difficulty);
  }
}
