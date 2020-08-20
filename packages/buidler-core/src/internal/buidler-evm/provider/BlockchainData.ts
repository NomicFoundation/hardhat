import { Transaction } from "ethereumjs-tx";
import { BN, bufferToHex } from "ethereumjs-util";

import { Block } from "./types/Block";

export class BlockchainData {
  private _blocksByNumber: Map<number, Block> = new Map();
  private _blocksByHash: Map<string, Block> = new Map();
  private _blocksByTransactions: Map<string, Block> = new Map();
  private _transactions: Map<string, Transaction> = new Map();
  private _totalDifficulty: Map<string, BN> = new Map();

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

  public getTotalDifficulty(blockHash: Buffer) {
    return this._totalDifficulty.get(bufferToHex(blockHash));
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
      this._blocksByTransactions.delete(transactionHash);
    }
  }

  public addTransaction(transaction: Transaction) {
    return this._transactions.set(bufferToHex(transaction.hash()), transaction);
  }
}
