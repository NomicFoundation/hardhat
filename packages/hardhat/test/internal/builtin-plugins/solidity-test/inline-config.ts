import type { TestResult } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-initialization.js";
import hardhatConfig from "../../../fixture-projects/solidity-test-inline-config/hardhat.config.js";

const hardhatConfigValidTests = {
  ...hardhatConfig,
  paths: { tests: { solidity: "test/valid" } },
};

const hardhatConfigInvalidTests = {
  ...hardhatConfig,
  paths: { tests: { solidity: "test/invalid" } },
};

describe("solidity-test/inline-config", () => {
  useFixtureProject("solidity-test-inline-config");

  it("should apply inline config directives found in the test sources", async () => {
    const hre = await createHardhatRuntimeEnvironment(hardhatConfigValidTests);

    const result = await hre.tasks.getTask(["test", "solidity"]).run({});

    assert.equal(result.success, true);

    const testResults: TestResult[] = result.value.suiteResults.flatMap(
      (suiteResult: { testResults: TestResult[] }) => suiteResult.testResults,
    );

    const withInlineConfig = testResults.find(
      ({ name }) => name === "testFuzzWithInlineConfig(uint256)",
    );
    assert.ok(withInlineConfig !== undefined, "Fuzz test result not found");
    assert.ok(
      "runs" in withInlineConfig.kind,
      "Expected a fuzz test result kind",
    );
    assert.equal(
      withInlineConfig.kind.runs,
      7n,
      "The inline config directive should cap the fuzz runs at 7",
    );

    const withoutInlineConfig = testResults.find(
      ({ name }) => name === "testFuzzWithoutInlineConfig(uint256)",
    );
    assert.ok(withoutInlineConfig !== undefined, "Fuzz test result not found");
    assert.ok(
      "runs" in withoutInlineConfig.kind,
      "Expected a fuzz test result kind",
    );
    assert.notEqual(
      withoutInlineConfig.kind.runs,
      7n,
      "Tests without an inline config directive should use the default number of fuzz runs",
    );
  });

  it("should report invalid inline config directives as INVALID_INLINE_CONFIG", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      hardhatConfigInvalidTests,
    );

    // The task doesn't rethrow runner errors: it reports them via
    // console.error and returns an error result.
    const reportedErrors: unknown[] = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      reportedErrors.push(...args);
    };

    let result;
    try {
      result = await hre.tasks.getTask(["test", "solidity"]).run({});
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(result.success, false);

    const hardhatErrors = reportedErrors.filter((e) =>
      HardhatError.isHardhatError(e),
    );
    assert.equal(
      hardhatErrors.length,
      1,
      "Expected exactly one HardhatError to be reported",
    );

    const [error] = hardhatErrors;
    assert.equal(
      error.number,
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_INLINE_CONFIG.number,
    );
    // Both invalid directives should be reported in the single error.
    assert.match(
      error.message,
      /testFuzzWithInvalidInlineConfig.*not-a-number/,
      "The error should report the invalid value directive",
    );
    assert.match(
      error.message,
      /testFuzzWithInvalidInlineConfigKey.*not-a-key/,
      "The error should report the invalid key directive",
    );
    assert.match(
      error.message,
      /test\/invalid\/InvalidInlineConfig\.t\.sol/,
      "The error should point at the offending test source",
    );
    assert.doesNotMatch(
      error.message,
      /project\/test\/invalid/,
      "Internal source names should be replaced with user-facing paths",
    );
    assert.doesNotMatch(
      error.message,
      /Found invalid inline configuration/,
      "EDR's heading line should be stripped from the message",
    );
  });
});
