import { Address } from "@nomicfoundation/ethereumjs-util";
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
    private _hardhatMiner: BlockMinerAdapter,
    private _rethnetMiner: BlockMinerAdapter
  ) {}

  public async mineBlock(
    blockTimestamp: bigint,
    coinbase: Address,
    minGasPrice: bigint,
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult> {
    const previousStateRootSeed = randomHashSeed();

    try {
      const hardhatResult = await this._hardhatMiner.mineBlock(
        blockTimestamp,
        coinbase,
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
        coinbase,
        minGasPrice,
        minerReward,
        baseFeePerGas
      );

      assertEqualBlocks(hardhatResult.block, rethnetResult.block);
      assertEqualRunBlockResults(
        hardhatResult.blockResult,
        rethnetResult.blockResult
      );

      // TODO: assert traces

      return rethnetResult;
    } catch (error) {
      // Ensure that the state root generator seed is re-aligned upon an error
      globalRethnetContext.setStateRootGeneratorSeed(randomHashSeed());

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw error;
    }
  }

  public prevrandaoGeneratorSeed(): Buffer {
    const hardhatSeed = this._hardhatMiner.prevrandaoGeneratorSeed();
    const rethnetSeed = this._rethnetMiner.prevrandaoGeneratorSeed();

    if (!hardhatSeed.equals(rethnetSeed)) {
      console.trace(
        `Different prevrandaoGeneratorSeed: ${hardhatSeed.toString(
          "hex"
        )} (ethereumjs) !== ${rethnetSeed.toString("hex")} (rethnet)`
      );

      /* eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error */
      throw new Error("Different prevrandaoGeneratorSeed");
    }

    return rethnetSeed;
  }

  public setPrevrandaoGeneratorNextValue(nextValue: Buffer): void {
    this._hardhatMiner.setPrevrandaoGeneratorNextValue(nextValue);
    this._rethnetMiner.setPrevrandaoGeneratorNextValue(nextValue);
  }
}
