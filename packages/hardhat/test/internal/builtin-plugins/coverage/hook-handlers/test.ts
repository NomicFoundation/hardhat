import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createTmpDir,
} from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import { CoverageManagerImplementation } from "../../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";
import { getCoverageManager } from "../../../../../src/internal/builtin-plugins/coverage/helpers/accessors.js";

describe("coverage/hook-handlers/test — onTestRunStart", () => {
  const tmp = createTmpDir("coverage-test-hook-handlers", "test");

  async function runTestRunStart(hre: HardhatRuntimeEnvironment) {
    await hre.hooks.runHandlerChain(
      "test",
      "onTestRunStart",
      ["id"],
      async () => {},
    );
  }

  describe("when --coverage is set", () => {
    it("throws when no contracts were instrumented", async () => {
      const hre = await createHardhatRuntimeEnvironment(
        {},
        { coverage: true },
        tmp.path,
      );

      await assertRejectsWithHardhatError(
        runTestRunStart(hre),
        HardhatError.ERRORS.CORE.COVERAGE.NO_INSTRUMENTED_SOURCES,
        {},
      );
    });

    it("clears the previous data when contracts were instrumented", async () => {
      const hre = await createHardhatRuntimeEnvironment(
        {},
        { coverage: true },
        tmp.path,
      );
      const coverageManager = getCoverageManager(hre);
      assert.ok(
        coverageManager instanceof CoverageManagerImplementation,
        "expected the installed manager to be a CoverageManagerImplementation",
      );

      await coverageManager.addMetadata([
        {
          relativePath: "contracts/Counter.sol",
          tag: "a",
          startUtf16: 0,
          endUtf16: 1,
        },
      ]);
      await coverageManager.addData(["a"]);

      await runTestRunStart(hre);

      assert.equal(coverageManager.data.size, 0);
    });
  });

  describe("when --coverage is not set", () => {
    it("does not check for instrumented contracts", async () => {
      const hre = await createHardhatRuntimeEnvironment({}, {}, tmp.path);

      await runTestRunStart(hre);
    });
  });
});
