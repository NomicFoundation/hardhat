import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { overrideTask } from "hardhat/config";

import HardhatMochaPlugin from "../src/index.js";

describe("Hardhat Mocha plugin", () => {
  describe("Success", () => {
    useFixtureProject("test-project");

    it("should work", async () => {
      const { createHardhatRuntimeEnvironment } = await import("hardhat/hre");

      const hardhatConfig = await import(
        "./fixture-projects/test-project/hardhat.config.js"
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      const result = await hre.tasks.getTask(["test", "mocha"]).run({});

      assert.deepEqual(result, {
        success: true,
        value: {
          summary: { failed: 0, passed: 2, skipped: 0, todo: 0 },
        },
      });
    });
  });

  describe("Failure", () => {
    useFixtureProject("invalid-mocha-config");

    it("should fail", async () => {
      const { createHardhatRuntimeEnvironment } = await import("hardhat/hre");

      const errors =
        "\t* Config error in config.test.mocha.delay: Expected boolean, received number";

      const hardhatConfig = await import(
        "./fixture-projects/invalid-mocha-config/hardhat.config.js"
      );

      await assertRejectsWithHardhatError(
        createHardhatRuntimeEnvironment(hardhatConfig.default),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
        { errors },
      );
    });
  });

  describe("build invocation", () => {
    useFixtureProject("test-project");

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
      const { createHardhatRuntimeEnvironment } = await import("hardhat/hre");

      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatMochaPlugin],
        tasks: [buildOverride],
      });

      // The task may throw because of the ESM re-run guard, but we only
      // care about the build invocation args captured before that point.
      try {
        await hre.tasks.getTask(["test", "mocha"]).run({});
      } catch {}

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, false);
    });

    it("should call build with noTests when splitTestsCompilation is true", async () => {
      const { createHardhatRuntimeEnvironment } = await import("hardhat/hre");

      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        solidity: {
          version: "0.8.28",
          splitTestsCompilation: true,
        },
        plugins: [HardhatMochaPlugin],
        tasks: [buildOverride],
      });

      try {
        await hre.tasks.getTask(["test", "mocha"]).run({});
      } catch {}

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, true);
    });

    it("should skip compilation when noCompile is true regardless of splitTestsCompilation", async () => {
      const { createHardhatRuntimeEnvironment } = await import("hardhat/hre");

      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatMochaPlugin],
        tasks: [buildOverride],
      });

      try {
        await hre.tasks.getTask(["test", "mocha"]).run({ noCompile: true });
      } catch {}

      assert.equal(buildArgs.length, 0);
    });
  });
});
