import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("Hardhat Node plugin", () => {
  useFixtureProject("test-project");

  it("should set the NODE_ENV variable if undefined and HH_TEST always", async () => {
    const baseHhConfig = (
      await import("./fixture-projects/test-project/hardhat.config.js")
    ).default;
    const hre = await createHardhatRuntimeEnvironment(baseHhConfig);

    const exitCode = process.exitCode;
    const nodeEnv = process.env.NODE_ENV;
    const hhTest = process.env.HH_TEST;
    try {
      process.env.NODE_ENV = undefined;
      await hre.tasks.getTask(["test", "nodejs"]).run({ noCompile: true });
      assert.equal(process.env.NODE_ENV, "test");
      assert.equal(process.env.HH_TEST, "true");
    } finally {
      process.env.HH_TEST = hhTest;
      process.env.NODE_ENV = nodeEnv;
      process.exitCode = exitCode;
    }
  });

  it("should not set the NODE_ENV variable if defined before", async () => {
    const baseHhConfig = (
      await import("./fixture-projects/test-project/hardhat.config.js")
    ).default;
    const hre = await createHardhatRuntimeEnvironment(baseHhConfig);

    const exitCode = process.exitCode;
    const nodeEnv = process.env.NODE_ENV;
    const hhTest = process.env.HH_TEST;
    try {
      process.env.NODE_ENV = "HELLO";
      await hre.tasks.getTask(["test", "nodejs"]).run({ noCompile: true });
      assert.equal(process.env.NODE_ENV, "HELLO");
      assert.equal(process.env.HH_TEST, "true");
    } finally {
      process.env.HH_TEST = hhTest;
      process.env.NODE_ENV = nodeEnv;
      process.exitCode = exitCode;
    }
  });
});
