import { BlockMinerAdapter, PartialMineBlockResult } from "../miner";

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
    const _ethereumJSResult = await this._ethereumJSMiner.mineBlock(
      blockTimestamp,
      minerReward,
      baseFeePerGas
    );
    const rethnetResult = await this._rethnetMiner.mineBlock(
      blockTimestamp,
      minerReward,
      baseFeePerGas
    );

    // TODO: assert

    return rethnetResult;
  }
}
