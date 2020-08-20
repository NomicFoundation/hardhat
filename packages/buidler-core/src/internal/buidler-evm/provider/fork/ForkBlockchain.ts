import Common from "ethereumjs-common";
import { Transaction } from "ethereumjs-tx";
import { BN, bufferToInt } from "ethereumjs-util";

import { JsonRpcClient } from "../../jsonrpc/client";
import { RpcBlockWithTransactions, RpcTransaction } from "../../jsonrpc/types";
import { BlockchainData } from "../BlockchainData";
import { Block } from "../types/Block";
import { Blockchain } from "../types/Blockchain";
import { PBlockchain, toBlockchain } from "../types/PBlockchain";

import { NotSupportedError } from "./errors";
import { rpcToBlockData } from "./rpcToBlockData";
import { rpcToTxData } from "./rpcToTxData";

// TODO: figure out what errors we wanna throw
/* tslint:disable only-buidler-error */

export class ForkBlockchain implements PBlockchain {
  private _data = new BlockchainData();
  private _latestBlockNumber = this._forkBlockNumber;

  constructor(
    private _jsonRpcClient: JsonRpcClient,
    private _forkBlockNumber: BN,
    private _common: Common
  ) {}

  public async getBlock(
    blockHashOrNumber: Buffer | number | BN
  ): Promise<Block | undefined> {
    if (Buffer.isBuffer(blockHashOrNumber)) {
      return this._getBlockByHash(blockHashOrNumber);
    }
    return this._getBlockByNumber(new BN(blockHashOrNumber));
  }

  public async getLatestBlock(): Promise<Block> {
    const block = await this.getBlock(this._latestBlockNumber);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    return block;
  }

  public async putBlock(block: Block): Promise<Block> {
    const blockNumber = new BN(block.header.number);
    if (!blockNumber.eq(this._latestBlockNumber.addn(1))) {
      throw new Error("Invalid block number");
    }
    const parent = await this.getLatestBlock();
    if (!block.header.parentHash.equals(parent.hash())) {
      throw new Error("Invalid parent hash");
    }
    this._latestBlockNumber = this._latestBlockNumber.addn(1);
    const totalDifficulty = await this._computeTotalDifficulty(block);
    this._data.addBlock(block, totalDifficulty);
    return block;
  }

  public async delBlock(blockHash: Buffer): Promise<void> {
    const block = this._data.getBlockByHash(blockHash);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    this._delBlock(block);
  }

  public async getDetails(_: string): Promise<void> {}

  public async iterator(name: string, onBlock: any): Promise<void> {
    // this function is only ever used in runBlockchain which is not used in Buidler
    throw new NotSupportedError("iterator");
  }

  public deleteAllFollowingBlocks(block: Block): void {
    const blockNumber = new BN(block.header.number);
    const savedBlock = this._data.getBlockByNumber(blockNumber);
    if (savedBlock === undefined || !savedBlock.hash().equals(block.hash())) {
      throw new Error("Invalid block");
    }

    const nextBlockNumber = blockNumber.addn(1);
    if (this._forkBlockNumber.gte(nextBlockNumber)) {
      throw new Error("Cannot delete remote block");
    }
    const nextBlock = this._data.getBlockByNumber(nextBlockNumber);
    if (nextBlock !== undefined) {
      return this._delBlock(nextBlock);
    }
  }

  public async getBlockTotalDifficulty(blockHash: Buffer): Promise<BN> {
    let td = this._data.getTotalDifficulty(blockHash);
    if (td !== undefined) {
      return td;
    }
    const block = await this.getBlock(blockHash);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    td = this._data.getTotalDifficulty(blockHash);
    if (td === undefined) {
      throw new Error("This should never happen");
    }
    return td;
  }

  public async getTransaction(
    transactionHash: Buffer
  ): Promise<Transaction | undefined> {
    const tx = this._data.getTransaction(transactionHash);
    if (tx === undefined) {
      const remote = await this._jsonRpcClient.getTransactionByHash(
        transactionHash
      );
      return this._processRemoteTransaction(remote);
    }
    return tx;
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined> {
    let block = this._data.getBlockByTransactionHash(transactionHash);
    if (block === undefined) {
      const remote = await this._jsonRpcClient.getTransactionByHash(
        transactionHash
      );
      await this._processRemoteTransaction(remote);
      if (remote !== null && remote.blockHash !== null) {
        await this.getBlock(remote.blockHash);
        block = this._data.getBlockByTransactionHash(transactionHash);
      }
    }
    return block;
  }

  public asBlockchain(): Blockchain {
    return toBlockchain(this);
  }

  private async _getBlockByHash(blockHash: Buffer) {
    const block = this._data.getBlockByHash(blockHash);
    if (block !== undefined) {
      return block;
    }
    const rpcBlock = await this._jsonRpcClient.getBlockByHash(blockHash, true);
    return this._processRemoteBlock(rpcBlock);
  }

  private async _getBlockByNumber(blockNumber: BN) {
    if (blockNumber.gt(this._latestBlockNumber)) {
      throw new Error("Block not found");
    }
    const block = this._data.getBlockByNumber(blockNumber);
    if (block !== undefined) {
      return block;
    }
    const rpcBlock = await this._jsonRpcClient.getBlockByNumber(
      blockNumber,
      true
    );
    return this._processRemoteBlock(rpcBlock);
  }

  private async _processRemoteBlock(rpcBlock: RpcBlockWithTransactions | null) {
    if (
      rpcBlock === null ||
      rpcBlock.hash === null ||
      rpcBlock.number === null ||
      rpcBlock.number.gt(this._forkBlockNumber)
    ) {
      return undefined;
    }
    const block = new Block(rpcToBlockData(rpcBlock), { common: this._common });
    this._data.addBlock(block, rpcBlock.totalDifficulty);
    return block;
  }

  private async _processRemoteTransaction(
    rpcTransaction: RpcTransaction | null
  ) {
    if (
      rpcTransaction === null ||
      rpcTransaction.blockNumber === null ||
      rpcTransaction.blockNumber.gt(this._forkBlockNumber)
    ) {
      return undefined;
    }
    const transaction = new Transaction(rpcToTxData(rpcTransaction), {
      common: this._common,
    });
    this._data.addTransaction(transaction);
    return transaction;
  }

  private async _computeTotalDifficulty(block: Block): Promise<BN> {
    const difficulty = new BN(block.header.difficulty);
    const blockNumber = new BN(block.header.number);
    if (blockNumber.eqn(0)) {
      return difficulty;
    }

    const parentBlock =
      this._data.getBlockByNumber(blockNumber.subn(1)) ??
      (await this.getBlock(blockNumber.subn(1)));
    if (parentBlock === undefined) {
      throw new Error("Block not found");
    }
    const parentHash = parentBlock.hash();
    const parentTD = this._data.getTotalDifficulty(parentHash);
    if (parentTD === undefined) {
      throw new Error("This should never happen");
    }
    return parentTD.add(difficulty);
  }

  private _delBlock(block: Block): void {
    if (new BN(block.header.number).lte(this._forkBlockNumber)) {
      throw new Error("Cannot delete remote block");
    }

    const blockNumber = bufferToInt(block.header.number);
    for (let i = blockNumber; this._latestBlockNumber.gten(i); i++) {
      const current = this._data.getBlockByNumber(new BN(i));
      if (current !== undefined) {
        this._data.removeBlock(current);
      }
    }

    this._latestBlockNumber = new BN(blockNumber).subn(1);
  }
}
