import util from "util";

import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import Bloom from "@ethereumjs/vm/dist/bloom";
import { BN, bufferToHex } from "ethereumjs-util";

import { assertHardhatInvariant, HardhatError } from "../../core/errors";
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
  private _blockReservations: Array<{
    first: BN;
    last: BN;
    interval: BN;
  }> = new Array();

  public reserveBlocks(first: BN, count: BN, interval: BN, common: Common) {
    const last = first.add(count);
    this._blockReservations.push({ first, last, interval });
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
    return this._findBlockReservation(blockNumber) !== -1;
  }

  private _findBlockReservation(blockNumber: BN): number {
    return this._blockReservations.findIndex(
      (reservation) =>
        reservation.first.lte(blockNumber) && blockNumber.lte(reservation.last)
    );
  }

  public fulfillBlockReservation(blockNumber: BN, common: Common): Block {
    // in addition to adding the given block, the reservation needs to be split
    // in two in order to accomodate access to the given block.

    const reservationIndex = this._findBlockReservation(blockNumber);
    assertHardhatInvariant(
      reservationIndex !== -1,
      `No reservation to fill for block number ${blockNumber}`
    );

    const timestamp = this._calculateTimestampForReservedBlock(blockNumber);

    // split the block reservation:

    const oldReservation = this._blockReservations[reservationIndex];

    this._blockReservations.splice(reservationIndex, 1);

    if (!blockNumber.eq(oldReservation.first)) {
      this._blockReservations.push({
        first: oldReservation.first,
        last: blockNumber.subn(1),
        interval: oldReservation.interval,
      });
    }

    if (!blockNumber.eq(oldReservation.last)) {
      this._blockReservations.push({
        first: blockNumber.addn(1),
        last: oldReservation.last,
        interval: oldReservation.interval,
      });
    }

    // add the block, injecting the appropriate timestamp:

    const blockToAdd = Block.fromBlockData(
      {
        header: {
          number: blockNumber,
          timestamp,
        },
      },
      { common }
    );

    this.addBlock(blockToAdd, new BN(0));

    return blockToAdd;
  }

  private _calculateTimestampForReservedBlock(blockNumber: BN): BN {
    const reservationIndex = this._findBlockReservation(blockNumber);
    if (reservationIndex === -1) {
      throw new HardhatError(ERRORS.GENERAL.ASSERTION_ERROR, {
        message: `Block ${blockNumber.toString()} does not lie within any of the reservations (${util.inspect(
          this._blockReservations
        )}).`,
      });
    }

    const reservation = this._blockReservations[reservationIndex];

    const blockNumberBeforeReservation = reservation.first.subn(1);

    const previousTimestamp = this.isReservedBlock(blockNumberBeforeReservation)
      ? this._calculateTimestampForReservedBlock(blockNumberBeforeReservation)
      : this.getBlockByNumber(blockNumberBeforeReservation)?.header.timestamp ??
        new BN(0);

    return previousTimestamp.add(
      reservation.interval.mul(blockNumber.sub(reservation.first).addn(1))
    );
  }

  public unreserveBlocksAfter(blockNumber: BN) {
    // search through block reservations and remove any that include the given
    // blockNumber
    for (
      let b = blockNumber.addn(1);
      this._findBlockReservation(b) !== -1;
      b = b.addn(1)
    ) {
      // delete the existing reservation, but re-add its first half:

      const reservationIndex = this._findBlockReservation(b);

      const oldReservation = this._blockReservations[reservationIndex];

      this._blockReservations.splice(reservationIndex, 1);

      this._blockReservations.push({
        first: oldReservation.first,
        last: b.subn(1),
        interval: oldReservation.interval,
      });
    }
  }
}
