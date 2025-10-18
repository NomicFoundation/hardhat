import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

describe("Hardhat Mocha env variables", () => {
  useFixtureProject("test-project");

  it("should set the NODE_ENV variable if undefined and HH_TEST always", async () => {
    const { createHardhatRuntimeEnvironment } = await import("hardhat/hre");
    const hardhatConfig = await import(
      "./fixture-projects/test-project/hardhat.config.js"
    );
    const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

    const exitCode = process.exitCode;
    const nodeEnv = process.env.NODE_ENV;
    const hhTest = process.env.HH_TEST;
    try {
      delete process.env.NODE_ENV;
      await hre.tasks.getTask(["test", "mocha"]).run({ noCompile: true });
      assert.equal(process.env.NODE_ENV, "test");
      assert.equal(process.env.HH_TEST, "true");
    } finally {
      process.env.HH_TEST = hhTest;
      process.env.NODE_ENV = nodeEnv;
      process.exitCode = exitCode;
    }
  });
});
