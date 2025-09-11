import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";
import { GasAnalyticsManagerImplementation } from "../gas-analytics-manager.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (context.globalOptions.coverage) {
      const gasAnalyticsManager = new GasAnalyticsManagerImplementation();

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
        onGasMeasurement: async (_context, gasMeasurement) => {
          await gasAnalyticsManager.addGasMeasurement(gasMeasurement);
        },
      });
    }
  },
});
