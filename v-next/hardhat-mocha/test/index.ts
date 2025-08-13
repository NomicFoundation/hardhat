import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

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

      assert.equal(result, 0);
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
});
