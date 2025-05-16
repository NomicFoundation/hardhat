import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-initialization.js";
import hardhatConfig from "../../../fixture-projects/solidity-test/hardhat.config.js";

/**
 * The fixture project for this test has two folders:
 *   - all: runs all tests — verifies that all test files are executed
 *   - partial: runs selected tests — verifies that only specific files are executed
 *
 * The `partial` folder includes a test that fails if run, ensuring the task-action runs only the intended files.
 * If it fails, unintended files were executed.
 */

const hardhatConfigAllTests = {
  ...hardhatConfig,
  paths: { tests: { solidity: "test/contracts/all" } },
};

const hardhatConfigPartialTests = {
  ...hardhatConfig,
  paths: { tests: { solidity: "test/contracts/partial" } },
};

describe("solidity-test/task-action", function () {
  let hre: HardhatRuntimeEnvironment;

  useFixtureProject("solidity-test");

  before(async function () {
    hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);

    await hre.tasks.getTask(["compile"]).run({});
  });

  describe("when the solidity task test runner is specified", () => {
    it("should run all the solidity tests", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);

      await hre.tasks.getTask(["test", "solidity"]).run({ noCompile: true });
    });

    it("should run only the specified test files", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigPartialTests);

      await hre.tasks.getTask(["test", "solidity"]).run({
        noCompile: true,
        testFiles: ["./test/contracts/partial/Counter-1.sol"],
      });
    });
  });

  describe("when the solidity task test runner is not specified", () => {
    it("should run all the solidity tests", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);

      await hre.tasks.getTask(["test"]).run({ noCompile: true });
    });

    it("should run only the specified test file", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigPartialTests);
      await hre.tasks.getTask(["test"]).run({
        noCompile: true,
        testFiles: ["./test/contracts/partial/Counter-1.sol"],
      });
    });

    it("should run even if test is not in test config path because it ends in .t.sol", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigPartialTests);
      await hre.tasks.getTask(["test"]).run({
        noCompile: true,
        testFiles: ["./test/not-in-test-path.t.sol"],
      });
    });

    it("should throw because the file ends in .sol and is not in the test path", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigPartialTests);
      await assertRejectsWithHardhatError(
        hre.tasks.getTask(["test"]).run({
          noCompile: true,
          testFiles: ["./test/not-in-test-path.sol"],
        }),
        HardhatError.ERRORS.CORE.TEST_PLUGIN.CANNOT_DETERMINE_TEST_RUNNER,
        {
          files: "./test/not-in-test-path.sol",
        },
      );
    });

    it("should throw because the file cannot be assigned to a test runner", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigPartialTests);
      await assertRejectsWithHardhatError(
        hre.tasks.getTask(["test"]).run({
          noCompile: true,
          testFiles: ["./test/not-in-test-path.ts"],
        }),
        HardhatError.ERRORS.CORE.TEST_PLUGIN.CANNOT_DETERMINE_TEST_RUNNER,
        {
          files: "./test/not-in-test-path.ts",
        },
      );
    });
  });
});
