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

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

export class DualBlockchain implements BlockchainAdapter {
  constructor(
    private readonly _hardhat: BlockchainAdapter,
    private readonly _rethnet: BlockchainAdapter
  ) {}

  public async blockSupportsHardfork(
    hardfork: HardforkName,
    blockNumberOrPending?: bigint | "pending" | undefined
  ): Promise<boolean> {
    const hardhat = await this._hardhat.blockSupportsHardfork(
      hardfork,
      blockNumberOrPending
    );
    const rethnet = await this._rethnet.blockSupportsHardfork(
      hardfork,
      blockNumberOrPending
    );

    if (hardhat !== rethnet) {
      console.trace(
        `Different support: ${hardhat} (hardhat) !== ${rethnet} (rethnet)`
      );
      throw new Error("Different support");
    }

    return rethnet;
  }

  public async getBlockByHash(hash: Buffer): Promise<Block | undefined> {
    const [hardhatBlock, rethnetBlock] = await Promise.all([
      this._hardhat.getBlockByHash(hash),
      this._rethnet.getBlockByHash(hash),
    ]);

    assertEqualOptionalBlocks(hardhatBlock, rethnetBlock);
    return rethnetBlock;
  }

  public async getBlockByNumber(number: bigint): Promise<Block | undefined> {
    const [hardhatBlock, rethnetBlock] = await Promise.all([
      this._hardhat.getBlockByNumber(number),
      this._rethnet.getBlockByNumber(number),
    ]);

    assertEqualOptionalBlocks(hardhatBlock, rethnetBlock);
    return rethnetBlock;
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined> {
    const [hardhatBlock, rethnetBlock] = await Promise.all([
      this._hardhat.getBlockByTransactionHash(transactionHash),
      this._rethnet.getBlockByTransactionHash(transactionHash),
    ]);

    assertEqualOptionalBlocks(hardhatBlock, rethnetBlock);
    return rethnetBlock;
  }

  public async getLatestBlock(): Promise<Block> {
    const hardhatBlock = await this._hardhat.getLatestBlock();
    const rethnetBlock = (await this._rethnet.getBlockByNumber(
      hardhatBlock.header.number
    ))!;

    assertEqualBlocks(hardhatBlock, rethnetBlock);
    return rethnetBlock;
  }

  public async getLatestBlockNumber(): Promise<bigint> {
    const [hardhatBlockNumber, rethnetBlockNumber] = await Promise.all([
      this._hardhat.getLatestBlockNumber(),
      this._rethnet.getLatestBlockNumber(),
    ]);

    if (hardhatBlockNumber !== rethnetBlockNumber) {
      console.trace(
        `Different latestBlockNumber: ${hardhatBlockNumber} (ethereumjs) !== ${rethnetBlockNumber} (rethnet)`
      );
      throw new Error("Different latestBlockNumber");
    }

    return rethnetBlockNumber;
  }

  public async getLogs(filterParams: FilterParams): Promise<RpcLogOutput[]> {
    const [hardhat, rethnet] = await Promise.all([
      this._hardhat.getLogs(filterParams),
      this._rethnet.getLogs(filterParams),
    ]);

    if (hardhat.length !== rethnet.length) {
      console.trace(
        `Different logs length: ${hardhat.length} (hardhat) !== ${rethnet.length} (rethnet)`
      );
      throw new Error("Different logs length");
    }

    const differences: string[] = [];

    for (let i = 0; i < hardhat.length; i++) {
      const hardhatLog = hardhat[i];
      const rethnetLog = rethnet[i];

      const logDifferences = rpcLogDifferences(hardhatLog, rethnetLog);

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

    return rethnet;
  }

  public async getReceiptByTransactionHash(transactionHash: Buffer) {
    const [hardhat, rethnet] = await Promise.all([
      this._hardhat.getReceiptByTransactionHash(transactionHash),
      this._rethnet.getReceiptByTransactionHash(transactionHash),
    ]);

    assertEqualOptionalReceipts(hardhat, rethnet);

    return rethnet;
  }

  public async getTotalDifficultyByHash(
    hash: Buffer
  ): Promise<bigint | undefined> {
    const [hardhatTotalDifficulty, rethnetTotalDifficulty] = await Promise.all([
      this._hardhat.getTotalDifficultyByHash(hash),
      this._rethnet.getTotalDifficultyByHash(hash),
    ]);

    if (hardhatTotalDifficulty === undefined) {
      if (rethnetTotalDifficulty !== undefined) {
        console.trace(
          "hardhatTotalDifficulty is undefined but rethnetTotalDifficulty is defined"
        );
        throw new Error(
          "hardhatTotalDifficulty is undefined but rethnetTotalDifficulty is defined"
        );
      }
    } else {
      if (rethnetTotalDifficulty === undefined) {
        console.trace(
          "hardhatTotalDifficulty is defined but rethnetTotalDifficulty is undefined"
        );
        throw new Error(
          "hardhatTotalDifficulty is defined but rethnetTotalDifficulty is undefined"
        );
      }
      if (hardhatTotalDifficulty !== rethnetTotalDifficulty) {
        console.trace(
          `Different totalDifficulty: ${hardhatTotalDifficulty} (ethereumjs) !== ${rethnetTotalDifficulty} (rethnet)`
        );
        throw new Error("Different totalDifficulty");
      }
    }

    return rethnetTotalDifficulty;
  }

  public async reserveBlocks(count: bigint, interval: bigint): Promise<void> {
    await Promise.all([
      this._hardhat.reserveBlocks(count, interval),
      this._rethnet.reserveBlocks(count, interval),
    ]);

    // Validate block number
    await this.getLatestBlockNumber();
  }

  public async revertToBlock(blockNumber: bigint): Promise<void> {
    await Promise.all([
      this._hardhat.revertToBlock(blockNumber),
      this._rethnet.revertToBlock(blockNumber),
    ]);

    // Validate we deleted correctly
    await this.getLatestBlock();
    await this.getLatestBlockNumber();
  }
}
