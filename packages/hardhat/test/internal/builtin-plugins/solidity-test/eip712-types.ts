import type { TestResult } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-initialization.js";
import hardhatConfig from "../../../fixture-projects/solidity-test-eip712/hardhat.config.js";

const VENDOR_EXCLUDE_GLOB = "contracts/vendor/**";

interface SuiteResults {
  suiteResults: Array<{ testResults: TestResult[] }>;
}

/**
 * Runs the fixture's single test suite and returns its results.
 *
 * The suite reaches two clashing `Permit` declarations and declares neither,
 * so only `exclude` can settle which one the cheatcode sees.
 */
async function runPermitSuite(exclude: string[]): Promise<TestResult[]> {
  const hre = await createHardhatRuntimeEnvironment({
    ...hardhatConfig,
    test: { solidity: { eip712Types: { exclude } } },
  });

  const result = await hre.tasks.getTask(["test", "solidity"]).run({});

  // A failing run reports the same shape under `error` instead of `value`.
  const { suiteResults }: SuiteResults =
    result.success === true ? result.value : result.error;

  return suiteResults.flatMap(({ testResults }) => testResults);
}

describe("solidity-test/eip712-types", () => {
  useFixtureProject("solidity-test-eip712");

  it("fails a lookup that two reachable sources declare", async () => {
    const [testResult] = await runPermitSuite([]);

    assert.equal(testResult.status, "Failure");
    assert.match(
      testResult.reason ?? "",
      /EIP-712 type `Permit` cannot be used: conflicting definitions/,
      "The failure should report the clashing struct",
    );
  });

  it("settles the clash when `exclude` drops one of the sources", async () => {
    const [testResult] = await runPermitSuite([VENDOR_EXCLUDE_GLOB]);

    assert.equal(
      testResult.status,
      "Success",
      `Expected the suite to pass, got: ${testResult.reason ?? ""}`,
    );
  });
});
