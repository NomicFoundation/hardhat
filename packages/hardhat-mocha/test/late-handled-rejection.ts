import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("Mocha sequential mode with late-handled rejections", () => {
  useFixtureProject("late-handled-rejection");

  it("does not fail the run", async () => {
    const hardhatConfig =
      await import("./fixture-projects/late-handled-rejection/hardhat.config.js");
    const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

    const result = await hre.tasks
      .getTask(["test", "mocha"])
      .run({ noCompile: true });

    assert.deepEqual(result, {
      success: true,
      value: { summary: { failed: 0, passed: 1, skipped: 0, todo: 0 } },
    });
  });
});
