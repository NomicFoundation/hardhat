import { describe, it } from "mocha";

describe("suite", () => {
  it("unit_add", () => {});
  // The rest are all dropped by the filter; each throws if it ever runs so the
  // passed count proves exactly unit_add survived, not just that one test did.
  it("unit_sub", () => {
    throw new Error("unit_sub should have been excluded by --grep-exclude");
  });
  it("integration_flow", () => {
    throw new Error("integration_flow should have been excluded by --grep");
  });
  it("testFork_deposit", () => {
    throw new Error("testFork_deposit should have been excluded by --grep");
  });
});
