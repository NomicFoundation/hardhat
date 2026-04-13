import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { overrideTask } from "hardhat/config";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import HardhatNodeTestRunnerPlugin from "../src/index.js";

describe("Hardhat Node plugin", () => {
  useFixtureProject("test-project");

  it("should set the NODE_ENV variable if undefined and HH_TEST always", async () => {
    const baseHhConfig = (
      await import("./fixture-projects/test-project/hardhat.config.js")
    ).default;
    const hre = await createHardhatRuntimeEnvironment(baseHhConfig);

    const nodeEnv = process.env.NODE_ENV;
    const hhTest = process.env.HH_TEST;
    try {
      delete process.env.NODE_ENV;
      await hre.tasks.getTask(["test", "nodejs"]).run({ noCompile: true });
      assert.equal(process.env.NODE_ENV, "test");
      assert.equal(process.env.HH_TEST, "true");
    } finally {
      process.env.HH_TEST = hhTest;
      process.env.NODE_ENV = nodeEnv;
    }
  });

  it("should not set the NODE_ENV variable if defined before", async () => {
    const baseHhConfig = (
      await import("./fixture-projects/test-project/hardhat.config.js")
    ).default;
    const hre = await createHardhatRuntimeEnvironment(baseHhConfig);

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
    }
  });

  describe("build invocation", () => {
    function buildArgCaptor() {
      const buildArgs: any[] = [];
      const buildOverride = overrideTask("build")
        .setAction(async () => {
          return {
            default: (args: any) => {
              buildArgs.push(args);
              return { contractRootPaths: [], testRootPaths: [] };
            },
          };
        })
        .build();
      return { buildArgs, buildOverride };
    }

    it("should call build without noTests when splitTestsCompilation is false", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatNodeTestRunnerPlugin],
        tasks: [buildOverride],
      });

      await hre.tasks.getTask(["test", "nodejs"]).run({});

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, false);
    });

    it("should call build with noTests when splitTestsCompilation is true", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        solidity: {
          version: "0.8.28",
          splitTestsCompilation: true,
        },
        plugins: [HardhatNodeTestRunnerPlugin],
        tasks: [buildOverride],
      });

      await hre.tasks.getTask(["test", "nodejs"]).run({});

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, true);
    });

    it("should skip compilation when noCompile is true without splitTestsCompilation", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatNodeTestRunnerPlugin],
        tasks: [buildOverride],
      });

      await hre.tasks.getTask(["test", "nodejs"]).run({ noCompile: true });

      assert.equal(buildArgs.length, 0);
    });

    it("should skip compilation when noCompile is true with splitTestsCompilation", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        solidity: {
          version: "0.8.28",
          splitTestsCompilation: true,
        },
        plugins: [HardhatNodeTestRunnerPlugin],
        tasks: [buildOverride],
      });

      await hre.tasks.getTask(["test", "nodejs"]).run({ noCompile: true });

      assert.equal(buildArgs.length, 0);
    });
  });
});
