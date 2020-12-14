import Common from "ethereumjs-common";
import { Transaction } from "ethereumjs-tx";
import { BN, bufferToInt } from "ethereumjs-util";

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
import { Block } from "../types/Block";
import { Blockchain } from "../types/Blockchain";
import { PBlockchain, toBlockchain } from "../types/PBlockchain";

import { ForkTransaction } from "./ForkTransaction";
import { rpcToBlockData } from "./rpcToBlockData";
import { rpcToTxData } from "./rpcToTxData";

/* tslint:disable only-hardhat-error */

export class ForkBlockchain implements PBlockchain {
  private _data = new BlockchainData();
  private _latestBlockNumber = this._forkBlockNumber;

  constructor(
    private _jsonRpcClient: JsonRpcClient,
    private _forkBlockNumber: BN,
    private _common: Common
  ) {}

  public async getLatestBlock(): Promise<Block> {
    const block = await this.getBlock(this._latestBlockNumber);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    return block;
  }

  public async getBlock(
    blockHashOrNumber: Buffer | number | BN
  ): Promise<Block | undefined> {
    if (Buffer.isBuffer(blockHashOrNumber)) {
      return this._getBlockByHash(blockHashOrNumber);
    }
    return this._getBlockByNumber(new BN(blockHashOrNumber));
  }

  public async addBlock(block: Block): Promise<Block> {
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

  public deleteBlock(blockHash: Buffer) {
    const block = this._data.getBlockByHash(blockHash);
    if (block === undefined) {
      throw new Error("Block not found");
    }
    this._delBlock(block);
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
  ): Promise<Transaction | undefined> {
    const tx = this.getLocalTransaction(transactionHash);
    if (tx === undefined) {
      const remote = await this._jsonRpcClient.getTransactionByHash(
        transactionHash
      );
      return this._processRemoteTransaction(remote);
    }
    return tx;
  }

  public getLocalTransaction(transactionHash: Buffer): Transaction | undefined {
    return this._data.getTransaction(transactionHash);
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined> {
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
    return block;
  }

  public async getTransactionReceipt(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | undefined> {
    const local = this._data.getTransactionReceipt(transactionHash);
    if (local !== undefined) {
      return local;
    }
    const remote = await this._jsonRpcClient.getTransactionReceipt(
      transactionHash
    );
    if (remote !== null) {
      return this._processRemoteReceipt(remote);
    }
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

    // we don't include the transactions to add our own custom ForkTransaction txs
    const blockData = rpcToBlockData({
      ...rpcBlock,
      transactions: [],
    });

    const block = new Block(blockData, { common: this._common });
    const chainId = this._jsonRpcClient.getNetworkId();

    for (const transaction of rpcBlock.transactions) {
      block.transactions.push(
        new ForkTransaction(chainId, rpcToTxData(transaction), {
          common: this._common,
        })
      );
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

  private _processRemoteTransaction(rpcTransaction: RpcTransaction | null) {
    if (
      rpcTransaction === null ||
      rpcTransaction.blockNumber === null ||
      rpcTransaction.blockNumber.gt(this._forkBlockNumber)
    ) {
      return undefined;
    }

    const chainId = this._jsonRpcClient.getNetworkId();
    const transaction = new ForkTransaction(
      chainId,
      rpcToTxData(rpcTransaction),
      {
        common: this._common,
      }
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
