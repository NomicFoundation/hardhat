import type { Common } from "@nomicfoundation/ethereumjs-common";
import { Block } from "@nomicfoundation/ethereumjs-block";
import { RLP } from "@nomicfoundation/ethereumjs-rlp";
import { Trie } from "@nomicfoundation/ethereumjs-trie";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { fromBigIntLike } from "../../../../util/bigint";
import { Bloom } from "../../utils/bloom";

import {
  BlockBuilderAdapter,
  BuildBlockOpts,
  Reward,
  encodeReceipt,
} from "../block-builder";
import { RunTxResult, VMAdapter } from "../vm-adapter";
import { getCurrentTimestamp } from "../../utils/getCurrentTimestamp";

// started: can add txs or rewards
// sealed: can't do anything
// reverted: can't do anything
type BlockBuilderState = "started" | "sealed" | "reverted";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class HardhatBlockBuilder implements BlockBuilderAdapter {
  private _state: BlockBuilderState = "started";
  private _gasUsed = 0n;
  private _transactions: TypedTransaction[] = [];
  private _transactionResults: RunTxResult[] = [];

  constructor(
    private _vm: VMAdapter,
    private _common: Common,
    private _opts: BuildBlockOpts,
    private _blockStartStateRoot: Buffer
  ) {}

  public static async create(
    vm: VMAdapter,
    common: Common,
    opts: BuildBlockOpts
  ): Promise<HardhatBlockBuilder> {
    const blockStartStateRoot = await vm.getStateRoot();

    return new HardhatBlockBuilder(vm, common, opts, blockStartStateRoot);
  }

  public async addTransaction(tx: TypedTransaction): Promise<RunTxResult> {
    if (this._state !== "started") {
      throw new Error(
        `BlockBuilder.addTransaction cannot be used in state ${this._state}`
      );
    }

    const blockGasLimit =
      fromBigIntLike(this._opts.headerData?.gasLimit) ?? 1_000_000n;
    const blockGasRemaining = blockGasLimit - this._gasUsed;
    if (tx.gasLimit > blockGasRemaining) {
      throw new Error(
        "tx has a higher gas limit than the remaining gas in the block"
      );
    }

    const header = {
      ...this._opts.headerData,
      gasUsed: this._gasUsed,
    };

    if (header.number === undefined) {
      header.number = this._opts.parentBlock.header.number + 1n;
    }

    const blockData = { header, transactions: this._transactions };
    const block = Block.fromBlockData(blockData, {
      common: this._common,
      skipConsensusFormatValidation: true,
      calcDifficultyFromHeader: this._opts.parentBlock.header,
    });

    const [result] = await this._vm.runTxInBlock(tx, block);

    this._transactions.push(tx);
    this._transactionResults.push(result);
    this._gasUsed += result.gasUsed;

    return result;
  }

  public async finalize(rewards: Reward[]): Promise<Block> {
    if (this._state !== "started") {
      throw new Error(
        `BlockBuilder.seal cannot be used in state ${this._state}`
      );
    }

    for (const [address, reward] of rewards) {
      const account = await this._vm.getAccount(address);
      account.balance += reward;
      await this._vm.putAccount(address, account);
    }

    const stateRoot = await this._vm.getStateRoot();
    const transactionsTrie = await this._getTransactionsTrie();
    const receiptTrie = await this._getReceiptsTrie();
    const logsBloom = this._getLogsBloom();
    const gasUsed = this._gasUsed;
    const timestamp = this._opts.headerData?.timestamp ?? getCurrentTimestamp();

    const headerData = {
      ...this._opts.headerData,
      stateRoot,
      transactionsTrie,
      receiptTrie,
      logsBloom,
      gasUsed,
      timestamp,
    };

    const blockData = {
      header: {
        ...headerData,
        parentHash:
          this._opts.headerData?.parentHash ?? this._opts.parentBlock.hash(),
        number:
          this._opts.headerData?.number ??
          this._opts.parentBlock.header.number + BigInt(1),
        gasLimit:
          this._opts.headerData?.gasLimit ??
          this._opts.parentBlock.header.gasLimit,
      },
      transactions: this._transactions,
    };

    const block = Block.fromBlockData(blockData, {
      common: this._common,
      skipConsensusFormatValidation: true,
      calcDifficultyFromHeader: this._opts.parentBlock.header,
    });

    this._state = "sealed";

    return block;
  }

  public async revert(): Promise<void> {
    if (this._state !== "started") {
      throw new Error(
        `BlockBuilder.revert cannot be used in state ${this._state}`
      );
    }

    await this._vm.restoreContext(this._blockStartStateRoot!);

    this._state = "reverted";
  }

  public async getGasUsed(): Promise<bigint> {
    return this._gasUsed;
  }

  public getTransactionResults(): RunTxResult[] {
    return this._transactionResults;
  }

  private async _getTransactionsTrie(): Promise<Buffer> {
    const trie = new Trie();
    for (const [i, tx] of this._transactions.entries()) {
      await trie.put(Buffer.from(RLP.encode(i)), tx.serialize());
    }
    return trie.root();
  }

  private async _getReceiptsTrie(): Promise<Buffer> {
    const receiptTrie = new Trie();
    for (const [i, txResult] of this._transactionResults.entries()) {
      const tx = this._transactions[i];
      const encodedReceipt = encodeReceipt(txResult.receipt, tx.type);
      await receiptTrie.put(Buffer.from(RLP.encode(i)), encodedReceipt);
    }
    return receiptTrie.root();
  }

  private _getLogsBloom(): Buffer {
    const bloom = new Bloom();
    for (const txResult of this._transactionResults) {
      // Combine blooms via bitwise OR
      bloom.or(txResult.bloom);
    }
    return bloom.bitvector;
  }
}
