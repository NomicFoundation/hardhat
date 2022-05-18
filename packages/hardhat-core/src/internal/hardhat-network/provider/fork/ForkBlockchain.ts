import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { TypedTransaction } from "@ethereumjs/tx";
import { Address, BN } from "ethereumjs-util";

import { FeeMarketEIP1559TxData } from "@ethereumjs/tx/dist/types";
import { RpcBlockWithTransactions } from "../../../core/jsonrpc/types/output/block";
import { RpcTransactionReceipt } from "../../../core/jsonrpc/types/output/receipt";
import { RpcTransaction } from "../../../core/jsonrpc/types/output/transaction";
import { InternalError } from "../../../core/providers/errors";
import { JsonRpcClient } from "../../jsonrpc/client";
import { BlockchainBase } from "../BlockchainBase";
import { FilterParams } from "../node-types";
import {
  remoteReceiptToRpcReceiptOutput,
  RpcLogOutput,
  RpcReceiptOutput,
  shouldShowEffectiveGasPriceForHardfork,
  shouldShowTransactionTypeForHardfork,
  toRpcLogOutput,
} from "../output";
import { ReadOnlyValidEIP2930Transaction } from "../transactions/ReadOnlyValidEIP2930Transaction";
import { ReadOnlyValidTransaction } from "../transactions/ReadOnlyValidTransaction";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";

import { ReadOnlyValidEIP1559Transaction } from "../transactions/ReadOnlyValidEIP1559Transaction";
import { rpcToBlockData } from "./rpcToBlockData";
import { rpcToTxData } from "./rpcToTxData";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class ForkBlockchain
  extends BlockchainBase
  implements HardhatBlockchainInterface
{
  private _latestBlockNumber = this._forkBlockNumber;

  constructor(
    private _jsonRpcClient: JsonRpcClient,
    private _forkBlockNumber: BN,
    common: Common
  ) {
    super(common);
  }

  public getLatestBlockNumber(): BN {
    return this._latestBlockNumber;
  }

  public async getBlock(
    blockHashOrNumber: Buffer | number | BN
  ): Promise<Block | null> {
    if (
      (typeof blockHashOrNumber === "number" || BN.isBN(blockHashOrNumber)) &&
      this._data.isReservedBlock(new BN(blockHashOrNumber))
    ) {
      this._data.fulfillBlockReservation(new BN(blockHashOrNumber));
    }

    let block: Block | undefined | null;
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
      throw new Error(
        `Invalid block number ${blockNumber.toNumber()}. Expected ${this._latestBlockNumber
          .addn(1)
          .toNumber()}`
      );
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

  public reserveBlocks(
    count: BN,
    interval: BN,
    previousBlockStateRoot: Buffer,
    previousBlockTotalDifficulty: BN,
    previousBlockBaseFeePerGas: BN | undefined
  ) {
    super.reserveBlocks(
      count,
      interval,
      previousBlockStateRoot,
      previousBlockTotalDifficulty,
      previousBlockBaseFeePerGas
    );
    this._latestBlockNumber = this._latestBlockNumber.add(count);
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

    this._delBlock(nextBlockNumber);
  }

  public async getTotalDifficulty(blockHash: Buffer): Promise<BN> {
    let td = this._data.getTotalDifficulty(blockHash);
    if (td !== undefined) {
      return td;
    }
    const block = await this.getBlock(blockHash);
    if (block === null) {
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
      const receipt = await this._processRemoteReceipt(remote);
      return receipt ?? null;
    }

    return null;
  }

  public getForkBlockNumber() {
    return this._forkBlockNumber;
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
      return remoteLogs.map(toRpcLogOutput).concat(localLogs);
    }
    return this._data.getLogs(filterParams);
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
    const block = await super.getBlock(blockNumber);
    if (block !== null) {
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

    // We copy the common and set it to London or Berlin if the remote block
    // had EIP-1559 activated or not. The reason for this is that ethereumjs
    // throws if we have a base fee for an older hardfork, and set a default
    // one for London.
    const common = this._common.copy();
    if (rpcBlock.baseFeePerGas !== undefined) {
      common.setHardfork("london"); // TODO: consider changing this to "latest hardfork"
    } else {
      common.setHardfork("berlin");
    }

    // we don't include the transactions to add our own custom tx objects,
    // otherwise they are recreated with upstream classes
    const blockData = rpcToBlockData({
      ...rpcBlock,
      transactions: [],
    });

    const block = Block.fromBlockData(blockData, {
      common,

      // We use freeze false here because we add the transactions manually
      freeze: false,
    });

    for (const transaction of rpcBlock.transactions) {
      let tx;
      if (transaction.type === undefined || transaction.type.eqn(0)) {
        tx = new ReadOnlyValidTransaction(
          new Address(transaction.from),
          rpcToTxData(transaction)
        );
      } else if (transaction.type.eqn(1)) {
        tx = new ReadOnlyValidEIP2930Transaction(
          new Address(transaction.from),
          rpcToTxData(transaction)
        );
      } else if (transaction.type.eqn(2)) {
        tx = new ReadOnlyValidEIP1559Transaction(
          new Address(transaction.from),
          rpcToTxData(transaction) as FeeMarketEIP1559TxData
        );
      } else {
        throw new InternalError(
          `Unknown transaction type ${transaction.type.toString()}`
        );
      }

      block.transactions.push(tx);
    }

    this._data.addBlock(block, rpcBlock.totalDifficulty);
    return block;
  }

  protected _delBlock(blockNumber: BN): void {
    if (blockNumber.lte(this._forkBlockNumber)) {
      throw new Error("Cannot delete remote block");
    }
    super._delBlock(blockNumber);
    this._latestBlockNumber = blockNumber.subn(1);
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

  private async _processRemoteReceipt(
    txReceipt: RpcTransactionReceipt | null
  ): Promise<RpcReceiptOutput | undefined> {
    if (txReceipt === null || txReceipt.blockNumber.gt(this._forkBlockNumber)) {
      return undefined;
    }

    const tx = await this.getTransaction(txReceipt.transactionHash);

    const receipt = remoteReceiptToRpcReceiptOutput(
      txReceipt,
      tx!,
      shouldShowTransactionTypeForHardfork(this._common),
      shouldShowEffectiveGasPriceForHardfork(this._common)
    );

    this._data.addTransactionReceipt(receipt);
    return receipt;
  }
}
