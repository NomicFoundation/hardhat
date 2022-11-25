import type { Common } from "@nomicfoundation/ethereumjs-common";
import { Block, HeaderData } from "@nomicfoundation/ethereumjs-block";
import { RLP } from "@nomicfoundation/ethereumjs-rlp";
import { Trie } from "@nomicfoundation/ethereumjs-trie";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Address,
  bigIntToBuffer,
  bufArrToArr,
  intToBuffer,
} from "@nomicfoundation/ethereumjs-util";
import {
  PostByzantiumTxReceipt,
  PreByzantiumTxReceipt,
  TxReceipt,
} from "@nomicfoundation/ethereumjs-vm";
import { fromBigIntLike } from "../../../util/bigint";
import { Bloom } from "../utils/bloom";

import { RunTxResult, VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

type Reward = [address: Address, reward: bigint];

export interface BuildBlockOpts {
  parentBlock: Block;
  headerData?: HeaderData;
}

// ready: can be started
// started: can add txs or rewards
// rewarded: can seal or revert
// sealed: can't do anything
// reverted: can't do anything
type BlockBuilderState =
  | "ready"
  | "started"
  | "rewarded"
  | "sealed"
  | "reverted";

export class BlockBuilder {
  private _state: BlockBuilderState = "ready";
  private _gasUsed = 0n;
  private _transactions: TypedTransaction[] = [];
  private _transactionResults: RunTxResult[] = [];

  constructor(
    private _vm: VMAdapter,
    private _common: Common,
    private _opts: BuildBlockOpts
  ) {}

  public async startBlock(): Promise<void> {
    await this._vm.startBlock();
    this._state = "started";
  }

  public getGasUsed(): bigint {
    return this._gasUsed;
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

  public async addRewards(rewards: Reward[]): Promise<void> {
    if (this._state !== "started") {
      throw new Error(
        `BlockBuilder.addRewards cannot be used in state ${this._state}`
      );
    }

    await this._vm.addBlockRewards(rewards);
    this._state = "rewarded";
  }

  public async seal(): Promise<Block> {
    if (this._state !== "rewarded") {
      throw new Error(
        `BlockBuilder.seal cannot be used in state ${this._state}`
      );
    }

    const stateRoot = await this._vm.getStateRoot();
    const transactionsTrie = await this._getTransactionsTrie();
    const receiptTrie = await this._getReceiptsTrie();
    const logsBloom = this._getLogsBloom();
    const gasUsed = this._gasUsed;
    const timestamp =
      this._opts.headerData?.timestamp ?? Math.round(Date.now() / 1000);

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

    await this._vm.sealBlock();
    this._state = "sealed";

    return block;
  }

  public async revert(): Promise<void> {
    if (this._state !== "started" && this._state !== "rewarded") {
      throw new Error(
        `BlockBuilder.revert cannot be used in state ${this._state}`
      );
    }

    await this._vm.revertBlock();
    this._state = "reverted";
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

function encodeReceipt(receipt: TxReceipt, txType: number) {
  const encoded = Buffer.from(
    RLP.encode(
      bufArrToArr([
        (receipt as PreByzantiumTxReceipt).stateRoot ??
          ((receipt as PostByzantiumTxReceipt).status === 0
            ? Buffer.from([])
            : Buffer.from("01", "hex")),
        bigIntToBuffer(receipt.cumulativeBlockGasUsed),
        receipt.bitvector,
        receipt.logs,
      ])
    )
  );

  if (txType === 0) {
    return encoded;
  }

  // Serialize receipt according to EIP-2718:
  // `typed-receipt = tx-type || receipt-data`
  return Buffer.concat([intToBuffer(txType), encoded]);
}
