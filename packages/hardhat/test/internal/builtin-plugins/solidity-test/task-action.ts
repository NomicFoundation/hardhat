import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

import { overrideTask } from "../../../../src/config.js";
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

// Covers all test subdirectories so a single build produces artifacts
// for every test file in the fixture project.
const hardhatConfigAllTestDirs = {
  ...hardhatConfig,
  paths: { tests: { solidity: "test/contracts" } },
};

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

const hardhatConfigHardforkTests = {
  ...hardhatConfig,
  paths: { tests: { solidity: "test/contracts/hardfork" } },
};

describe("solidity-test/task-action", function () {
  let hre: HardhatRuntimeEnvironment;

  useFixtureProject("solidity-test");

  before(async function () {
    // Build with a config that covers all test subdirectories so that
    // noCompile: true tests find pre-compiled artifacts on disk.
    const buildHre = await createHardhatRuntimeEnvironment(
      hardhatConfigAllTestDirs,
    );
    await buildHre.tasks.getTask(["build"]).run({});

    hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);
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

    it("should throw if a file is provided but is not considered a test", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigPartialTests);
      await assertRejectsWithHardhatError(
        () =>
          hre.tasks.getTask(["test", "solidity"]).run({
            noCompile: true,
            testFiles: ["./test/not-in-test-path.t.sol"],
          }),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .SELECTED_FILES_ARE_NOT_SOLIDITY_TESTS,
        { files: "- ./test/not-in-test-path.t.sol" },
      );
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

    it("should throw if a file is provided but is not considered a test", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigPartialTests);
      await assertRejectsWithHardhatError(
        () =>
          hre.tasks.getTask(["test"]).run({
            noCompile: true,
            testFiles: ["./test/not-in-test-path.t.sol"],
          }),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .SELECTED_FILES_ARE_NOT_SOLIDITY_TESTS,
        { files: "- ./test/not-in-test-path.t.sol" },
      );
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
      }
    });

    it("should not set the NODE_ENV variable if defined before", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);

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
      }
    });

    it("should return an error result when any test fails", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigFailingTests);

      const result = await hre.tasks
        .getTask(["test", "solidity"])
        .run({ noCompile: true });
      assert.equal(result.success, false);
      assert.deepEqual(result.error.summary, {
        failed: 0,
        passed: 0,
        skipped: 0,
        todo: 0,
        failureOutput: "",
      });
      assert.ok(
        Array.isArray(result.error.suiteResults),
        "suiteResults should be an array",
      );
    });

    it("should return a success result when all tests pass", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);

      const result = await hre.tasks
        .getTask(["test", "solidity"])
        .run({ noCompile: true });
      assert.equal(result.success, true);
      assert.deepEqual(result.value.summary, {
        failed: 0,
        passed: 0,
        skipped: 0,
        todo: 0,
        failureOutput: "",
      });
      assert.ok(
        Array.isArray(result.value.suiteResults),
        "suiteResults should be an array",
      );
    });

    describe("when the contracts are in the optimism chain type", () => {
      it("should run all the solidity tests when the optimism chain type is specified", async () => {
        hre = await createHardhatRuntimeEnvironment(hardhatConfigOpTests);

        await hre.tasks.getTask(["test", "solidity"]).run({
          noCompile: true,
          chainType: "op",
        });
      });

      it("should return an error result because the test is not compatible with the l1 chain type", async () => {
        hre = await createHardhatRuntimeEnvironment(hardhatConfigOpTests);

        // default chain type is l1
        const result = await hre.tasks.getTask(["test", "solidity"]).run({
          noCompile: true,
        });
        assert.equal(result.success, false);
      });
    });

    describe("building contracts and tests", () => {
      /**
       * Returns an HRE that accumulates the args to `build` in the array it
       * returns.
       */
      async function getHreWithOverriddenBuild(
        splitTestsCompilation: boolean,
      ): Promise<[hre: HardhatRuntimeEnvironment, buildArgs: any[]]> {
        const buildArgs: any[] = [];
        const overriddenHre = await createHardhatRuntimeEnvironment({
          ...hardhatConfigAllTests,
          ...(splitTestsCompilation
            ? { solidity: { version: "0.8.28", splitTestsCompilation: true } }
            : {}),
          tasks: [
            overrideTask("build")
              .setAction(async () => {
                return {
                  default: (args, _hre, runSuper) => {
                    buildArgs.push(args);

                    return runSuper(args);
                  },
                };
              })
              .build(),
          ],
        });

        return [overriddenHre, buildArgs];
      }

      describe("when splitTestsCompilation is true", () => {
        describe("When noCompile is provided", () => {
          it("Should compile the test files, but not the contracts", async () => {
            const [overriddenHre, buildArgs] =
              await getHreWithOverriddenBuild(true);

            await overriddenHre.tasks.getTask(["test", "solidity"]).run({
              noCompile: true,
            });

            // We only call build once
            assert.equal(buildArgs.length, 1);

            const lastArgs = buildArgs[0];
            assert.equal(lastArgs.noContracts, true);
            assert.equal(lastArgs.noTests, false);
            assert.deepEqual(lastArgs.files, []);
          });

          it("Should compile only the provided test files, and not the contracts", async () => {
            const [overriddenHre, buildArgs] =
              await getHreWithOverriddenBuild(true);

            const testFiles = ["test/contracts/all/Counter-1.t.sol"];
            await overriddenHre.tasks.getTask(["test", "solidity"]).run({
              noCompile: true,
              testFiles,
            });

            // We only call build once
            assert.equal(buildArgs.length, 1);

            const lastArgs = buildArgs[0];
            assert.equal(lastArgs.noContracts, true);
            assert.equal(lastArgs.noTests, false);
            assert.deepEqual(lastArgs.files, testFiles);
          });
        });

        describe("When noCompile is not provided", () => {
          it("Should compile the contracts and then the test files", async () => {
            const [overriddenHre, buildArgs] =
              await getHreWithOverriddenBuild(true);

            await overriddenHre.tasks.getTask(["test", "solidity"]).run({});

            assert.equal(buildArgs.length, 2);

            const firstArgs = buildArgs[0];
            assert.equal(firstArgs.noContracts, false);
            assert.equal(firstArgs.noTests, true);
            assert.deepEqual(firstArgs.files, []);

            const lastArgs = buildArgs[1];
            assert.equal(lastArgs.noContracts, true);
            assert.equal(lastArgs.noTests, false);
            assert.deepEqual(lastArgs.files, []);
          });

          it("Should compile the contracts and then the provided test files", async () => {
            const [overriddenHre, buildArgs] =
              await getHreWithOverriddenBuild(true);

            const testFiles = ["test/contracts/all/Counter-1.t.sol"];
            await overriddenHre.tasks
              .getTask(["test", "solidity"])
              .run({ testFiles });

            assert.equal(buildArgs.length, 2);

            const firstArgs = buildArgs[0];
            assert.equal(firstArgs.noContracts, false);
            assert.equal(firstArgs.noTests, true);
            assert.deepEqual(firstArgs.files, []);

            const lastArgs = buildArgs[1];
            assert.equal(lastArgs.noContracts, true);
            assert.equal(lastArgs.noTests, false);
            assert.deepEqual(lastArgs.files, testFiles);
          });
        });
      });

      describe("when splitTestsCompilation is false", () => {
        it("should perform one build when noCompile is not provided", async () => {
          const [overriddenHre, buildArgs] =
            await getHreWithOverriddenBuild(false);

          await overriddenHre.tasks.getTask(["test", "solidity"]).run({});

          assert.equal(buildArgs.length, 1);

          const args = buildArgs[0];
          assert.equal(args.noTests, false);
          assert.equal(args.noContracts, false);
        });

        it("should perform one build with selected test files", async () => {
          const [overriddenHre, buildArgs] =
            await getHreWithOverriddenBuild(false);

          const testFiles = ["test/contracts/all/Counter-1.t.sol"];
          await overriddenHre.tasks
            .getTask(["test", "solidity"])
            .run({ testFiles });

          assert.equal(buildArgs.length, 1);

          const args = buildArgs[0];
          assert.equal(args.noTests, false);
          assert.equal(args.noContracts, false);
        });

        it("should not call build when noCompile is provided", async () => {
          const [overriddenHre, buildArgs] =
            await getHreWithOverriddenBuild(false);

          await overriddenHre.tasks.getTask(["test", "solidity"]).run({
            noCompile: true,
          });

          assert.equal(buildArgs.length, 0);
        });
      });
    });
  });

  describe("when splitTestsCompilation is false", () => {
    it("should execute only the selected test files", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigPartialTests);

      const result = await hre.tasks.getTask(["test", "solidity"]).run({
        testFiles: ["./test/contracts/partial/Counter-1.sol"],
      });
      assert.equal(result.success, true);
    });

    it("should read artifacts from a single directory", async () => {
      hre = await createHardhatRuntimeEnvironment(hardhatConfigAllTests);

      const result = await hre.tasks.getTask(["test", "solidity"]).run({});
      assert.equal(result.success, true);
    });

    it("should only emit deprecated-test warnings for selected tests", async () => {
      const deprecatedConfig = {
        ...hardhatConfig,
        paths: { tests: { solidity: "test/contracts/deprecated" } },
      };
      const deprecatedHre =
        await createHardhatRuntimeEnvironment(deprecatedConfig);

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map(String).join(" "));
      };
      try {
        await deprecatedHre.tasks.getTask(["test", "solidity"]).run({
          testFiles: ["./test/contracts/deprecated/NormalTest.t.sol"],
        });
      } finally {
        console.warn = originalWarn;
      }

      assert.equal(
        warnings.filter((w) => w.includes("testFail")).length,
        0,
        "No testFail deprecation warning should be emitted for non-selected tests",
      );
    });

    it("should throw when a selected test file exists but has not been compiled", async () => {
      const notBuildConfig = {
        ...hardhatConfig,
        paths: { tests: { solidity: "test" } },
      };
      const notBuiltHre = await createHardhatRuntimeEnvironment(notBuildConfig);

      try {
        await notBuiltHre.tasks.getTask(["test", "solidity"]).run({
          noCompile: true,
          testFiles: ["./test/not-in-test-path.t.sol"],
        });
        assert.fail("Expected HardhatError to be thrown");
      } catch (error) {
        assert.ok(
          HardhatError.isHardhatError(error),
          "Expected a HardhatError",
        );
        assert.equal(
          error.number,
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS
            .SELECTED_TEST_FILES_NOT_COMPILED.number,
        );
      }
    });
  });

  it("should support EIP-7212 precompile at address 0x100", async () => {
    hre = await createHardhatRuntimeEnvironment(hardhatConfigHardforkTests);

    await hre.tasks.getTask(["test", "solidity"]).run({
      noCompile: false,
    });

    // The test should not throw, which means the precompile exists
    // and works as expected
  });
});
