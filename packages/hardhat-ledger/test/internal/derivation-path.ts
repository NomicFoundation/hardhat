import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toDeviceDerivationPath } from "../../src/internal/derivation-path.js";

describe("toDeviceDerivationPath", () => {
  it("should strip the m/ prefix whatever its case", () => {
    // `@ledgerhq/hw-app-eth` accepted `M/`, so a derivation function may use it.
    assert.equal(toDeviceDerivationPath("m/44'/60'/0'/0/0"), "44'/60'/0'/0/0");
    assert.equal(toDeviceDerivationPath("M/44'/60'/0'/0/0"), "44'/60'/0'/0/0");
  });

  it("should leave an already bare path alone", () => {
    assert.equal(toDeviceDerivationPath("44'/60'/0'/0/0"), "44'/60'/0'/0/0");
  });
});
