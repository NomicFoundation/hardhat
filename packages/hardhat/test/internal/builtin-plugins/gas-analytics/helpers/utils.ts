import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isWithinTolerance } from "../../../../../src/internal/builtin-plugins/gas-analytics/helpers/utils.js";

describe("isWithinTolerance", () => {
  it("should return true for equal values, even with a tolerance of 0", () => {
    assert.equal(isWithinTolerance(100, 100, 0), true);
    assert.equal(isWithinTolerance(0, 0, 0), true);
  });

  it("should return true for a diff within the tolerance", () => {
    assert.equal(isWithinTolerance(100, 104, 5), true);
    assert.equal(isWithinTolerance(100, 96, 5), true);
  });

  it("should return true for a diff exactly at the tolerance boundary", () => {
    assert.equal(isWithinTolerance(100, 105, 5), true);
    assert.equal(isWithinTolerance(100, 95, 5), true);
  });

  it("should return false for a diff just over the tolerance", () => {
    assert.equal(isWithinTolerance(100, 106, 5), false);
    assert.equal(isWithinTolerance(100, 94, 5), false);
  });

  it("should return false for any nonzero diff when the tolerance is 0", () => {
    assert.equal(isWithinTolerance(100, 101, 0), false);
    assert.equal(isWithinTolerance(100, 99, 0), false);
  });

  it("should return false for any drift from an expected value of 0, regardless of the tolerance", () => {
    assert.equal(isWithinTolerance(0, 1, 100), false);
    assert.equal(isWithinTolerance(0, 1_000_000, 1_000_000), false);
  });

  it("should compute the percentage relative to the expected value", () => {
    // 50 → 51 is a 2% increase relative to `expected`
    assert.equal(isWithinTolerance(50, 51, 2), true);
    assert.equal(isWithinTolerance(50, 51, 1.9), false);
  });

  it("should support fractional tolerances", () => {
    assert.equal(isWithinTolerance(1000, 1005, 0.5), true);
    assert.equal(isWithinTolerance(1000, 1006, 0.5), false);
  });

  it("should not reject boundary values due to floating-point division errors", () => {
    // (49 / 700) * 100 === 7.000000000000001, so a division-based
    // implementation would wrongly return false for these
    assert.equal(isWithinTolerance(700, 749, 7), true);
    assert.equal(isWithinTolerance(700, 651, 7), true);
    assert.equal(isWithinTolerance(7000, 7049, 0.7), true);
  });

  it("should support tolerances of 100 or more", () => {
    assert.equal(isWithinTolerance(100, 200, 100), true);
    assert.equal(isWithinTolerance(100, 0, 100), true);
    assert.equal(isWithinTolerance(100, 350, 300), true);
  });
});
