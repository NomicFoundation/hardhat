import { Block } from "@nomicfoundation/ethereumjs-block";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { BlockBuilderAdapter, Reward } from "../block-builder";
import { RunTxResult } from "../vm-adapter";
import {
  assertEqualBlocks,
  assertEqualRunTxResults,
} from "../../utils/assertions";
import { randomHashSeed } from "../../fork/ForkStateManager";
import { getGlobalEdrContext } from "../../context/edr";

export class DualModeBlockBuilder implements BlockBuilderAdapter {
  constructor(
    private _ethereumJSBuilder: BlockBuilderAdapter,
    private _edrBuilder: BlockBuilderAdapter
  ) {}

  public async addTransaction(tx: TypedTransaction): Promise<RunTxResult> {
    const ethereumJSResult = await this._ethereumJSBuilder.addTransaction(tx);
    const edrResult = await this._edrBuilder.addTransaction(tx);

    // Matches EthereumJS' runCall checkpoint call
    getGlobalEdrContext().setStateRootGeneratorSeed(randomHashSeed());

    assertEqualRunTxResults(ethereumJSResult, edrResult);

    return edrResult;
  }

  public async finalize(
    rewards: Reward[],
    _timestamp?: bigint
  ): Promise<Block> {
    const ethereumJSBlock = await this._ethereumJSBuilder.finalize(rewards);
    const edrBlock = await this._edrBuilder.finalize(
      rewards,
      // We have to overwite edr's timestamp, as the blocks might have
      // been made and slightly different times
      ethereumJSBlock.header.timestamp
    );

    assertEqualBlocks(ethereumJSBlock, edrBlock);

    return edrBlock;
  }

  public async revert(): Promise<void> {
    await this._ethereumJSBuilder.revert();
    await this._edrBuilder.revert();
  }

  public async getGasUsed(): Promise<bigint> {
    const [ethereumJSGasUsed, edrGasUsed] = await Promise.all([
      this._ethereumJSBuilder.getGasUsed(),
      this._edrBuilder.getGasUsed(),
    ]);

    if (ethereumJSGasUsed !== edrGasUsed) {
      console.trace(
        `Different gas used in block: ${ethereumJSGasUsed} (ethereumjs) !== ${edrGasUsed} (edr)`
      );

      /* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
      throw new Error("Different gas used in block");
    }

    return edrGasUsed;
  }
}
