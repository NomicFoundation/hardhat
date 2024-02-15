import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { bytesToHex as bufferToHex } from "@nomicfoundation/ethereumjs-util";
import { Bloom } from "@nomicfoundation/ethereumjs-vm";

import { assertHardhatInvariant } from "../../core/errors";
import { bloomFilter, filterLogs } from "./filter";
import { FilterParams } from "./node-types";
import { RpcLogOutput, RpcReceiptOutput } from "./output";

interface Reservation {
  first: bigint;
  last: bigint;
  interval: bigint;
  previousBlockStateRoot: Buffer;
  previousBlockTotalDifficulty: bigint;
  previousBlockBaseFeePerGas: bigint | undefined;
}

export class BlockchainData {
  private _blocksByNumber: Map<bigint, Block> = new Map();
  private _blocksByHash: Map<string, Block> = new Map();
  private _blocksByTransactions: Map<string, Block> = new Map();
  private _transactions: Map<string, TypedTransaction> = new Map();
  private _transactionReceipts: Map<string, RpcReceiptOutput> = new Map();
  private _totalDifficulty: Map<string, bigint> = new Map();
  private _blockReservations: Reservation[] = new Array();

  constructor(private _common: Common) {}

  public reserveBlocks(
    first: bigint,
    count: bigint,
    interval: bigint,
    previousBlockStateRoot: Buffer,
    previousBlockTotalDifficulty: bigint,
    previousBlockBaseFeePerGas: bigint | undefined
  ) {
    const reservation: Reservation = {
      first,
      last: first + count - 1n,
      interval,
      previousBlockStateRoot,
      previousBlockTotalDifficulty,
      previousBlockBaseFeePerGas,
    };
    this._blockReservations.push(reservation);
  }

  public getBlockByNumber(blockNumber: bigint) {
    return this._blocksByNumber.get(blockNumber);
  }

  public getBlockByHash(blockHash: Uint8Array) {
    return this._blocksByHash.get(bufferToHex(blockHash));
  }

  public getBlockByTransactionHash(transactionHash: Uint8Array) {
    return this._blocksByTransactions.get(bufferToHex(transactionHash));
  }

  public getTransaction(transactionHash: Uint8Array) {
    return this._transactions.get(bufferToHex(transactionHash));
  }

  public getTransactionReceipt(transactionHash: Uint8Array) {
    return this._transactionReceipts.get(bufferToHex(transactionHash));
  }

  public getTotalDifficulty(blockHash: Uint8Array) {
    return this._totalDifficulty.get(bufferToHex(blockHash));
  }

  public getLogs(filterParams: FilterParams) {
    const logs: RpcLogOutput[] = [];
    for (let i = filterParams.fromBlock; i <= filterParams.toBlock; i++) {
      const block = this.getBlockByNumber(i);
      if (
        block === undefined ||
        !bloomFilter(
          new Bloom(block.header.logsBloom),
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

  public addBlock(block: Block, totalDifficulty: bigint) {
    const blockHash = bufferToHex(block.hash());
    const blockNumber = block.header.number;
    this._blocksByNumber.set(blockNumber, block);
    this._blocksByHash.set(blockHash, block);
    this._totalDifficulty.set(blockHash, totalDifficulty);

    for (const transaction of block.transactions) {
      const transactionHash = bufferToHex(transaction.hash());
      this._transactions.set(transactionHash, transaction);
      this._blocksByTransactions.set(transactionHash, block);
    }
  }

  /**
   * WARNING: this method can leave the blockchain in an invalid state where
   * there are gaps between blocks. Ideally we should have a method that removes
   * the given block and all the following blocks.
   */
  public removeBlock(block: Block) {
    const blockHash = bufferToHex(block.hash());
    const blockNumber = block.header.number;
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

  public isReservedBlock(blockNumber: bigint): boolean {
    return this._findBlockReservation(blockNumber) !== -1;
  }

  private _findBlockReservation(blockNumber: bigint): number {
    return this._blockReservations.findIndex(
      (reservation) =>
        reservation.first <= blockNumber && blockNumber <= reservation.last
    );
  }

  /**
   * WARNING: this method only removes the given reservation and can result in
   * gaps in the reservations array. Ideally we should have a method that
   * removes the given reservation and all the following reservations.
   */
  private _removeReservation(index: number): Reservation {
    assertHardhatInvariant(
      index in this._blockReservations,
      `Reservation ${index} does not exist`
    );
    const reservation = this._blockReservations[index];

    this._blockReservations.splice(index, 1);

    return reservation;
  }

  /**
   * Cancel and return the reservation that has block `blockNumber`
   */
  public cancelReservationWithBlock(blockNumber: bigint): Reservation {
    return this._removeReservation(this._findBlockReservation(blockNumber));
  }

  public fulfillBlockReservation(blockNumber: bigint) {
    // in addition to adding the given block, the reservation needs to be split
    // in two in order to accomodate access to the given block.

    const reservationIndex = this._findBlockReservation(blockNumber);
    assertHardhatInvariant(
      reservationIndex !== -1,
      `No reservation to fill for block number ${blockNumber.toString()}`
    );

    // capture the timestamp before removing the reservation:
    const timestamp = this._calculateTimestampForReservedBlock(blockNumber);

    // split the block reservation:
    const oldReservation = this._removeReservation(reservationIndex);

    if (blockNumber !== oldReservation.first) {
      this._blockReservations.push({
        ...oldReservation,
        last: blockNumber - 1n,
      });
    }

    if (blockNumber !== oldReservation.last) {
      this._blockReservations.push({
        ...oldReservation,
        first: blockNumber + 1n,
      });
    }

    this.addBlock(
      Block.fromBlockData(
        {
          header: {
            number: blockNumber,
            stateRoot: oldReservation.previousBlockStateRoot,
            baseFeePerGas: oldReservation.previousBlockBaseFeePerGas,
            timestamp,
          },
        },
        {
          common: this._common,
          skipConsensusFormatValidation: true,
        }
      ),
      oldReservation.previousBlockTotalDifficulty
    );
  }

  private _calculateTimestampForReservedBlock(blockNumber: bigint): bigint {
    const reservationIndex = this._findBlockReservation(blockNumber);

    assertHardhatInvariant(
      reservationIndex !== -1,
      `Block ${blockNumber.toString()} does not lie within any of the reservations.`
    );

    const reservation = this._blockReservations[reservationIndex];

    const blockNumberBeforeReservation = reservation.first - 1n;

    const blockBeforeReservation = this.getBlockByNumber(
      blockNumberBeforeReservation
    );
    assertHardhatInvariant(
      blockBeforeReservation !== undefined,
      `Reservation after block ${blockNumberBeforeReservation.toString()} cannot be created because that block does not exist`
    );

    const previousTimestamp = this.isReservedBlock(blockNumberBeforeReservation)
      ? this._calculateTimestampForReservedBlock(blockNumberBeforeReservation)
      : blockBeforeReservation.header.timestamp;

    return (
      previousTimestamp +
      reservation.interval * (blockNumber - reservation.first + 1n)
    );
  }
}
