import type { MinimalInterpreterStep } from "../vm/proxy-vm";

import { HeaderData } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";
import { TxReceipt } from "@nomicfoundation/ethereumjs-vm";
import { assertHardhatInvariant } from "../../../core/errors";
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
    private _hardfork: HardforkName,
    private _mempoolOrder: MempoolOrder,
    private _prevRandaoGenerator: RandomBufferGenerator,
    private _memPool: HardhatMemPool,
    private _vm: VMAdapter
  ) {}

  public async mineBlock(
    blockTimestamp: bigint,
    coinbase: Address,
    minGasPrice: bigint,
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult> {
    const parentBlock = await this._blockchain.getLatestBlock();

    const isPostMerge = hardforkGte(this._hardfork, HardforkName.MERGE);

    const headerData: HeaderData = {
      gasLimit: await this._memPool.getBlockGasLimit(),
      coinbase,
      nonce: isPostMerge ? "0x0000000000000000" : "0x0000000000000042",
      timestamp: blockTimestamp,
      number: (await this._blockchain.getLatestBlockNumber()) + 1n,
    };

    if (isPostMerge) {
      headerData.mixHash = this._prevRandaoGenerator.next();
    }

    let baseFee: bigint | undefined;
    if (hardforkGte(this._hardfork, HardforkName.LONDON)) {
      baseFee =
        baseFeePerGas ??
        (await this._blockchain.getLatestBlock()).header.calcNextBaseFee();

      headerData.baseFeePerGas = baseFee;
    }

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
        baseFee
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
          !this._isTxMinable(tx, minGasPrice, baseFee) ||
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

      const block = await blockBuilder.finalize([[coinbase, minerReward]]);

      const receiptOutput = getRpcReceiptOutputsFromLocalBlockExecution(
        block,
        results,
        shouldShowTransactionTypeForHardfork(this._common)
      );

      await this._blockchain.putBlock(block);
      this._blockchain.addTransactionReceipts(receiptOutput);

      await this._memPool.update();

      const totalDifficultyAfterBlock =
        await this._blockchain.getTotalDifficultyByHash(block.hash());

      assertHardhatInvariant(
        totalDifficultyAfterBlock !== undefined,
        "the total difficulty of the mined block should be defined"
      );

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
        totalDifficultyAfterBlock,
        traces,
      };
    } catch (err) {
      await blockBuilder.revert();

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw err;
    }
  }

  public prevRandaoGeneratorSeed(): Buffer {
    return this._prevRandaoGenerator.seed();
  }

  public setPrevRandaoGeneratorNextValue(nextValue: Buffer): void {
    this._prevRandaoGenerator.setNext(nextValue);
  }

  public onStep(
    _cb: (step: MinimalInterpreterStep, next?: any) => Promise<void>
  ) {
    // not necessary
  }

  private _isTxMinable(
    tx: TypedTransaction,
    minGasPrice: bigint,
    nextBlockBaseFeePerGas?: bigint
  ): boolean {
    const txMaxFee = "gasPrice" in tx ? tx.gasPrice : tx.maxFeePerGas;

    const canPayBaseFee =
      nextBlockBaseFeePerGas !== undefined
        ? txMaxFee >= nextBlockBaseFeePerGas
        : true;

    const atLeastMinGasPrice = txMaxFee >= minGasPrice;

    return canPayBaseFee && atLeastMinGasPrice;
  }
}
