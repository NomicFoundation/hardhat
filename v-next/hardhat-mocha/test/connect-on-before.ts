import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("connectOnBefore", () => {
  useFixtureProject("connect-on-before");

  it("should successfully run a mocha test suite that uses `network.mocha.connectOnBefore`", async () => {
    const hardhatConfig = await import(
      "./fixture-projects/connect-on-before/hardhat.config.js"
    );

    const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

    const result = await hre.tasks.getTask(["test", "mocha"]).run({});

    assert.equal(
      result.failed,
      0,
      "No tests should fail in the example project",
    );
    assert.ok(
      result.passed > 0,
      "There should be passing test in the example project",
    );
  });
});
