import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { GasAnalyticsManagerImplementation as GasAnalyticsManagerImplementationT } from "../gas-analytics-manager.js";

import { setGasAnalyticsManager } from "../helpers/accessors.js";

let GasAnalyticsManagerImplementation:
  | typeof GasAnalyticsManagerImplementationT
  | undefined;

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (
      !context.globalOptions.gasStats &&
      context.globalOptions.gasStatsJson === undefined
    ) {
      return;
    }

    if (GasAnalyticsManagerImplementation === undefined) {
      ({ GasAnalyticsManagerImplementation } = await import(
        "../gas-analytics-manager.js"
      ));
    }

    const gasAnalyticsManager = new GasAnalyticsManagerImplementation(
      hre.config.paths.cache,
    );

    setGasAnalyticsManager(hre, gasAnalyticsManager);

    // NOTE: We register this hook dynamically to avoid a circular dependency
    // between gas-analytics and network-manager plugins. The network-manager
    // checks for the existence of onGasReported handlers to determine if gas
    // analytics is enabled, rather than directly checking the global option.
    hre.hooks.registerHandlers("network", {
      onGasMeasurement: (_context, gasMeasurement) => {
        gasAnalyticsManager.addGasMeasurement(gasMeasurement);
      },
    });
  },
});
