import { Block } from "@nomicfoundation/ethereumjs-block";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { BlockBuilderAdapter, Reward } from "../block-builder";
import { RunTxResult } from "../vm-adapter";
import {
  assertEqualBlocks,
  assertEqualRunTxResults,
} from "../../utils/assertions";
import { randomHashSeed } from "../../fork/ForkStateManager";
import { globalRethnetContext } from "../../context/rethnet";

export class DualModeBlockBuilder implements BlockBuilderAdapter {
  constructor(
    private _ethereumJSBuilder: BlockBuilderAdapter,
    private _rethnetBuilder: BlockBuilderAdapter
  ) {}

  public async addTransaction(tx: TypedTransaction): Promise<RunTxResult> {
    const ethereumJSResult = await this._ethereumJSBuilder.addTransaction(tx);
    const rethnetResult = await this._rethnetBuilder.addTransaction(tx);

    // Matches EthereumJS' runCall checkpoint call
    globalRethnetContext.setHashGeneratorSeed(randomHashSeed());

    assertEqualRunTxResults(ethereumJSResult, rethnetResult);

    return rethnetResult;
  }

  public async finalize(
    rewards: Reward[],
    _timestamp?: bigint
  ): Promise<Block> {
    const ethereumJSBlock = await this._ethereumJSBuilder.finalize(rewards);
    const rethnetBlock = await this._rethnetBuilder.finalize(
      rewards,
      // We have to overwite rethnet's timestamp, as the blocks might have
      // been made and slightly different times
      ethereumJSBlock.header.timestamp
    );

    assertEqualBlocks(ethereumJSBlock, rethnetBlock);

    return rethnetBlock;
  }

  public async revert(): Promise<void> {
    await this._ethereumJSBuilder.revert();
    await this._rethnetBuilder.revert();
  }

  public async getGasUsed(): Promise<bigint> {
    const [ethereumJSGasUsed, rethnetGasUsed] = await Promise.all([
      this._ethereumJSBuilder.getGasUsed(),
      this._rethnetBuilder.getGasUsed(),
    ]);

    if (ethereumJSGasUsed !== rethnetGasUsed) {
      console.trace(
        `Different gas used in block: ${ethereumJSGasUsed} (ethereumjs) !== ${rethnetGasUsed} (rethnet)`
      );

      /* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
      throw new Error("Different gas used in block");
    }

    return rethnetGasUsed;
  }
}
