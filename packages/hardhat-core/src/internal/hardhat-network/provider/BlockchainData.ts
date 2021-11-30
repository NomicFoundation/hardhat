import util from "util";

import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import Bloom from "@ethereumjs/vm/dist/bloom";
import { BN, bufferToHex } from "ethereumjs-util";

import { HardhatError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";
import { bloomFilter, filterLogs } from "./filter";
import { FilterParams } from "./node-types";
import { RpcLogOutput, RpcReceiptOutput } from "./output";

export class BlockchainData {
  private _blocksByNumber: Map<number, Block> = new Map();
  private _blocksByHash: Map<string, Block> = new Map();
  private _blocksByTransactions: Map<string, Block> = new Map();
  private _transactions: Map<string, TypedTransaction> = new Map();
  private _transactionReceipts: Map<string, RpcReceiptOutput> = new Map();
  private _totalDifficulty: Map<string, BN> = new Map();
  public emptyBlockRanges: Array<{
    first: BN;
    last: BN;
    interval: BN;
  }> = new Array();

  public reserveBlocks(first: BN, count: BN, interval: BN, common: Common) {
    const last = first.add(count);
    this.emptyBlockRanges.push({ first, last, interval });
    this.addBlock(
      Block.fromBlockData(
        {
          header: {
            number: last.subn(1).toNumber(),
          },
        },
        { common }
      ),
      new BN(0)
    );
  }

  public getBlockByNumber(blockNumber: BN) {
    return this._blocksByNumber.get(blockNumber.toNumber());
  }

  public getBlockByHash(blockHash: Buffer) {
    return this._blocksByHash.get(bufferToHex(blockHash));
  }

  public getBlockByTransactionHash(transactionHash: Buffer) {
    return this._blocksByTransactions.get(bufferToHex(transactionHash));
  }

  public getTransaction(transactionHash: Buffer) {
    return this._transactions.get(bufferToHex(transactionHash));
  }

  public getTransactionReceipt(transactionHash: Buffer) {
    return this._transactionReceipts.get(bufferToHex(transactionHash));
  }

  public getTotalDifficulty(blockHash: Buffer) {
    return this._totalDifficulty.get(bufferToHex(blockHash));
  }

  public getLogs(filterParams: FilterParams) {
    const logs: RpcLogOutput[] = [];
    for (
      let i = filterParams.fromBlock;
      i.lte(filterParams.toBlock);
      i = i.addn(1)
    ) {
      const block = this.getBlockByNumber(i);
      if (
        block === undefined ||
        !bloomFilter(
          new Bloom(block.header.bloom),
          filterParams.addresses,
          filterParams.normalizedTopics
        )
      ) {
        continue;
      }
      for (const transaction of block.transactions) {
        const receipt = this.getTransactionReceipt(transaction.hash());
        if (receipt !== undefined) {
          logs.push(
            ...filterLogs(receipt.logs, {
              fromBlock: filterParams.fromBlock,
              toBlock: filterParams.toBlock,
              addresses: filterParams.addresses,
              normalizedTopics: filterParams.normalizedTopics,
            })
          );
        }
      }
    }
    return logs;
  }

  public addBlock(block: Block, totalDifficulty: BN) {
    const blockHash = bufferToHex(block.hash());
    const blockNumber = new BN(block.header.number).toNumber();
    this._blocksByNumber.set(blockNumber, block);
    this._blocksByHash.set(blockHash, block);
    this._totalDifficulty.set(blockHash, totalDifficulty);

    for (const transaction of block.transactions) {
      const transactionHash = bufferToHex(transaction.hash());
      this._transactions.set(transactionHash, transaction);
      this._blocksByTransactions.set(transactionHash, block);
    }
  }

  public removeBlock(block: Block) {
    const blockHash = bufferToHex(block.hash());
    const blockNumber = new BN(block.header.number).toNumber();
    this._blocksByNumber.delete(blockNumber);
    this._blocksByHash.delete(blockHash);
    this._totalDifficulty.delete(blockHash);

    for (const transaction of block.transactions) {
      const transactionHash = bufferToHex(transaction.hash());
      this._transactions.delete(transactionHash);
      this._transactionReceipts.delete(transactionHash);
      this._blocksByTransactions.delete(transactionHash);
    }
  }

  public addTransaction(transaction: TypedTransaction) {
    this._transactions.set(bufferToHex(transaction.hash()), transaction);
  }

  public addTransactionReceipt(receipt: RpcReceiptOutput) {
    this._transactionReceipts.set(receipt.transactionHash, receipt);
  }

  public isReservedBlock(blockNumber: BN): boolean {
    return this._findRangeWithBlock(blockNumber) !== -1;
  }

  private _findRangeWithBlock(blockNumber: BN): number {
    return this.emptyBlockRanges.findIndex(
      (range) => range.first.lte(blockNumber) && blockNumber.lte(range.last)
    );
  }

  public fulfillBlockReservation(blockNumber: BN, common: Common): Block {
    // number should lie within one of the ranges listed in
    // this.emptyBlockRanges. in addition to adding the given block, that range
    // needs to be split in two in order to accomodate access to the given
    // block.

    const rangeIndex = this._findRangeWithBlock(blockNumber);
    if (rangeIndex === -1) {
      throw new HardhatError(ERRORS.GENERAL.ASSERTION_ERROR, {
        message: `Block ${blockNumber.toString()} does not lie within any of the reserved block ranges (${util.inspect(
          this.emptyBlockRanges
        )}).`,
      });
    }

    // split the empty block range:

    const oldRange = this.emptyBlockRanges[rangeIndex];

    this.emptyBlockRanges.splice(rangeIndex, 1);

    if (!blockNumber.eq(oldRange.first)) {
      this.emptyBlockRanges.push({
        first: oldRange.first,
        last: blockNumber.subn(1),
        interval: oldRange.interval,
      });
    }

    if (!blockNumber.eq(oldRange.last)) {
      this.emptyBlockRanges.push({
        first: blockNumber.addn(1),
        last: oldRange.last,
        interval: oldRange.interval,
      });
    }

    // add the block, injecting the appropriate timestamp:

    const previousTimestamp =
      this.getBlockByNumber(oldRange.first.subn(1))?.header.timestamp ??
      new BN(0);

    const blockToAdd = Block.fromBlockData(
      {
        header: {
          number: blockNumber,
          timestamp: previousTimestamp.add(
            oldRange.interval.mul(blockNumber.sub(oldRange.first).addn(1))
          ),
        },
      },
      { common }
    );

    this.addBlock(blockToAdd, new BN(0));

    return blockToAdd;
  }
}
