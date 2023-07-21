import { Block } from "@nomicfoundation/ethereumjs-block";
import { BlockchainAdapter } from "../blockchain";
import { assertEqualOptionalBlocks } from "../utils/assertions";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class DualBlockchain implements BlockchainAdapter {
  constructor(
    private readonly _hardhat: BlockchainAdapter,
    private readonly _rethnet: BlockchainAdapter
  ) {}

  public async getBlockByHash(hash: Buffer): Promise<Block | undefined> {
    const hardhatBlock = await this._hardhat.getBlockByHash(hash);
    const rethnetBlock = await this._rethnet.getBlockByHash(hash);

    assertEqualOptionalBlocks(hardhatBlock, rethnetBlock);
    return rethnetBlock;
  }

  public async getBlockByNumber(number: bigint): Promise<Block | undefined> {
    const hardhatBlock = await this._hardhat.getBlockByNumber(number);
    const rethnetBlock = await this._rethnet.getBlockByNumber(number);

    assertEqualOptionalBlocks(hardhatBlock, rethnetBlock);
    return rethnetBlock;
  }

  public async getBlockByTransactionHash(
    transactionHash: Buffer
  ): Promise<Block | undefined> {
    const hardhatBlock = await this._hardhat.getBlockByTransactionHash(
      transactionHash
    );
    const rethnetBlock = await this._rethnet.getBlockByTransactionHash(
      transactionHash
    );

    assertEqualOptionalBlocks(hardhatBlock, rethnetBlock);
    return rethnetBlock;
  }

  public async getLatestBlock(): Promise<Block> {
    const hardhatBlock = await this._hardhat.getLatestBlock();
    const rethnetBlock = await this._rethnet.getLatestBlock();

    assertEqualOptionalBlocks(hardhatBlock, rethnetBlock);
    return rethnetBlock;
  }

  public async getLatestBlockNumber(): Promise<bigint> {
    const hardhatBlockNumber = await this._hardhat.getLatestBlockNumber();
    const rethnetBlockNumber = await this._rethnet.getLatestBlockNumber();

    if (hardhatBlockNumber !== rethnetBlockNumber) {
      console.trace(
        `Different latestBlockNumber: ${hardhatBlockNumber} (ethereumjs) !== ${rethnetBlockNumber} (rethnet)`
      );
      throw new Error("Different latestBlockNumber");
    }

    return rethnetBlockNumber;
  }

  public async getTotalDifficultyByHash(
    hash: Buffer
  ): Promise<bigint | undefined> {
    const hardhatTotalDifficulty = await this._hardhat.getTotalDifficultyByHash(
      hash
    );
    const rethnetTotalDifficulty = await this._rethnet.getTotalDifficultyByHash(
      hash
    );

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
}
