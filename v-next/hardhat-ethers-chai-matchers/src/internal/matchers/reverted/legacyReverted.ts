import { HardhatError } from "@nomicfoundation/hardhat-errors";

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

    throw new HardhatError(
      HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.DEPRECATED_REVERTED_MATCHER,
    );
  });
}
