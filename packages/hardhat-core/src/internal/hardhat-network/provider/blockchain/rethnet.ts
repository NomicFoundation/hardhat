import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { Blockchain } from "rethnet-evm";
import { BlockchainAdapter } from "../blockchain";
import { RpcReceiptOutput } from "../output";
import { rethnetBlockToEthereumJS } from "../utils/convertToRethnet";
import { bloomFilter, filterLogs } from "../filter";
import { Bloom } from "../utils/bloom";

export class RethnetBlockchain implements BlockchainAdapter {
  constructor(
    private readonly _blockchain: Blockchain,
    private readonly _common: Common
  ) {}

  public asInner(): Blockchain {
    return this._blockchain;
  }

  public async getBlockByHash(hash: Buffer): Promise<Block | undefined> {
    const block = await this._blockchain.blockByHash(hash);
    if (block === null) {
      return undefined;
    }

    return rethnetBlockToEthereumJS(block, this._common);
  }

  public async getBlockByNumber(number: bigint): Promise<Block | undefined> {
    const block = await this._blockchain.blockByNumber(number);
    if (block === null) {
      return undefined;
    }

    return rethnetBlockToEthereumJS(block, this._common);
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined> {
    const block = await this._blockchain.blockByTransactionHash(
      transactionHash
    );
    if (block === null) {
      return undefined;
    }

    return rethnetBlockToEthereumJS(block, this._common);
  }

  public async getLatestBlock(): Promise<Block> {
    const block = await this._blockchain.lastBlock();
    return rethnetBlockToEthereumJS(block, this._common);
  }

  public async getLatestBlockNumber(): Promise<bigint> {
    return this._blockchain.lastBlockNumber();
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    const logs: RpcLogOutput[] = [];
    for (
      let blockNumber = filterParams.fromBlock;
      blockNumber <= filterParams.toBlock;
      blockNumber++
    ) {
      const block = await this._blockchain.blockByNumber(blockNumber);

      if (
        block === null ||
        !bloomFilter(
          new Bloom(block.header.logsBloom),
          filterParams.addresses,
          filterParams.normalizedTopics
        )
      ) {
        continue;
      }
      for (const receipt of block.receipts) {
        logs.push(
          ...filterLogs(
            receipt.logs.map((log) => {
              return [log.address, log.topics, log.data];
            }),
            {
              fromBlock: filterParams.fromBlock,
              toBlock: filterParams.toBlock,
              addresses: filterParams.addresses,
              normalizedTopics: filterParams.normalizedTopics,
            }
          )
        );
      }
    }
    return logs;
  }

  // public async getReceiptByTransactionHash(
  //   transactionHash: Buffer
  // ): Promise<RpcReceiptOutput | undefined> {
  //   const block = await this._blockchain.blockByTransactionHash(
  //     transactionHash
  //   );
  //   if (block === null) {
  //     return undefined;
  //   }

  //   const receiptIdx =block.transactions .findIndex((transaction) => ) receipts.find((receipt) => {
  //     return receipt.
  //   })
  //   const receipt = block.re;

  //   return {
  //     blockHash: hash.toString(),
  //     blockNumber: block.header.number.toString(),
  //     contractAddress: null,
  //     cumulativeGasUsed: block.header.ga,
  //   };
  // }

  public async getTotalDifficultyByHash(
    hash: Buffer
  ): Promise<bigint | undefined> {
    return (await this._blockchain.totalDifficultyByHash(hash)) ?? undefined;
  }
}
