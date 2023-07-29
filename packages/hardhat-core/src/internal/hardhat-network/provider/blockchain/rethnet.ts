import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { Blockchain } from "rethnet-evm";
import { HardforkName } from "../../../util/hardforks";
import { BlockchainAdapter } from "../blockchain";
import { RpcLogOutput, RpcReceiptOutput } from "../output";
import {
  ethereumsjsHardforkToRethnetSpecId,
  rethnetBlockToEthereumJS,
  rethnetLogToEthereumJS,
  rethnetReceiptToEthereumJS,
} from "../utils/convertToRethnet";
import { FilterParams } from "../node-types";
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

  public async blockSupportsHardfork(
    hardfork: HardforkName,
    blockNumberOrPending?: bigint | "pending"
  ): Promise<boolean> {
    const blockNumber =
      blockNumberOrPending === undefined || blockNumberOrPending === "pending"
        ? await this._blockchain.lastBlockNumber()
        : blockNumberOrPending;

    return this._blockchain.blockSupportsSpec(
      blockNumber,
      ethereumsjsHardforkToRethnetSpecId(hardfork)
    );
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
              return rethnetLogToEthereumJS(log);
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

  public async getReceiptByTransactionHash(
    transactionHash: Buffer
  ): Promise<RpcReceiptOutput | undefined> {
    const receipt = await this._blockchain.receiptByTransactionHash(
      transactionHash
    );

    if (receipt === null) {
      return undefined;
    }

    return rethnetReceiptToEthereumJS(receipt);
  }

  public async getTotalDifficultyByHash(
    hash: Buffer
  ): Promise<bigint | undefined> {
    return (await this._blockchain.totalDifficultyByHash(hash)) ?? undefined;
  }

  public async revertToBlock(blockNumber: bigint): Promise<void> {
    await this._blockchain.revertToBlock(blockNumber);
  }
}
