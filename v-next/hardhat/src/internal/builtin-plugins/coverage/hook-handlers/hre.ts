import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import path from "node:path";

import { CoverageManagerImplementation } from "../coverage-manager.js";
import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (context.globalOptions.coverage) {
      const coveragePath = path.join(hre.config.paths.cache, "coverage");
      const coverageManager = new CoverageManagerImplementation(coveragePath);

      // NOTE: We need to cast the hre to the internal HardhatRuntimeEnvironmentImplementation
      // because we don't want to expose the coverage manager (hre._coverage) via the public interface
      const hreImplementation =
        unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);
      hreImplementation._coverage = coverageManager;

      // NOTE: We register this hook dynamically because we use the information about
      // the existence of onCoverageData hook handlers to determine whether coverage
      // is enabled or not.
      hre.hooks.registerHandlers("network", {
        onCoverageData: async (_context, coverageData) => {
          await hreImplementation._coverage.handleData(coverageData);

          return;
        },
      });
    }
  },
});
