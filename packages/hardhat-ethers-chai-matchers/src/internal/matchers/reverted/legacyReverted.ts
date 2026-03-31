import { assert as chaiAssert } from "chai";

import { LEGACY_REVERTED_MATCHER } from "../../constants.js";

export function supportLegacyReverted(
  Assertion: Chai.AssertionStatic,
  _chaiUtils: Chai.ChaiUtils,
): void {
  Assertion.addProperty(LEGACY_REVERTED_MATCHER, function () {
    // We handle the promise rejection, if any
    if (this._obj instanceof Promise) {
      this._obj.catch(() => {});
    }

    chaiAssert.fail(
      "The .reverted matcher has been deprecated. Use .revert(ethers) instead.",
    );
  });
}
