import type { TestHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";

export default async (): Promise<Partial<TestHooks>> => ({
  onTestRunStart: async (context, id) => {
    if (context.globalOptions.coverage === true) {
      assertHardhatInvariant(
        context instanceof HardhatRuntimeEnvironmentImplementation,
        "Expected context to be an instance of HardhatRuntimeEnvironmentImplementation",
      );
      await context._coverage.clearData(id);
    }
  },

  onTestWorkerDone: async (context, id) => {
    if (context.globalOptions.coverage === true) {
      assertHardhatInvariant(
        context instanceof HardhatRuntimeEnvironmentImplementation,
        "Expected context to be an instance of HardhatRuntimeEnvironmentImplementation",
      );
      await context._coverage.saveData(id);
    }
  },

  onTestRunDone: async (context, id) => {
    if (context.globalOptions.coverage === true) {
      assertHardhatInvariant(
        context instanceof HardhatRuntimeEnvironmentImplementation,
        "Expected context to be an instance of HardhatRuntimeEnvironmentImplementation",
      );
      await context._coverage.report(id);
    }
  },
});
