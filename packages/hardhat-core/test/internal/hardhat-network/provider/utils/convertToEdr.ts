import { assert } from "chai";

import { hardhatChainsToEdrChainOverrides } from "../../../../../src/internal/hardhat-network/provider/utils/convertToEdr";
import { HardforkName } from "../../../../../src/internal/util/hardforks";

describe("hardhatChainsToEdrChainOverrides", function () {
  it("omits the hardfork activations of an empty history", function () {
    const chainOverrides = hardhatChainsToEdrChainOverrides(
      new Map([[1, { hardforkHistory: new Map() }]])
    );

    assert.deepEqual(chainOverrides, [{ chainId: 1n, name: "Unknown" }]);
  });

  it("converts a hardfork history to block number activations", function () {
    const chainOverrides = hardhatChainsToEdrChainOverrides(
      new Map([
        [
          11155111,
          {
            hardforkHistory: new Map([
              [HardforkName.MERGE, 0],
              [HardforkName.SHANGHAI, 2_990_908],
            ]),
          },
        ],
      ])
    );

    assert.deepEqual(chainOverrides, [
      {
        chainId: 11155111n,
        name: "Unknown",
        hardforkActivationOverrides: [
          { condition: { blockNumber: 0n }, hardfork: HardforkName.MERGE },
          {
            condition: { blockNumber: 2_990_908n },
            hardfork: HardforkName.SHANGHAI,
          },
        ],
      },
    ]);
  });

  it("sorts the hardfork activations by block number", function () {
    const chainOverrides = hardhatChainsToEdrChainOverrides(
      new Map([
        [
          1,
          {
            hardforkHistory: new Map([
              [HardforkName.SHANGHAI, 17_034_870],
              [HardforkName.LONDON, 12_965_000],
            ]),
          },
        ],
      ])
    );

    assert.deepEqual(chainOverrides[0].hardforkActivationOverrides, [
      {
        condition: { blockNumber: 12_965_000n },
        hardfork: HardforkName.LONDON,
      },
      {
        condition: { blockNumber: 17_034_870n },
        hardfork: HardforkName.SHANGHAI,
      },
    ]);
  });

  it("orders hardforks activated at the same block from oldest to newest", function () {
    const chainOverrides = hardhatChainsToEdrChainOverrides(
      new Map([
        [
          1,
          {
            hardforkHistory: new Map([
              [HardforkName.CANCUN, 0],
              [HardforkName.SHANGHAI, 0],
            ]),
          },
        ],
      ])
    );

    assert.deepEqual(chainOverrides[0].hardforkActivationOverrides, [
      { condition: { blockNumber: 0n }, hardfork: HardforkName.SHANGHAI },
      { condition: { blockNumber: 0n }, hardfork: HardforkName.CANCUN },
    ]);
  });
});
