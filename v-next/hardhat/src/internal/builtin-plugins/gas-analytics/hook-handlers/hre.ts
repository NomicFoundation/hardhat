import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";
import { GasAnalyticsManagerImplementation } from "../gas-analytics-manager.js";
import { getGasStatsPath } from "../helpers.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (context.globalOptions.gasStats) {
      const gasStatsPath = getGasStatsPath(hre.config.paths.root);
      const gasAnalyticsManager = new GasAnalyticsManagerImplementation(
        gasStatsPath,
      );

      assertHardhatInvariant(
        hre instanceof HardhatRuntimeEnvironmentImplementation,
        "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
      );

      hre._gasAnalytics = gasAnalyticsManager;

      // NOTE: We register this hook dynamically to avoid a circular dependency
      // between gas-analytics and network-manager plugins. The network-manager
      // checks for the existence of onGasReported handlers to determine if gas
      // analytics is enabled, rather than directly checking the global option.
      hre.hooks.registerHandlers("network", {
        onGasMeasurement: (_context, gasMeasurement) => {
          gasAnalyticsManager.addGasMeasurement(gasMeasurement);
        },
      });
    }
  },
});
