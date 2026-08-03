import { describe, it } from "mocha";

describe("suite_b", () => {
  it("unit_mul", () => {});
  // Dropped by --grep "unit_"; throws if it ever runs so the passed count
  // proves which tests survived the filter, not just how many.
  it("testFork_deposit", () => {
    throw new Error("testFork_deposit should have been excluded by --grep");
  });
});
