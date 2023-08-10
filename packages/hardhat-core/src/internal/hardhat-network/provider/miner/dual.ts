import { BlockMinerAdapter, PartialMineBlockResult } from "../miner";
import {
  assertEqualBlocks,
  assertEqualRunBlockResults,
} from "../utils/assertions";

export class DualBlockMiner implements BlockMinerAdapter {
  constructor(
    private _ethereumJSMiner: BlockMinerAdapter,
    private _rethnetMiner: BlockMinerAdapter
  ) {}

  public async mineBlock(
    blockTimestamp: bigint,
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult> {
    const ethereumJSResult = await this._ethereumJSMiner.mineBlock(
      blockTimestamp,
      minerReward,
      baseFeePerGas
    );
    const rethnetResult = await this._rethnetMiner.mineBlock(
      blockTimestamp,
      minerReward,
      baseFeePerGas
    );

    assertEqualBlocks(ethereumJSResult.block, rethnetResult.block);
    assertEqualRunBlockResults(
      ethereumJSResult.blockResult,
      rethnetResult.blockResult
    );

    // TODO: assert traces

    return rethnetResult;
  }

  public async mineBlocks(
    blockTimestamp: bigint,
    minerReward: bigint,
    count: bigint,
    interval: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult[]> {
    const _ethereumJSResult = await this._ethereumJSMiner.mineBlocks(
      blockTimestamp,
      minerReward,
      count,
      interval,
      baseFeePerGas
    );
    const rethnetResult = await this._rethnetMiner.mineBlocks(
      blockTimestamp,
      minerReward,
      count,
      interval,
      baseFeePerGas
    );

    // TODO: assert

    return rethnetResult;
  }
}
