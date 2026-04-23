import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import { GasAnalyticsManagerImplementation } from "../../../../../src/internal/builtin-plugins/gas-analytics/gas-analytics-manager.js";
import { getGasAnalyticsManager } from "../../../../../src/internal/builtin-plugins/gas-analytics/helpers/accessors.js";

describe("gas-analytics/hook-handlers/hre — lazy-loading", () => {
  describe("when --gas-stats is not set", () => {
    it("does not install _gasAnalytics on the HRE", async () => {
      const hre = await createHardhatRuntimeEnvironment({});

      assert.equal("_gasAnalytics" in hre && hre._gasAnalytics, undefined);
    });

    it("throws when getGasAnalyticsManager is called", async () => {
      const hre = await createHardhatRuntimeEnvironment({});

      assertThrowsHardhatError(
        () => getGasAnalyticsManager(hre),
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        { message: "Expected _gasAnalytics to be installed on the HRE" },
      );
    });
  });

  describe("when --gas-stats is set", () => {
    it("installs _gasAnalytics on the HRE", async () => {
      const hre = await createHardhatRuntimeEnvironment({}, { gasStats: true });

      assert.ok(
        "_gasAnalytics" in hre &&
          hre._gasAnalytics instanceof GasAnalyticsManagerImplementation,
        "expected _gasAnalytics to be a GasAnalyticsManagerImplementation",
      );
    });

    it("returns the installed manager when getGasAnalyticsManager is called", async () => {
      const hre = await createHardhatRuntimeEnvironment({}, { gasStats: true });
      const gasAnalyticsManager = getGasAnalyticsManager(hre);

      assert.ok(
        gasAnalyticsManager instanceof GasAnalyticsManagerImplementation,
        "expected the installed manager to be a GasAnalyticsManagerImplementation",
      );
    });
  });
});
