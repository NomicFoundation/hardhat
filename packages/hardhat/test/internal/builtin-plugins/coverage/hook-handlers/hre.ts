import type {
  CoverageData,
  CoverageMetadata,
} from "../../../../../src/internal/builtin-plugins/coverage/types.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { exists, remove } from "@nomicfoundation/hardhat-utils/fs";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import { CoverageManagerImplementation } from "../../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";
import {
  getCoverageManager,
  getCoveragePath,
} from "../../../../../src/internal/builtin-plugins/coverage/helpers.js";

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
    const metadata: CoverageMetadata = [
      {
        relativePath: "contracts/test.sol",
        tag: "a",
        startUtf16: 1,
        endUtf16: 3,
      },
    ];
    const data: CoverageData = ["a"];

    it("installs a plain wrapper, not a CoverageManagerImplementation", async () => {
      const hre = await createHardhatRuntimeEnvironment({}, { coverage: true });
      const coverageManager = getCoverageManager(hre);

      assert.ok(
        !(coverageManager instanceof CoverageManagerImplementation),
        "expected the installed manager to be the lazy wrapper, not the concrete class",
      );
      assert.equal(
        Object.getPrototypeOf(coverageManager),
        Object.prototype,
        "expected the lazy wrapper to be a plain object",
      );
    });

    it("constructs the impl exactly once across multiple async calls", async (t) => {
      const addDataSpy = t.mock.method(
        CoverageManagerImplementation.prototype,
        "addData",
      );

      const hre = await createHardhatRuntimeEnvironment({}, { coverage: true });
      const coverageManager = getCoverageManager(hre);

      await coverageManager.addData(["x"]);
      await coverageManager.addData(["y"]);
      await coverageManager.addData(["z"]);

      assert.equal(addDataSpy.mock.callCount(), 3);
      const calls = addDataSpy.mock.calls;
      assert.equal(calls[0].this, calls[1].this);
      assert.equal(calls[1].this, calls[2].this);
    });

    it("routes onCoverageData network hooks through the wrapper", async (t) => {
      const addDataSpy = t.mock.method(
        CoverageManagerImplementation.prototype,
        "addData",
      );

      const hre = await createHardhatRuntimeEnvironment({}, { coverage: true });
      await hre.hooks.runParallelHandlers("network", "onCoverageData", [data]);

      assert.equal(addDataSpy.mock.callCount(), 1);
      assert.deepEqual(addDataSpy.mock.calls[0].arguments, [data]);
    });

    it("preserves disableReport() called before the impl is constructed", async () => {
      const hre = await createHardhatRuntimeEnvironment({}, { coverage: true });
      const coverageManager = getCoverageManager(hre);

      // impl is still not constructed, so this only sets the closure flag
      // on the wrapper
      coverageManager.disableReport();

      // Remove the coverage folder before running the report, to avoid
      // false positives caused by a previous run that did generate a report.
      const coveragePath = getCoveragePath(hre.config.paths.root);
      await remove(coveragePath);

      // First async call triggers lazy construction: the factory sets the
      // impl's reportEnabled based on the wrapper's closure flag, so report()
      // below will short-circuit
      await coverageManager.addMetadata(metadata);
      await coverageManager.addData(data);
      await coverageManager.report();

      assert.equal(
        await exists(path.join(coveragePath, "html", "index.html")),
        false,
        "report should have been suppressed by the pre-construction disableReport()",
      );
    });
  });
});
