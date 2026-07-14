import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("Mocha --grep-exclude in parallel mode", () => {
  useFixtureProject("grep-exclude-parallel");

  it("filters across parallel workers", async () => {
    const hardhatConfig = await import(
      "./fixture-projects/grep-exclude-parallel/hardhat.config.js"
    );
    const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

    // Across both files: --grep keeps unit_add, unit_sub, unit_mul;
    // --grep-exclude drops unit_sub, leaving unit_add and unit_mul.
    const result = await hre.tasks.getTask(["test", "mocha"]).run({
      grep: "unit_",
      grepExclude: "sub",
      noCompile: true,
    });

    // The excluded tests (unit_sub, testFork_deposit) throw if they run, so a
    // clean 2-pass/0-fail count means exactly the right tests survived the
    // filter, not just that two of them did.
    assert.deepEqual(result, {
      success: true,
      value: { summary: { failed: 0, passed: 2, skipped: 0, todo: 0 } },
    });
  });
});
