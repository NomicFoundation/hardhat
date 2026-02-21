import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("hardhat-ethers-chai-matchers plugin works with connectOnBefore", () => {
  useFixtureProject("connect-on-before");

  it("should load the plugin via hook and use the functionalities in a mocha test", async () => {
    const hardhatConfig = await import(
      "./fixture-projects/connect-on-before/hardhat.config.js"
    );

    const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

    await hre.network.connect();

    const result = await hre.tasks.getTask(["test", "mocha"]).run({
      testFiles: ["./test/connect-on-before-ethers-chai-matchers-usage.ts"],
    });

    assert.deepEqual(result, { failed: 0, passed: 1 });
  });
});
