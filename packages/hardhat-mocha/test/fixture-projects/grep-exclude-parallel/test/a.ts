import { describe, it } from "mocha";

describe("suite_a", () => {
  it("unit_add", () => {});
  // Dropped by --grep-exclude "sub"; throws if it ever runs so the passed
  // count proves which tests survived the filter, not just how many.
  it("unit_sub", () => {
    throw new Error("unit_sub should have been excluded by --grep-exclude");
  });
});
