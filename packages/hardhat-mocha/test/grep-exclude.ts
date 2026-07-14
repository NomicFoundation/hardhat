import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("Mocha --grep-exclude", () => {
  useFixtureProject("grep-exclude");

  it("keeps --grep matches minus --grep-exclude matches", async () => {
    const hardhatConfig = await import(
      "./fixture-projects/grep-exclude/hardhat.config.js"
    );
    const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

    // Of unit_add, unit_sub, integration_flow, testFork_deposit: --grep keeps
    // the two unit_ tests, --grep-exclude drops unit_sub, leaving unit_add.
    const result = await hre.tasks.getTask(["test", "mocha"]).run({
      grep: "unit_",
      grepExclude: "sub",
      noCompile: true,
    });

    // The excluded tests throw if they run, so a clean 1-pass/0-fail count
    // means exactly unit_add survived the filter, not just that one test did.
    assert.deepEqual(result, {
      success: true,
      value: { summary: { failed: 0, passed: 1, skipped: 0, todo: 0 } },
    });
  });
});
