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
    const [ethereumJSResult, rethnetResult] = await Promise.all([
      this._ethereumJSMiner.mineBlock(
        blockTimestamp,
        minerReward,
        baseFeePerGas
      ),
      this._rethnetMiner.mineBlock(blockTimestamp, minerReward, baseFeePerGas),
    ]);

    assertEqualBlocks(ethereumJSResult.block, rethnetResult.block);
    assertEqualRunBlockResults(
      ethereumJSResult.blockResult,
      rethnetResult.blockResult
    );

    // TODO: assert traces

    return rethnetResult;
  }
}
