import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { Blockchain, Block as EdrBlock, State } from "@ignored/edr";
import { HardforkName, getHardforkName } from "../../../util/hardforks";
import { BlockchainAdapter } from "../blockchain";
import { RpcLogOutput, RpcReceiptOutput } from "../output";
import {
  edrBlockToEthereumJS,
  edrLogToEthereumJS,
  edrReceiptToEthereumJS,
  edrSpecIdToEthereumHardfork,
} from "../utils/convertToEdr";
import { FilterParams } from "../node-types";
import { bloomFilter, filterLogs } from "../filter";
import { Bloom } from "../utils/bloom";
import { EdrIrregularState } from "../EdrIrregularState";

export class EdrBlockchain implements BlockchainAdapter {
  constructor(
    private readonly _blockchain: Blockchain,
    private readonly _irregularState: EdrIrregularState,
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

    return edrBlockToEthereumJS(block, this._createCommonForBlock(block));
  }

  public async getBlockByNumber(number: bigint): Promise<Block | undefined> {
    const block = await this._blockchain.blockByNumber(number);
    if (block === null) {
      return undefined;
    }

    return edrBlockToEthereumJS(block, this._createCommonForBlock(block));
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

    return edrBlockToEthereumJS(block, this._createCommonForBlock(block));
  }

  public async getHardforkAtBlockNumber(
    blockNumberOrPending?: bigint | "pending"
  ): Promise<HardforkName> {
    if (
      blockNumberOrPending === undefined ||
      blockNumberOrPending === "pending"
    ) {
      return edrSpecIdToEthereumHardfork(await this._blockchain.specId());
    }

    const specId = await this._blockchain.specAtBlockNumber(
      blockNumberOrPending
    );
    return edrSpecIdToEthereumHardfork(specId);
  }

  public async getLatestBlock(): Promise<Block> {
    const block = await this._blockchain.lastBlock();
    return edrBlockToEthereumJS(block, this._createCommonForBlock(block));
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
      const receipts = await block.receipts();
      for (const receipt of receipts) {
        logs.push(
          ...filterLogs(
            receipt.logs.map((log) => {
              return edrLogToEthereumJS(log);
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

    return edrReceiptToEthereumJS(
      receipt,
      getHardforkName(this._common.hardfork())
    );
  }

  public async getStateAtBlockNumber(blockNumber: bigint): Promise<State> {
    return this._blockchain.stateAtBlockNumber(
      blockNumber,
      this._irregularState.asInner()
    );
  }

  public async getTotalDifficultyByHash(
    hash: Buffer
  ): Promise<bigint | undefined> {
    return (await this._blockchain.totalDifficultyByHash(hash)) ?? undefined;
  }

  public async reserveBlocks(count: bigint, interval: bigint): Promise<void> {
    await this._blockchain.reserveBlocks(count, interval);
  }

  public async revertToBlock(blockNumber: bigint): Promise<void> {
    await this._blockchain.revertToBlock(blockNumber);
  }

  private _createCommonForBlock(block: EdrBlock): Common {
    const common = this._common.copy();

    // We set the common's hardfork depending on the remote block fields, to
    // prevent ethereumjs from throwing if unsupported fields are passed.
    // We use "berlin" for pre-EIP-1559 blocks (blocks without baseFeePerGas),
    // "merge" for blocks that have baseFeePerGas but not withdrawals,
    // and "shanghai" for blocks with withdrawals
    if (block.header.baseFeePerGas === undefined) {
      common.setHardfork("berlin");
    } else if (block.header.withdrawalsRoot === undefined) {
      common.setHardfork("merge");
    } else {
      common.setHardfork("shanghai");
    }

    return common;
  }
}
