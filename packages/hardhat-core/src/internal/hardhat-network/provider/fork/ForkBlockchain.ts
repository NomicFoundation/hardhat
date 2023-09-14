import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";

import { FeeMarketEIP1559TxData } from "@nomicfoundation/ethereumjs-tx/dist/types";
import { RpcBlockWithTransactions } from "../../../core/jsonrpc/types/output/block";
import { RpcTransactionReceipt } from "../../../core/jsonrpc/types/output/receipt";
import { RpcTransaction } from "../../../core/jsonrpc/types/output/transaction";
import { InternalError } from "../../../core/providers/errors";
import { HardforkHistoryConfig } from "../../../../types/config";
import {
  HardforkName,
  getHardforkName,
  selectHardfork,
} from "../../../util/hardforks";
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
import { ReadOnlyValidUnknownTypeTransaction } from "../transactions/ReadOnlyValidUnknownTypeTransaction";
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
    private _forkBlockNumber: bigint,
    private _hardforkActivations: HardforkHistoryConfig,
    common: Common
  ) {
    super(common);
  }

  public async getLatestBlockNumber(): Promise<bigint> {
    return this._latestBlockNumber;
  }

  public async getBlock(blockHashOrNumber: Buffer | bigint): Promise<Block> {
    if (
      typeof blockHashOrNumber === "bigint" &&
      this._data.isReservedBlock(blockHashOrNumber)
    ) {
      this._data.fulfillBlockReservation(blockHashOrNumber);
    }

    let block: Block | undefined | null;
    if (Buffer.isBuffer(blockHashOrNumber)) {
      block = await this.getBlockByHash(blockHashOrNumber);
      if (block === undefined) {
        throw new Error("Block not found");
      }
      return block;
    }

    block = await this.getBlockByNumber(BigInt(blockHashOrNumber));
    if (block === undefined) {
      throw new Error("Block not found");
    }
    return block;
  }

  public async getBlockByHash(hash: Buffer): Promise<Block | undefined> {
    const block = this._data.getBlockByHash(hash);
    if (block !== undefined) {
      return block;
    }
    const rpcBlock = await this._jsonRpcClient.getBlockByHash(hash, true);
    return this._processRemoteBlock(rpcBlock);
  }

  public async getBlockByNumber(
    blockNumber: bigint
  ): Promise<Block | undefined> {
    if (blockNumber > this._latestBlockNumber) {
      return undefined;
    }

    try {
      const block = await super.getBlock(blockNumber);
      return block;
    } catch {}

    const rpcBlock = await this._jsonRpcClient.getBlockByNumber(
      blockNumber,
      true
    );
    return this._processRemoteBlock(rpcBlock);
  }

  public async addBlock(block: Block): Promise<Block> {
    const blockNumber = BigInt(block.header.number);
    if (blockNumber !== this._latestBlockNumber + 1n) {
      throw new Error(
        `Invalid block number ${blockNumber}. Expected ${
          this._latestBlockNumber + 1n
        }`
      );
    }

    // When forking a network whose consensus is not the classic PoW,
    // we can't calculate the hash correctly.
    // Thus, we avoid this check for the first block after the fork.
    if (blockNumber > this._forkBlockNumber + 1n) {
      const parent = await this.getLatestBlock();
      if (!block.header.parentHash.equals(parent.hash())) {
        throw new Error("Invalid parent hash");
      }
    }

    this._latestBlockNumber++;
    const totalDifficulty = await this._computeTotalDifficulty(block);
    this._data.addBlock(block, totalDifficulty);
    return block;
  }

  public async reserveBlocks(count: bigint, interval: bigint): Promise<void> {
    await super.reserveBlocks(count, interval);
    this._latestBlockNumber += count;
  }

  public async getTotalDifficultyByHash(blockHash: Buffer): Promise<bigint> {
    let td = this._data.getTotalDifficulty(blockHash);
    if (td !== undefined) {
      return td;
    }

    // fetch block to check if it exists
    await this.getBlock(blockHash);

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

  public async getReceiptByTransactionHash(
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

    return undefined;
  }

  public getForkBlockNumber() {
    return this._forkBlockNumber;
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    if (filterParams.fromBlock <= this._forkBlockNumber) {
      let toBlock = filterParams.toBlock;
      let localLogs: RpcLogOutput[] = [];
      if (toBlock > this._forkBlockNumber) {
        toBlock = this._forkBlockNumber;
        localLogs = this._data.getLogs({
          ...filterParams,
          fromBlock: this._forkBlockNumber + 1n,
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

  public async getHardforkAtBlockNumber(
    blockNumberOrPending?: bigint | "pending"
  ): Promise<HardforkName> {
    if (
      blockNumberOrPending !== undefined &&
      blockNumberOrPending !== "pending"
    ) {
      return getHardforkName(
        selectHardfork(
          this._forkBlockNumber,
          this._common.hardfork(),
          this._hardforkActivations,
          blockNumberOrPending
        )
      );
    }
    return getHardforkName(this._common.hardfork());
  }

  public async revertToBlock(blockNumber: bigint): Promise<void> {
    const savedBlock = this._data.getBlockByNumber(blockNumber);
    if (savedBlock === undefined) {
      throw new Error("Invalid block");
    }

    const nextBlockNumber = blockNumber + 1n;
    if (this._forkBlockNumber >= nextBlockNumber) {
      throw new Error("Cannot delete remote block");
    }

    await this._delBlock(nextBlockNumber);
  }

  private async _processRemoteBlock(rpcBlock: RpcBlockWithTransactions | null) {
    if (
      rpcBlock === null ||
      rpcBlock.hash === null ||
      rpcBlock.number === null ||
      rpcBlock.number > this._forkBlockNumber
    ) {
      return undefined;
    }

    const common = this._common.copy();
    // We set the common's hardfork depending on the remote block fields, to
    // prevent ethereumjs from throwing if unsupported fields are passed.
    // We use "berlin" for pre-EIP-1559 blocks (blocks without baseFeePerGas),
    // "merge" for blocks that have baseFeePerGas but not withdrawals,
    // and "shanghai" for blocks with withdrawals
    if (rpcBlock.baseFeePerGas === undefined) {
      common.setHardfork("berlin");
    } else if (rpcBlock.withdrawals === undefined) {
      common.setHardfork("merge");
    } else {
      common.setHardfork("shanghai");
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

      // don't validate things like the size of `extraData` in the header
      skipConsensusFormatValidation: true,
    });

    for (const transaction of rpcBlock.transactions) {
      let tx;
      if (transaction.type === undefined || transaction.type === 0n) {
        tx = new ReadOnlyValidTransaction(
          new Address(transaction.from),
          rpcToTxData(transaction)
        );
      } else if (transaction.type === 1n) {
        tx = new ReadOnlyValidEIP2930Transaction(
          new Address(transaction.from),
          rpcToTxData(transaction)
        );
      } else if (transaction.type === 2n) {
        tx = new ReadOnlyValidEIP1559Transaction(
          new Address(transaction.from),
          rpcToTxData(transaction) as FeeMarketEIP1559TxData
        );
      } else {
        // we try to interpret unknown txs as legacy transactions, to support
        // networks like Arbitrum that have non-standards tx types
        try {
          tx = new ReadOnlyValidUnknownTypeTransaction(
            new Address(transaction.from),
            Number(transaction.type),
            rpcToTxData(transaction)
          );
        } catch (e: any) {
          throw new InternalError(
            `Could not process transaction with type ${transaction.type.toString()}`,
            e
          );
        }
      }

      block.transactions.push(tx);
    }

    this._data.addBlock(block, rpcBlock.totalDifficulty);
    return block;
  }

  protected async _delBlock(blockNumber: bigint): Promise<void> {
    if (blockNumber <= this._forkBlockNumber) {
      throw new Error("Cannot delete remote block");
    }
    await super._delBlock(blockNumber);
    this._latestBlockNumber = blockNumber - 1n;
  }

  private _processRemoteTransaction(rpcTransaction: RpcTransaction | null) {
    if (
      rpcTransaction === null ||
      rpcTransaction.blockNumber === null ||
      rpcTransaction.blockNumber > this._forkBlockNumber
    ) {
      return undefined;
    }

    let transaction: TypedTransaction;

    if (rpcTransaction.type === undefined || rpcTransaction.type === 0n) {
      transaction = new ReadOnlyValidTransaction(
        new Address(rpcTransaction.from),
        rpcToTxData(rpcTransaction)
      );
    } else if (rpcTransaction.type === 1n) {
      transaction = new ReadOnlyValidEIP2930Transaction(
        new Address(rpcTransaction.from),
        rpcToTxData(rpcTransaction)
      );
    } else if (rpcTransaction.type === 2n) {
      transaction = new ReadOnlyValidEIP1559Transaction(
        new Address(rpcTransaction.from),
        rpcToTxData(rpcTransaction) as FeeMarketEIP1559TxData
      );
    } else {
      transaction = new ReadOnlyValidUnknownTypeTransaction(
        new Address(rpcTransaction.from),
        Number(rpcTransaction.type),
        rpcToTxData(rpcTransaction)
      );
    }

    this._data.addTransaction(transaction);

    return transaction;
  }

  private async _processRemoteReceipt(
    txReceipt: RpcTransactionReceipt | null
  ): Promise<RpcReceiptOutput | undefined> {
    if (txReceipt === null || txReceipt.blockNumber > this._forkBlockNumber) {
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
