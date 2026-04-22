import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import { CoverageManagerImplementation } from "../../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";
import { getCoverageManager } from "../../../../../src/internal/builtin-plugins/coverage/helpers.js";

describe("coverage/hook-handlers/hre — lazy-loading", () => {
  describe("when --coverage is not set", () => {
    it("does not install _coverage on the HRE", async () => {
      const hre = await createHardhatRuntimeEnvironment({});

      assert.equal("_coverage" in hre && hre._coverage, undefined);
    });

    it("throws when getCoverageManager is called", async () => {
      const hre = await createHardhatRuntimeEnvironment({});

      assertThrowsHardhatError(
        () => getCoverageManager(hre),
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        { message: "Expected _coverage to be installed on the HRE" },
      );
    });
  });

  describe("when --coverage is set", () => {
    it("installs _coverage on the HRE", async () => {
      const hre = await createHardhatRuntimeEnvironment({}, { coverage: true });

      assert.ok(
        "_coverage" in hre &&
          hre._coverage instanceof CoverageManagerImplementation,
        "expected _coverage to be a CoverageManagerImplementation",
      );
    });

    it("returns the installed manager when getCoverageManager is called", async () => {
      const hre = await createHardhatRuntimeEnvironment({}, { coverage: true });
      const coverageManager = getCoverageManager(hre);

      assert.ok(
        coverageManager instanceof CoverageManagerImplementation,
        "expected the installed manager to be a CoverageManagerImplementation",
      );
    });
  });
});
