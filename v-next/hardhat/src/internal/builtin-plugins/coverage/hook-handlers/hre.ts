import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import path from "node:path";

import { CoverageManagerImplementation } from "../coverage-manager.js";
import { unsafelyCastHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (context.globalOptions.coverage) {
      const coveragePath = path.join(hre.config.paths.root, "coverage");
      const coverageManager = new CoverageManagerImplementation(coveragePath);

      const hreImplementation =
        unsafelyCastHardhatRuntimeEnvironmentImplementation(hre);
      hreImplementation._coverage = coverageManager;

      hre.hooks.registerHandlers("network", {
        onCoverageData: async (_context, _coverageData) => {
          // TODO: Add the lines:
          // const hreImplementation = unsafelyCastHardhatRuntimeEnvironmentImplementation(context.hre);
          // await hreImplementation._coverage.addData(coverageData);

          return;
        },
      });
    }
  },
});
