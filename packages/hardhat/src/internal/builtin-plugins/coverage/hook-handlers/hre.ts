import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { CoverageManagerImplementation as CoverageManagerImplementationT } from "../coverage-manager.js";

import { getCoveragePath, setCoverageManager } from "../helpers/accessors.js";

let CoverageManagerImplementation:
  | typeof CoverageManagerImplementationT
  | undefined;

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (!context.globalOptions.coverage) {
      return;
    }

    if (CoverageManagerImplementation === undefined) {
      ({ CoverageManagerImplementation } = await import(
        "../coverage-manager.js"
      ));
    }

    const coveragePath = getCoveragePath(hre.config.paths.root);
    const coverageManager = new CoverageManagerImplementation(coveragePath);

    setCoverageManager(hre, coverageManager);

    // NOTE: We register this hook dynamically because we use the information about
    // the existence of onCoverageData hook handlers to determine whether coverage
    // is enabled or not.
    hre.hooks.registerHandlers("network", {
      onCoverageData: async (_context, coverageData) => {
        await coverageManager.addData(coverageData);
      },
    });
  },
});
