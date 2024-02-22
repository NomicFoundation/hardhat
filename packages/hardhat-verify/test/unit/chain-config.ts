import { assert } from "chai";
import { builtinChains } from "../../src/internal/chain-config";

describe("Chain Config", () => {
  describe("builtinChains", () => {
    it("should have no duplicate chain ids", () => {
      // check that xdai/gnosis is the only duplicate
      const xdaiGnosisChains = builtinChains.filter(
        ({ chainId }) => chainId === 100
      );
      assert.lengthOf(xdaiGnosisChains, 2);

      // check that there are no duplicates in the rest of the list
      const filteredChainIds = builtinChains.filter(
        ({ chainId }) => chainId !== 100
      );

      const uniqueIds = [...new Set(filteredChainIds)];

      assert.notEqual(0, uniqueIds.length);
      assert.equal(uniqueIds.length, filteredChainIds.length);
    });

    it("should be sorted by chainId in ascending order", () => {
      const isAscending = builtinChains.every(
        ({ chainId }, index) =>
          index === 0 || chainId >= builtinChains[index - 1].chainId
      );

      assert(isAscending);
    });
  });
});
