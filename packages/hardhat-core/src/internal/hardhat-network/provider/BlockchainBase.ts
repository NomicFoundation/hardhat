import { Block, BlockHeader } from "@nomicfoundation/ethereumjs-block";
import {
  BlockchainInterface,
  CasperConsensus,
  CliqueConsensus,
  Consensus,
  EthashConsensus,
} from "@nomicfoundation/ethereumjs-blockchain";
import { Common, ConsensusAlgorithm } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";

import { assertHardhatInvariant } from "../../core/errors";
import * as BigIntUtils from "../../util/bigint";
import { BlockchainData } from "./BlockchainData";
import { RpcReceiptOutput } from "./output";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export abstract class BlockchainBase {
  public consensus: Consensus;
  protected readonly _data: BlockchainData;

  constructor(protected _common: Common) {
    this._data = new BlockchainData(_common);

    // copied from blockchain.ts in @nomicfoundation/ethereumjs-blockchain
    switch (this._common.consensusAlgorithm()) {
      case ConsensusAlgorithm.Casper:
        this.consensus = new CasperConsensus();
        break;
      case ConsensusAlgorithm.Clique:
        this.consensus = new CliqueConsensus();
        break;
      case ConsensusAlgorithm.Ethash:
        this.consensus = new EthashConsensus();
        break;
      default:
        throw new Error(
          `consensus algorithm ${this._common.consensusAlgorithm()} not supported`
        );
    }
  }

  public abstract addBlock(block: Block): Promise<Block>;

  public addTransactionReceipts(receipts: RpcReceiptOutput[]) {
    for (const receipt of receipts) {
      this._data.addTransactionReceipt(receipt);
    }
  }

  public async delBlock(blockHash: Buffer) {
    await this.deleteBlock(blockHash);
  }

  public async deleteBlock(blockHash: Buffer) {
    const block = this._data.getBlockByHash(blockHash);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    await this._delBlock(block.header.number);
  }

  public async getBlock(
    blockHashOrNumber: Buffer | bigint | number
  ): Promise<Block> {
    if (
      (typeof blockHashOrNumber === "number" ||
        BigIntUtils.isBigInt(blockHashOrNumber)) &&
      this._data.isReservedBlock(BigInt(blockHashOrNumber))
    ) {
      this._data.fulfillBlockReservation(BigInt(blockHashOrNumber));
    }

    if (typeof blockHashOrNumber === "number") {
      const blockByNumber = this._data.getBlockByNumber(
        BigInt(blockHashOrNumber)
      );
      if (blockByNumber === undefined) {
        throw new Error("Block not found");
      }
      return blockByNumber;
    }
    if (BigIntUtils.isBigInt(blockHashOrNumber)) {
      const blockByNumber = this._data.getBlockByNumber(blockHashOrNumber);
      if (blockByNumber === undefined) {
        throw new Error("Block not found");
      }
      return blockByNumber;
    }
    const blockByHash = this._data.getBlockByHash(blockHashOrNumber);
    if (blockByHash === undefined) {
      throw new Error("Block not found");
    }
    return blockByHash;
  }

  public abstract getLatestBlockNumber(): Promise<bigint>;

  public async getLatestBlock(): Promise<Block> {
    return this.getLatestBlockNumber().then((blockNumber) => {
      return this.getBlock(blockNumber);
    });
  }

  public getLocalTransaction(
    transactionHash: Buffer
  ): TypedTransaction | undefined {
    return this._data.getTransaction(transactionHash);
  }

  public iterator(
    _name: string,
    _onBlock: (block: Block, reorg: boolean) => void | Promise<void>
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }

  public async putBlock(block: Block): Promise<void> {
    await this.addBlock(block);
  }

  public async reserveBlocks(
    count: bigint,
    interval: bigint,
    previousBlockStateRoot: Buffer,
    previousBlockTotalDifficulty: bigint,
    previousBlockBaseFeePerGas: bigint | undefined
  ): Promise<void> {
    await this.getLatestBlockNumber().then((blockNumber) => {
      this._data.reserveBlocks(
        blockNumber + 1n,
        count,
        interval,
        previousBlockStateRoot,
        previousBlockTotalDifficulty,
        previousBlockBaseFeePerGas
      );
    });
  }

  public copy(): BlockchainInterface {
    throw new Error("Method not implemented.");
  }

  public validateHeader(
    _header: BlockHeader,
    _height?: bigint | undefined
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected async _delBlock(blockNumber: bigint): Promise<void> {
    let i = blockNumber;
    let shouldStop = false;

    while (!shouldStop) {
      await this.getLatestBlockNumber().then((latestBlockNumber) => {
        if (i <= latestBlockNumber) {
          if (this._data.isReservedBlock(i)) {
            const reservation = this._data.cancelReservationWithBlock(i);
            i = reservation.last + 1n;
          } else {
            const current = this._data.getBlockByNumber(i);
            if (current !== undefined) {
              this._data.removeBlock(current);
            }
            i++;
          }
        } else {
          shouldStop = true;
        }
      });
    }
  }

  protected async _computeTotalDifficulty(block: Block): Promise<bigint> {
    const difficulty = block.header.difficulty;
    const blockNumber = block.header.number;

    if (blockNumber === 0n) {
      return difficulty;
    }

    const parentBlock = await this.getBlock(blockNumber - 1n);

    const parentHash = parentBlock.hash();
    const parentTD = this._data.getTotalDifficulty(parentHash);
    assertHardhatInvariant(
      parentTD !== undefined,
      "Parent block should have total difficulty"
    );

    return parentTD + difficulty;
  }
}
