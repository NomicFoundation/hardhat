import type { TestHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";

export default async (): Promise<Partial<TestHooks>> => ({
  onTestRunStart: async (context, id) => {
    if (context.globalOptions.gasStats === true) {
      assertHardhatInvariant(
        context instanceof HardhatRuntimeEnvironmentImplementation,
        "Expected context to be an instance of HardhatRuntimeEnvironmentImplementation",
      );
      await context._gasAnalytics.clearGasMeasurements(id);
    }
  },

  onTestWorkerDone: async (context, id) => {
    if (context.globalOptions.gasStats === true) {
      assertHardhatInvariant(
        context instanceof HardhatRuntimeEnvironmentImplementation,
        "Expected context to be an instance of HardhatRuntimeEnvironmentImplementation",
      );
      await context._gasAnalytics.saveGasMeasurements(id);
    }
  },

  onTestRunDone: async (context, id) => {
    if (context.globalOptions.gasStats === true) {
      assertHardhatInvariant(
        context instanceof HardhatRuntimeEnvironmentImplementation,
        "Expected context to be an instance of HardhatRuntimeEnvironmentImplementation",
      );
      await context._gasAnalytics.reportGasStats(id);
    }
  },
});
