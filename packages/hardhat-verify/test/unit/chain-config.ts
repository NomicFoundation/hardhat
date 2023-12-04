import { assert } from "chai";
import { builtinChains } from "../../src/internal/chain-config";

describe("Chain Config", () => {
  describe("builtinChains", () => {
    it("should have no duplicate chain ids", () => {
      const chainIds = builtinChains.map(({ chainId }) => chainId);
      const duplicatedIds = chainIds.filter(
        (id, index) => chainIds.indexOf(id) !== index
      );

      assert.isEmpty(
        duplicatedIds,
        `Duplicate chainIds found: ${duplicatedIds.join(", ")}`
      );
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
