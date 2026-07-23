import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import HardhatNodeTestRunnerPlugin from "../src/index.js";

const BUILD_INVOCATION_PROJECT_ROOT = fileURLToPath(
  new URL("./fixture-projects/build-invocation", import.meta.url),
);

describe("test nodejs --grep-exclude", () => {
  it("rejects with a HardhatError when a pattern is provided, because node:test ignores skip patterns under isolation: 'none'", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      { plugins: [HardhatNodeTestRunnerPlugin] },
      {},
      BUILD_INVOCATION_PROJECT_ROOT,
    );

    await assertRejectsWithHardhatError(
      hre.tasks.getTask(["test", "nodejs"]).run({ grepExclude: "flaky" }),
      HardhatError.ERRORS.HARDHAT_NODE_TEST_RUNNER.GENERAL
        .GREP_EXCLUDE_NOT_SUPPORTED,
      {},
    );
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

    // An empty exclude must pass the guard and let the run proceed to a
    // successful result (the empty fixture has no test files, so it returns
    // early). A wrongful throw would reject the await before this assertion.
    assert.equal(result.success, true);
  });
});
