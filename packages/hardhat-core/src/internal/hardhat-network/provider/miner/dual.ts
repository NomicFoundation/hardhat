import { keccak256 } from "../../../util/keccak";
import { globalRethnetContext } from "../context/rethnet";
import { randomHashSeed } from "../fork/ForkStateManager";
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
    minGasPrice: bigint,
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult> {
    const previousStateRootSeed = randomHashSeed();

    const ethereumJSResult = await this._ethereumJSMiner.mineBlock(
      blockTimestamp,
      minGasPrice,
      minerReward,
      baseFeePerGas
    );

    const currentStateRootSeed = randomHashSeed();

    // When mining a block, EthereumJS' runCall calls checkpoint multiple times
    // For EDR, we need to skip all of those calls
    let stateRootSeed = previousStateRootSeed;
    let nextStateRootSeed = stateRootSeed;
    while (!nextStateRootSeed.equals(currentStateRootSeed)) {
      stateRootSeed = nextStateRootSeed;
      nextStateRootSeed = keccak256(stateRootSeed);
    }

    globalRethnetContext.setStateRootGeneratorSeed(stateRootSeed);

    const rethnetResult = await this._rethnetMiner.mineBlock(
      blockTimestamp,
      minGasPrice,
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

  public setPrevrandaoGeneratorNextValue(nextValue: Buffer): void {
    this._ethereumJSMiner.setPrevrandaoGeneratorNextValue(nextValue);
    this._rethnetMiner.setPrevrandaoGeneratorNextValue(nextValue);
  }
}
