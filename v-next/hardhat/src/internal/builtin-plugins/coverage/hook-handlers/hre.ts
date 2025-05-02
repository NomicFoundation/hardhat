import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import path from "node:path";

import { CoverageManagerImplementation } from "../coverage-manager.js";
import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (context.globalOptions.coverage) {
      const coveragePath = path.join(hre.config.paths.cache, "coverage");
      const coverageManager = new CoverageManagerImplementation(coveragePath);

      const hreImplementation =
        unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);
      hreImplementation._coverage = coverageManager;

      hre.hooks.registerHandlers("network", {
        onCoverageData: async (_context, coverageData) => {
          await hreImplementation._coverage.addData(coverageData);

          return;
        },
      });
    }
  },
});
