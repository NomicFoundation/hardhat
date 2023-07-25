import { HeaderData } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";
import { TxReceipt } from "@nomicfoundation/ethereumjs-vm";
import { HardforkName, hardforkGte } from "../../../util/hardforks";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";
import { RandomBufferGenerator } from "../utils/random";
import { PartialTrace, RunTxResult, VMAdapter } from "../vm/vm-adapter";
import { BlockMinerAdapter, PartialMineBlockResult } from "../miner";
import { MempoolOrder } from "../node-types";
import { TransactionQueue } from "../TransactionQueue";
import { HardhatMemPool } from "../mem-pool/hardhat";
import {
  getRpcReceiptOutputsFromLocalBlockExecution,
  shouldShowTransactionTypeForHardfork,
} from "../output";

export class HardhatBlockMiner implements BlockMinerAdapter {
  constructor(
    private _blockchain: HardhatBlockchainInterface,
    private _common: Common,
    private _coinbase: Address,
    private _hardfork: HardforkName,
    private _mempoolOrder: MempoolOrder,
    private _minGasPrice: bigint,
    private _prevRandaoGenerator: RandomBufferGenerator,
    private _memPool: HardhatMemPool,
    private _vm: VMAdapter
  ) {}

  public async mineBlock(
    blockTimestamp: bigint,
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult> {
    const parentBlock = await this._blockchain.getLatestBlock();

    const isPostMerge = hardforkGte(this._hardfork, HardforkName.MERGE);

    const headerData: HeaderData = {
      gasLimit: await this._memPool.getBlockGasLimit(),
      coinbase: this._coinbase,
      nonce: isPostMerge ? "0x0000000000000000" : "0x0000000000000042",
      timestamp: blockTimestamp,
      number: (await this._blockchain.getLatestBlockNumber()) + 1n,
    };

    if (isPostMerge) {
      headerData.mixHash = this._prevRandaoGenerator.next();
    }

    headerData.baseFeePerGas =
      baseFeePerGas ??
      (await this._blockchain.getLatestBlock()).header.calcNextBaseFee();

    const blockBuilder = await this._vm.createBlockBuilder(this._common, {
      parentBlock,
      headerData,
    });

    try {
      const blockGasLimit = await this._memPool.getBlockGasLimit();
      const minTxFee = this._common.param("gasPrices", "tx");
      const pendingTxs = this._memPool.getOrderedPendingTransactions();
      const transactionQueue = new TransactionQueue(
        pendingTxs,
        this._mempoolOrder,
        headerData.baseFeePerGas
      );

      let tx = transactionQueue.getNextTransaction();

      const results: RunTxResult[] = [];
      const receipts: TxReceipt[] = [];
      const traces: PartialTrace[] = [];

      while (
        blockGasLimit - (await blockBuilder.getGasUsed()) >= minTxFee &&
        tx !== undefined
      ) {
        if (
          !this._isTxMinable(tx, headerData.baseFeePerGas) ||
          tx.gasLimit > blockGasLimit - (await blockBuilder.getGasUsed())
        ) {
          transactionQueue.removeLastSenderTransactions();
        } else {
          const txResult = await blockBuilder.addTransaction(tx);

          results.push(txResult);
          receipts.push(txResult.receipt);
          traces.push(this._vm.getLastTraceAndClear());
        }

        tx = transactionQueue.getNextTransaction();
      }

      const block = await blockBuilder.finalize([
        [this._coinbase, minerReward],
      ]);

      const receiptOutput = getRpcReceiptOutputsFromLocalBlockExecution(
        block,
        results,
        shouldShowTransactionTypeForHardfork(this._common)
      );

      await this._blockchain.putBlock(block);
      this._blockchain.addTransactionReceipts(receiptOutput);

      await this._memPool.update();

      return {
        block,
        blockResult: {
          results,
          receipts,
          stateRoot: block.header.stateRoot,
          logsBloom: block.header.logsBloom,
          receiptsRoot: block.header.receiptTrie,
          gasUsed: block.header.gasUsed,
        },
        traces,
      };
    } catch (err) {
      await blockBuilder.revert();

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw err;
    }
  }

  public async mineBlocks(
    blockTimestamp: bigint,
    minerReward: bigint,
    count: bigint,
    interval: bigint,
    baseFeePerGas?: bigint | undefined
  ): Promise<PartialMineBlockResult[]> {
    const mineBlockResults: PartialMineBlockResult[] = [];

    // we always mine the first block, and we don't apply the interval for it
    mineBlockResults.push(
      await this.mineBlock(blockTimestamp, minerReward, baseFeePerGas)
    );

    // helper function to mine a block with a timstamp that respects the
    // interval
    const mineBlock = async () => {
      blockTimestamp += interval;
      mineBlockResults.push(
        await this.mineBlock(blockTimestamp, minerReward, baseFeePerGas)
      );
    };

    // then we mine any pending transactions
    while (
      count > mineBlockResults.length &&
      (await this._memPool.hasPendingTransactions())
    ) {
      await mineBlock();
    }

    // If there is at least one remaining block, we mine one. This way, we
    // guarantee that there's an empty block immediately before and after the
    // reservation. This makes the logging easier to get right.
    if (count > mineBlockResults.length) {
      await mineBlock();
    }

    const remainingBlockCount = count - BigInt(mineBlockResults.length);

    // There should be at least 2 blocks left for the reservation to work,
    // because we always mine a block after it. But here we use a bigger
    // number to err on the safer side.
    if (remainingBlockCount <= 5) {
      // if there are few blocks left to mine, we just mine them
      while (count > mineBlockResults.length) {
        await mineBlock();
      }

      return mineBlockResults;
    }

    // otherwise, we reserve a range and mine the last one
    const latestBlock = await this._blockchain.getLatestBlock();
    this._blockchain.reserveBlocks(
      remainingBlockCount - 1n,
      interval,
      await this._vm.getStateRoot(),
      (await this._blockchain.getTotalDifficultyByHash(latestBlock.hash()))!,
      latestBlock.header.baseFeePerGas
    );

    await mineBlock();

    return mineBlockResults;
  }

  private _isTxMinable(
    tx: TypedTransaction,
    nextBlockBaseFeePerGas?: bigint
  ): boolean {
    const txMaxFee = "gasPrice" in tx ? tx.gasPrice : tx.maxFeePerGas;

    const canPayBaseFee =
      nextBlockBaseFeePerGas !== undefined
        ? txMaxFee >= nextBlockBaseFeePerGas
        : true;

    const atLeastMinGasPrice = txMaxFee >= this._minGasPrice;

    return canPayBaseFee && atLeastMinGasPrice;
  }
}
