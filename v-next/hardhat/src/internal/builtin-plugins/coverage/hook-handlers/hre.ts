import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";
import { CoverageManagerImplementation } from "../coverage-manager.js";
import { getCoveragePath } from "../helpers.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (context.globalOptions.coverage) {
      const coveragePath = getCoveragePath(hre.config.paths.root);
      const coverageManager = new CoverageManagerImplementation(coveragePath);

      assertHardhatInvariant(
        hre instanceof HardhatRuntimeEnvironmentImplementation,
        "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
      );

      hre._coverage = coverageManager;

      // NOTE: We register this hook dynamically because we use the information about
      // the existence of onCoverageData hook handlers to determine whether coverage
      // is enabled or not.
      hre.hooks.registerHandlers("network", {
        onCoverageData: async (_context, coverageData) => {
          await coverageManager.addData(coverageData);

          return;
        },
      });
    }
  },
});
