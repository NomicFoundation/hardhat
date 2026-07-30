import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import HardhatNodeTestRunnerPlugin from "../src/index.js";

// An empty fixture: no test files inside its `test/` folder.
const BUILD_INVOCATION_PROJECT_ROOT = fileURLToPath(
  new URL("./fixture-projects/build-invocation", import.meta.url),
);

// A fixture that does have a node:test file, so the guard has tests it would
// have to filter.
const GREP_FILTERING_PROJECT_ROOT = fileURLToPath(
  new URL("./fixture-projects/grep-filtering", import.meta.url),
);

describe("test nodejs --grep-exclude", () => {
  it("rejects with a HardhatError when a pattern is provided and there are tests to filter, because node:test ignores skip patterns under isolation: 'none'", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      { plugins: [HardhatNodeTestRunnerPlugin] },
      {},
      GREP_FILTERING_PROJECT_ROOT,
    );

    await assertRejectsWithHardhatError(
      hre.tasks
        .getTask(["test", "nodejs"])
        .run({ grepExclude: "flaky", noCompile: true }),
      HardhatError.ERRORS.HARDHAT_NODE_TEST_RUNNER.GENERAL
        .GREP_EXCLUDE_NOT_SUPPORTED,
      {},
    );
  });

  it("does not reject when there are no node:test files to filter, so a `test --grep-exclude` meant for another runner still works", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      { plugins: [HardhatNodeTestRunnerPlugin] },
      {},
      BUILD_INVOCATION_PROJECT_ROOT,
    );

    const result = await hre.tasks
      .getTask(["test", "nodejs"])
      .run({ grepExclude: "flaky", noCompile: true });

    assert.equal(result.success, true);
  });

  it("does not reject for an empty --grep-exclude, since it excludes nothing", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      { plugins: [HardhatNodeTestRunnerPlugin] },
      {},
      BUILD_INVOCATION_PROJECT_ROOT,
    );

    const result = await hre.tasks
      .getTask(["test", "nodejs"])
      .run({ grepExclude: "", noCompile: true });

    assert.equal(result.success, true);
  });
});
