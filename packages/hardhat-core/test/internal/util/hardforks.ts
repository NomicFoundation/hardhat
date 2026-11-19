import { l1HardforkLatest, l1HardforkToString } from "@nomicfoundation/edr";
import { assert } from "chai";
import {
  getHardforkName,
  hardforkGte,
  HardforkName,
  LATEST_STABLE_HARDFORK,
  warnIfExperimentalHardfork,
} from "../../../src/internal/util/hardforks";
import { expectHardhatError } from "../../helpers/errors";
import { ERRORS } from "../../../src/internal/core/errors-list";

describe("Hardfork utils", function () {
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
      assert.equal("spuriousDragon", HardforkName.SPURIOUS_DRAGON);
      assert.equal("byzantium", HardforkName.BYZANTIUM);
      assert.equal("berlin", HardforkName.BERLIN);
      assert.equal("london", HardforkName.LONDON);
      assert.equal("arrowGlacier", HardforkName.ARROW_GLACIER);
      assert.equal("grayGlacier", HardforkName.GRAY_GLACIER);
      assert.equal("merge", HardforkName.MERGE);
      assert.equal("shanghai", HardforkName.SHANGHAI);
      assert.equal("cancun", HardforkName.CANCUN);
      assert.equal("prague", HardforkName.PRAGUE);
      assert.equal("osaka", HardforkName.OSAKA);
      assert.equal("amsterdam", HardforkName.AMSTERDAM);
    });
  });

  describe("hardforkGte", function () {
    it("orders amsterdam after osaka", function () {
      assert.isTrue(hardforkGte(HardforkName.AMSTERDAM, HardforkName.OSAKA));
      assert.isFalse(hardforkGte(HardforkName.OSAKA, HardforkName.AMSTERDAM));
    });
  });

  describe("warnIfExperimentalHardfork", function () {
    it("does not warn for the latest stable hardfork or an older one", function () {
      const warnings: string[] = [];
      warnIfExperimentalHardfork(HardforkName.OSAKA, (m) => warnings.push(m));
      warnIfExperimentalHardfork(HardforkName.PRAGUE, (m) => warnings.push(m));

      assert.deepEqual(warnings, []);
    });

    it("warns once for an experimental hardfork", function () {
      const warnings: string[] = [];
      warnIfExperimentalHardfork(HardforkName.AMSTERDAM, (m) =>
        warnings.push(m)
      );
      warnIfExperimentalHardfork(HardforkName.AMSTERDAM, (m) =>
        warnings.push(m)
      );

      assert.lengthOf(warnings, 1);
      assert.include(
        warnings[0],
        '"amsterdam" hardfork, which is experimental'
      );
      assert.include(warnings[0], 'The latest stable hardfork is "osaka"');
    });
  });

  describe("LATEST_STABLE_HARDFORK", function () {
    it("matches EDR's latest hardfork", function () {
      assert.equal(
        LATEST_STABLE_HARDFORK,
        l1HardforkToString(l1HardforkLatest())
      );
    });
  });
});
