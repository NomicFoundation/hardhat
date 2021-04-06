import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { Address, BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../jsonrpc/client";
import {
  RpcBlockWithTransactions,
  RpcTransaction,
  RpcTransactionReceipt,
} from "../../jsonrpc/types";
import { BlockchainData } from "../BlockchainData";
import { FilterParams } from "../node-types";
import {
  RpcLogOutput,
  RpcReceiptOutput,
  toRpcLogOutput,
  toRpcReceiptOutput,
} from "../output";
import { ReadOnlyValidTransaction } from "../transactions/ReadOnlyValidTransaction";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";

import { rpcToBlockData } from "./rpcToBlockData";
import { rpcToTxData } from "./rpcToTxData";

/* tslint:disable only-hardhat-error */

export class ForkBlockchain implements HardhatBlockchainInterface {
  private _data = new BlockchainData();
  private _latestBlockNumber = this._forkBlockNumber;

  constructor(
    private _jsonRpcClient: JsonRpcClient,
    private _forkBlockNumber: BN,
    private _common: Common
  ) {}

  public async getLatestBlock(): Promise<Block> {
    const block = await this.getBlock(this._latestBlockNumber);
    if (block === null) {
      throw new Error("Block not found");
    }
    return block;
  }

  public async getBlock(
    blockHashOrNumber: Buffer | number | BN
  ): Promise<Block | null> {
    let block: Block | undefined;
    if (Buffer.isBuffer(blockHashOrNumber)) {
      block = await this._getBlockByHash(blockHashOrNumber);
      return block ?? null;
    }

    block = await this._getBlockByNumber(new BN(blockHashOrNumber));
    return block ?? null;
  }

  public async addBlock(block: Block): Promise<Block> {
    const blockNumber = new BN(block.header.number);
    if (!blockNumber.eq(this._latestBlockNumber.addn(1))) {
      throw new Error("Invalid block number");
    }

    // When forking a network whose consensus is not the classic PoW,
    // we can't calculate the hash correctly.
    // Thus, we avoid this check for the first block after the fork.
    if (blockNumber.gt(this._forkBlockNumber.addn(1))) {
      const parent = await this.getLatestBlock();
      if (!block.header.parentHash.equals(parent.hash())) {
        throw new Error("Invalid parent hash");
      }
    }

    this._latestBlockNumber = this._latestBlockNumber.addn(1);
    const totalDifficulty = await this._computeTotalDifficulty(block);
    this._data.addBlock(block, totalDifficulty);
    return block;
  }

  public async putBlock(block: Block): Promise<void> {
    await this.addBlock(block);
  }

  public deleteBlock(blockHash: Buffer) {
    const block = this._data.getBlockByHash(blockHash);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    this._delBlock(block);
  }

  public async delBlock(blockHash: Buffer) {
    this.deleteBlock(blockHash);
  }

  public deleteLaterBlocks(block: Block): void {
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

  public async getTotalDifficulty(blockHash: Buffer): Promise<BN> {
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
  ): Promise<TypedTransaction | undefined> {
    const tx = this.getLocalTransaction(transactionHash);
    if (tx === undefined) {
      const remote = await this._jsonRpcClient.getTransactionByHash(
        transactionHash
      );
      return this._processRemoteTransaction(remote);
    }
    return tx;
  }

  public getLocalTransaction(
    transactionHash: Buffer
  ): TypedTransaction | undefined {
    return this._data.getTransaction(transactionHash);
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | null> {
    let block = this._data.getBlockByTransactionHash(transactionHash);
    if (block === undefined) {
      const remote = await this._jsonRpcClient.getTransactionByHash(
        transactionHash
      );
      this._processRemoteTransaction(remote);
      if (remote !== null && remote.blockHash !== null) {
        await this.getBlock(remote.blockHash);
        block = this._data.getBlockByTransactionHash(transactionHash);
      }
    }
    return block ?? null;
  }

  public async getTransactionReceipt(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | null> {
    const local = this._data.getTransactionReceipt(transactionHash);
    if (local !== undefined) {
      return local;
    }
    const remote = await this._jsonRpcClient.getTransactionReceipt(
      transactionHash
    );
    if (remote !== null) {
      const receipt = this._processRemoteReceipt(remote);
      return receipt ?? null;
    }

    return null;
  }

  public addTransactionReceipts(receipts: RpcReceiptOutput[]) {
    for (const receipt of receipts) {
      this._data.addTransactionReceipt(receipt);
    }
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    if (filterParams.fromBlock.lte(this._forkBlockNumber)) {
      let toBlock = filterParams.toBlock;
      let localLogs: RpcLogOutput[] = [];
      if (toBlock.gt(this._forkBlockNumber)) {
        toBlock = this._forkBlockNumber;
        localLogs = this._data.getLogs({
          ...filterParams,
          fromBlock: this._forkBlockNumber.addn(1),
        });
      }
      const remoteLogs = await this._jsonRpcClient.getLogs({
        fromBlock: filterParams.fromBlock,
        toBlock,
        address:
          filterParams.addresses.length === 1
            ? filterParams.addresses[0]
            : filterParams.addresses,
        topics: filterParams.normalizedTopics,
      });
      return remoteLogs
        .map((log, index) => toRpcLogOutput(log, index))
        .concat(localLogs);
    }
    return this._data.getLogs(filterParams);
  }

  public iterator(
    _name: string,
    _onBlock: (block: Block, reorg: boolean) => void | Promise<void>
  ): Promise<number | void> {
    throw new Error("Method not implemented.");
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
      return undefined;
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

    // we don't include the transactions to add our own custom tx objects,
    // otherwise they are recreated with upstream classes
    const blockData = rpcToBlockData({
      ...rpcBlock,
      transactions: [],
    });

    const block = Block.fromBlockData(blockData, {
      common: this._common,

      // We use freeze false here because we add the transactions manually
      freeze: false,
    });

    for (const transaction of rpcBlock.transactions) {
      const tx = new ReadOnlyValidTransaction(
        new Address(transaction.from),
        rpcToTxData(transaction)
      );

      block.transactions.push(tx);
    }

    this._data.addBlock(block, rpcBlock.totalDifficulty);
    return block;
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
    if (parentBlock === null) {
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

    const blockNumber = block.header.number.toNumber();
    for (let i = blockNumber; this._latestBlockNumber.gten(i); i++) {
      const current = this._data.getBlockByNumber(new BN(i));
      if (current !== undefined) {
        this._data.removeBlock(current);
      }
    }

    this._latestBlockNumber = new BN(blockNumber).subn(1);
  }

  private _processRemoteTransaction(rpcTransaction: RpcTransaction | null) {
    if (
      rpcTransaction === null ||
      rpcTransaction.blockNumber === null ||
      rpcTransaction.blockNumber.gt(this._forkBlockNumber)
    ) {
      return undefined;
    }

    const transaction = new ReadOnlyValidTransaction(
      new Address(rpcTransaction.from),
      rpcToTxData(rpcTransaction)
    );

    this._data.addTransaction(transaction);

    return transaction;
  }

  private _processRemoteReceipt(
    txReceipt: RpcTransactionReceipt | null
  ): RpcReceiptOutput | undefined {
    if (txReceipt === null || txReceipt.blockNumber.gt(this._forkBlockNumber)) {
      return undefined;
    }
    const receipt = toRpcReceiptOutput(txReceipt);
    this._data.addTransactionReceipt(receipt);
    return receipt;
  }
}
