import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
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
 *   - failing: test that fails — used to verify that tests actually run
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

const hardhatConfigFailingTests = {
  ...hardhatConfig,
  paths: { tests: { solidity: "test/contracts/failing" } },
};

const hardhatConfigOpTests = {
  ...hardhatConfig,
  paths: { tests: { solidity: "test/contracts/op" } },
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

  describe("running the tests", () => {
    it("should set the NODE_ENV variable if undefined and HH_TEST always", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);

      const exitCode = process.exitCode;
      const nodeEnv = process.env.NODE_ENV;
      const hhTest = process.env.HH_TEST;
      try {
        delete process.env.NODE_ENV;
        await hre.tasks.getTask(["test", "solidity"]).run({ noCompile: true });
        assert.equal(process.env.NODE_ENV, "test");
        assert.equal(process.env.HH_TEST, "true");
      } finally {
        process.env.HH_TEST = hhTest;
        process.env.NODE_ENV = nodeEnv;
        process.exitCode = exitCode;
      }
    });

    it("should not set the NODE_ENV variable if defined before", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);

      const exitCode = process.exitCode;
      const nodeEnv = process.env.NODE_ENV;
      const hhTest = process.env.HH_TEST;
      try {
        process.env.NODE_ENV = "HELLO";
        await hre.tasks.getTask(["test", "solidity"]).run({ noCompile: true });
        assert.equal(process.env.NODE_ENV, "HELLO");
        assert.equal(process.env.HH_TEST, "true");
      } finally {
        process.env.HH_TEST = hhTest;
        process.env.NODE_ENV = nodeEnv;
        process.exitCode = exitCode;
      }
    });

    it("should run all the tests and throw if any of them fail", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigFailingTests);

      const exitCode = process.exitCode;
      try {
        await hre.tasks.getTask(["test", "solidity"]).run({ noCompile: true });
        assert.equal(process.exitCode, 1);
      } finally {
        process.exitCode = exitCode;
      }
    });

    describe("when the contracts are in the optimism chain type", () => {
      it("should run all the solidity tests when the optimism chain type is specified", async () => {
        hre = await createHardhatRuntimeEnvironment(hardhatConfigOpTests);

        await hre.tasks.getTask(["test", "solidity"]).run({
          noCompile: true,
          chainType: "op",
        });
      });

      it("should throw because the test is not compatible with the l1 chain type", async () => {
        hre = await createHardhatRuntimeEnvironment(hardhatConfigOpTests);

        const exitCode = process.exitCode;
        try {
          // default chain type is l1
          await hre.tasks.getTask(["test", "solidity"]).run({
            noCompile: true,
          });
          assert.equal(process.exitCode, 1);
        } finally {
          process.exitCode = exitCode;
        }
      });
    });
  });
});
