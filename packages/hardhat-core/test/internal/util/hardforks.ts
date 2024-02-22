import { Common } from "@nomicfoundation/ethereumjs-common";
import { assert } from "chai";
import {
  getHardforkName,
  hardforkGte,
  HardforkName,
} from "../../../src/internal/util/hardforks";
import { expectHardhatError } from "../../helpers/errors";
import { ERRORS } from "../../../src/internal/core/errors-list";

describe("Hardfork utils", function () {
  describe("HardforkName", function () {
    it("Only has hardforks that ethereumjs recognizes", function () {
      for (const name of Object.values(HardforkName)) {
        if (name === "merge") {
          // the merge hardfork changed its name in ethereumjs, but we can't change it
          // because it would be a breaking change
          continue;
        }
        assert.doesNotThrow(
          () => new Common({ chain: "mainnet", hardfork: name })
        );
      }
    });
  });

  describe("getHardforkName", function () {
    it("Throws on invalid hardforks", function () {
      expectHardhatError(() => {
        getHardforkName("asd");
      }, ERRORS.GENERAL.ASSERTION_ERROR);

      expectHardhatError(() => {
        getHardforkName("berling");
      }, ERRORS.GENERAL.ASSERTION_ERROR);
    });

    it("Returns the right hardfork name", function () {
      assert.strictEqual("spuriousDragon", HardforkName.SPURIOUS_DRAGON);
      assert.strictEqual("byzantium", HardforkName.BYZANTIUM);
      assert.strictEqual("berlin", HardforkName.BERLIN);
      assert.strictEqual("london", HardforkName.LONDON);
      assert.strictEqual("arrowGlacier", HardforkName.ARROW_GLACIER);
      assert.strictEqual("grayGlacier", HardforkName.GRAY_GLACIER);
      assert.strictEqual("merge", HardforkName.MERGE);
      assert.strictEqual("shanghai", HardforkName.SHANGHAI);
      assert.strictEqual("cancun", HardforkName.CANCUN);
    });
  });

  describe("hardforkGte", function () {
    it("Should return the right result for each pair of HFs", function () {
      const common = new Common({ chain: "mainnet" });

      for (const hfa of Object.values(HardforkName)) {
        if (hfa === "merge") {
          // see comment above
          continue;
        }
        for (const hfb of Object.values(HardforkName)) {
          if (hfb === "merge") {
            // see comment above
            continue;
          }
          assert.strictEqual(
            hardforkGte(hfa, hfb),
            common.hardforkGteHardfork(hfa, hfb)
          );
        }
      }
    });
  });
});
