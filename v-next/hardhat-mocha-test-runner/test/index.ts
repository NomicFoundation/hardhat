import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

describe("Hardhat Mocha plugin", () => {
  describe("Success", () => {
    useFixtureProject("test-project");

    afterEach(async () => {
      const { _resetGlobalHardhatRuntimeEnvironment } = await import(
        "@ignored/hardhat-vnext"
      );

      _resetGlobalHardhatRuntimeEnvironment();
    });

    it("should work", async () => {
      const hre = await import("@ignored/hardhat-vnext");

      const result = await hre.tasks.getTask("test").run({});

      assert.equal(result, 0);
    });
  });

  describe("Failure", () => {
    useFixtureProject("invalid-mocha-config");

    afterEach(async () => {
      const { _resetGlobalHardhatRuntimeEnvironment } = await import(
        "@ignored/hardhat-vnext"
      );

      _resetGlobalHardhatRuntimeEnvironment();
    });

    it("should fail", async () => {
      const errors =
        "\t* Config error in config.mocha.delay: Expected boolean, received number";

      await assertRejectsWithHardhatError(
        // @ts-expect-error -- we need to invalidate the import cache to re-import the HRE
        import("@ignored/hardhat-vnext?config=invalid"),
        HardhatError.ERRORS.GENERAL.INVALID_CONFIG,
        { errors },
      );
    });
  });
});
