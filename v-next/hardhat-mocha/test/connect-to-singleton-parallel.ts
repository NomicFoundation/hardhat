import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("connect-to-singleton (parallel)", () => {
  useFixtureProject("connect-to-singleton");

  it("should successfully run a mocha test suite that uses `network.mocha.connectToSingleton`", async () => {
    const hardhatConfig = await import(
      "./fixture-projects/connect-to-singleton/hardhat.config.js"
    );

    const hre = await createHardhatRuntimeEnvironment({
      ...hardhatConfig.default,
      test: {
        mocha: {
          parallel: true,
        },
      },
    });

    const result = await hre.tasks.getTask(["test", "mocha"]).run({});

    assert.equal(result.success, true, "Test run should succeed");
    assert.equal(
      result.value.summary.failed,
      0,
      "No tests should fail in the example project",
    );
    assert.ok(
      result.value.summary.passed > 0,
      "There should be passing tests in the example project",
    );
  });
});
