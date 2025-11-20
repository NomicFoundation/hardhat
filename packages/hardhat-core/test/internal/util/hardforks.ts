import { assert } from "chai";
import {
  getHardforkName,
  HardforkName,
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
    });
  });
});
