import { Block } from "@nomicfoundation/ethereumjs-block";
import { HardforkName } from "../../../util/hardforks";
import { BlockchainAdapter } from "../blockchain";
import {
  assertEqualBlocks,
  assertEqualOptionalBlocks,
  assertEqualOptionalReceipts,
  rpcLogDifferences,
} from "../utils/assertions";
import { FilterParams } from "../node-types";
import { RpcLogOutput } from "../output";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

export class DualBlockchain implements BlockchainAdapter {
  constructor(
    private readonly _hardhat: BlockchainAdapter,
    private readonly _edr: BlockchainAdapter
  ) {}

  public async getHardforkAtBlockNumber(
    blockNumberOrPending?: bigint | "pending" | undefined
  ): Promise<HardforkName> {
    const hardhat = await this._hardhat.getHardforkAtBlockNumber(
      blockNumberOrPending
    );
    const edr = await this._edr.getHardforkAtBlockNumber(blockNumberOrPending);

    if (hardhat !== edr) {
      console.trace(
        `Different hardfork: ${hardhat} (hardhat) !== ${edr} (edr)`
      );
      throw new Error("Different hardfork");
    }

    return edr;
  }

  public async getBlockByHash(hash: Buffer): Promise<Block | undefined> {
    const [hardhatBlock, edrBlock] = await Promise.all([
      this._hardhat.getBlockByHash(hash),
      this._edr.getBlockByHash(hash),
    ]);

    assertEqualOptionalBlocks(hardhatBlock, edrBlock);
    return edrBlock;
  }

  public async getBlockByNumber(number: bigint): Promise<Block | undefined> {
    const [hardhatBlock, edrBlock] = await Promise.all([
      this._hardhat.getBlockByNumber(number),
      this._edr.getBlockByNumber(number),
    ]);

    assertEqualOptionalBlocks(hardhatBlock, edrBlock);
    return edrBlock;
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined> {
    const [hardhatBlock, edrBlock] = await Promise.all([
      this._hardhat.getBlockByTransactionHash(transactionHash),
      this._edr.getBlockByTransactionHash(transactionHash),
    ]);

    assertEqualOptionalBlocks(hardhatBlock, edrBlock);
    return edrBlock;
  }

  public async getLatestBlock(): Promise<Block> {
    const [hardhatBlock, edrBlock] = await Promise.all([
      await this._hardhat.getLatestBlock(),
      await this._edr.getLatestBlock(),
    ]);

    assertEqualBlocks(hardhatBlock, edrBlock);
    return edrBlock;
  }

  public async getLatestBlockNumber(): Promise<bigint> {
    const [hardhatBlockNumber, edrBlockNumber] = await Promise.all([
      this._hardhat.getLatestBlockNumber(),
      this._edr.getLatestBlockNumber(),
    ]);

    if (hardhatBlockNumber !== edrBlockNumber) {
      console.trace(
        `Different latestBlockNumber: ${hardhatBlockNumber} (ethereumjs) !== ${edrBlockNumber} (edr)`
      );
      throw new Error("Different latestBlockNumber");
    }

    return edrBlockNumber;
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    const [hardhat, edr] = await Promise.all([
      this._hardhat.getLogs(filterParams),
      this._edr.getLogs(filterParams),
    ]);

    if (hardhat.length !== edr.length) {
      console.trace(
        `Different logs length: ${hardhat.length} (hardhat) !== ${edr.length} (edr)`
      );
      throw new Error("Different logs length");
    }

    const differences: string[] = [];

    for (let i = 0; i < hardhat.length; i++) {
      const hardhatLog = hardhat[i];
      const edrLog = edr[i];

      const logDifferences = rpcLogDifferences(hardhatLog, edrLog);

      if (logDifferences.length > 0) {
        differences.push(
          `Log ${i}:\n${logDifferences.map((l) => `  ${l}`).join("\n")}`
        );
      }
    }

    if (differences.length > 0) {
      console.trace(
        `Different logs:\n${differences.map((l) => `  ${l}`).join("\n")}`
      );
      throw new Error("Different logs");
    }

    return edr;
  }

  public async getReceiptByTransactionHash(transactionHash: Buffer) {
    const [hardhat, edr] = await Promise.all([
      this._hardhat.getReceiptByTransactionHash(transactionHash),
      this._edr.getReceiptByTransactionHash(transactionHash),
    ]);

    assertEqualOptionalReceipts(hardhat, edr);

    return edr;
  }

  public async getTotalDifficultyByHash(
    hash: Buffer
  ): Promise<bigint | undefined> {
    const [hardhatTotalDifficulty, edrTotalDifficulty] = await Promise.all([
      this._hardhat.getTotalDifficultyByHash(hash),
      this._edr.getTotalDifficultyByHash(hash),
    ]);

    if (hardhatTotalDifficulty === undefined) {
      if (edrTotalDifficulty !== undefined) {
        console.trace(
          "hardhatTotalDifficulty is undefined but edrTotalDifficulty is defined"
        );
        throw new Error(
          "hardhatTotalDifficulty is undefined but edrTotalDifficulty is defined"
        );
      }
    } else {
      if (edrTotalDifficulty === undefined) {
        console.trace(
          "hardhatTotalDifficulty is defined but edrTotalDifficulty is undefined"
        );
        throw new Error(
          "hardhatTotalDifficulty is defined but edrTotalDifficulty is undefined"
        );
      }
      if (hardhatTotalDifficulty !== edrTotalDifficulty) {
        console.trace(
          `Different totalDifficulty: ${hardhatTotalDifficulty} (ethereumjs) !== ${edrTotalDifficulty} (edr)`
        );
        throw new Error("Different totalDifficulty");
      }
    }

    return edrTotalDifficulty;
  }

  public async reserveBlocks(count: bigint, interval: bigint): Promise<void> {
    await Promise.all([
      this._hardhat.reserveBlocks(count, interval),
      this._edr.reserveBlocks(count, interval),
    ]);

    // Validate block number
    await this.getLatestBlockNumber();
  }

  public async revertToBlock(blockNumber: bigint): Promise<void> {
    await Promise.all([
      this._hardhat.revertToBlock(blockNumber),
      this._edr.revertToBlock(blockNumber),
    ]);

    // Validate we deleted correctly
    await this.getLatestBlock();
    await this.getLatestBlockNumber();
  }
}
