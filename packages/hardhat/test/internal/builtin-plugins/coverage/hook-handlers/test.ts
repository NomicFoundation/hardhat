import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import { getCoverageManager } from "../../../../../src/internal/builtin-plugins/coverage/helpers/accessors.js";

describe("coverage/hook-handlers/test — onTestRunStart", () => {
  const tmp = createTmpDir("coverage-test-hooks", "test");

  // An empty project, so that building it doesn't touch the repository.
  beforeEach(async () => {
    await writeJsonFile(path.join(tmp.path, "package.json"), {
      name: "coverage-test-hooks",
      type: "module",
    });
  });

  async function runTestRunStart(
    hre: Awaited<ReturnType<typeof createHardhatRuntimeEnvironment>>,
  ): Promise<void> {
    await hre.hooks.runHandlerChain(
      "test",
      "onTestRunStart",
      ["id"],
      async () => {},
    );
  }

  it("throws when coverage is enabled and no build ran", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      {},
      { coverage: true },
      tmp.path,
    );

    await assertRejectsWithHardhatError(
      runTestRunStart(hre),
      HardhatError.ERRORS.CORE.COVERAGE.COMPILATION_REQUIRED,
      {},
    );
  });

  it("does not throw once the build task ran", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      {},
      { coverage: true },
      tmp.path,
    );

    await hre.tasks.getTask("build").run({ quiet: true });

    assert.equal(getCoverageManager(hre).hasBuildRun(), true);
    await runTestRunStart(hre);
  });

  it("does not check anything when coverage is disabled", async () => {
    const hre = await createHardhatRuntimeEnvironment({}, {}, tmp.path);

    await runTestRunStart(hre);
  });
});
