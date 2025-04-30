import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";

import path from "node:path";

import { CoverageManagerImplementation } from "../coverage-manager.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (context.globalOptions.coverage) {
      const coveragePath = path.join(hre.config.paths.root, "coverage");
      const coverageManager = new CoverageManagerImplementation(coveragePath);

      const hreImplementation =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we know this is the right implementation */
        hre as HardhatRuntimeEnvironmentImplementation;
      hreImplementation._coverage = coverageManager;

      hre.hooks.registerHandlers("network", {
        onCoverageData: async (_context, _coverageData) => {
          // TODO: Add the lines:
          // const hreImplementation =
          //   /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we know this is the right implementation */
          //   context.hre as HardhatRuntimeEnvironmentImplementation;
          // await hreImplementation._coverage.addData(coverageData);

		      return;
        }
      });
    }
  }
});
