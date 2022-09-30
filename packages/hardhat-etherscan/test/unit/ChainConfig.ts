import { assert } from "chai";
import { chainConfig } from "../../src/ChainConfig";

describe("Chain Config", () => {
  it("should have no duplicate chain ids", () => {
    const chainIds: number[] = Object.values(chainConfig).map(
      (config) => config.chainId
    );

    // check that xdai/gnosis is the only duplicate
    const xdaiGnosisChains = chainIds.filter((obj) => obj === 100);
    assert.lengthOf(xdaiGnosisChains, 2);

    // check that there are no duplicates in the rest of the list
    const filteredChainIds = chainIds.filter((obj) => obj !== 100);

    const uniqueIds = [...new Set(filteredChainIds)];

    assert.notEqual(0, uniqueIds.length);
    assert.equal(uniqueIds.length, filteredChainIds.length);
  });
});
