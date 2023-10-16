import { Address } from "@nomicfoundation/ethereumjs-util";
import { keccak256 } from "../../../util/keccak";
import { globalEdrContext } from "../context/edr";
import { randomHashSeed } from "../fork/ForkStateManager";
import { BlockMinerAdapter, PartialMineBlockResult } from "../miner";
import {
  assertEqualBlocks,
  assertEqualRunBlockResults,
} from "../utils/assertions";

export class DualBlockMiner implements BlockMinerAdapter {
  constructor(
    private _hardhatMiner: BlockMinerAdapter,
    private _edrMiner: BlockMinerAdapter
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

      globalEdrContext.setStateRootGeneratorSeed(stateRootSeed);

      const edrResult = await this._edrMiner.mineBlock(
        blockTimestamp,
        coinbase,
        minGasPrice,
        minerReward,
        baseFeePerGas
      );

      assertEqualBlocks(hardhatResult.block, edrResult.block);
      assertEqualRunBlockResults(
        hardhatResult.blockResult,
        edrResult.blockResult
      );

      // TODO: assert traces

      return edrResult;
    } catch (error) {
      // Ensure that the state root generator seed is re-aligned upon an error
      globalEdrContext.setStateRootGeneratorSeed(randomHashSeed());

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw error;
    }
  }

  public prevRandaoGeneratorSeed(): Buffer {
    const hardhatSeed = this._hardhatMiner.prevRandaoGeneratorSeed();
    const edrSeed = this._edrMiner.prevRandaoGeneratorSeed();

    if (!hardhatSeed.equals(edrSeed)) {
      console.trace(
        `Different prevRandaoGeneratorSeed: ${hardhatSeed.toString(
          "hex"
        )} (ethereumjs) !== ${edrSeed.toString("hex")} (edr)`
      );

      /* eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
      throw new Error("Different prevRandaoGeneratorSeed");
    }

    return edrSeed;
  }

  public setPrevRandaoGeneratorNextValue(nextValue: Buffer): void {
    this._hardhatMiner.setPrevRandaoGeneratorNextValue(nextValue);
    this._edrMiner.setPrevRandaoGeneratorNextValue(nextValue);
  }
}
