import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { CoverageManagerImplementation } from "../coverage-manager.js";
import type { CoverageManager } from "../types.js";

import { createLazyLoader } from "@nomicfoundation/hardhat-utils/lang";

import { getCoveragePath, setCoverageManager } from "../helpers.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (!context.globalOptions.coverage) {
      return;
    }

    let coverageManagerImpl: CoverageManagerImplementation | undefined;
    let reportEnabled = true;

    const getCoverageManagerImpl =
      createLazyLoader<CoverageManagerImplementation>(async () => {
        const { CoverageManagerImplementation } = await import(
          "../coverage-manager.js"
        );

        coverageManagerImpl = new CoverageManagerImplementation(
          getCoveragePath(hre.config.paths.root),
        );
        if (!reportEnabled) {
          coverageManagerImpl.disableReport();
        }

        return coverageManagerImpl;
      });

    const coverageManager: CoverageManager = {
      async addData(data) {
        return (await getCoverageManagerImpl()).addData(data);
      },
      async addMetadata(metadata) {
        return (await getCoverageManagerImpl()).addMetadata(metadata);
      },
      async clearData(id) {
        return (await getCoverageManagerImpl()).clearData(id);
      },
      async saveData(id) {
        return (await getCoverageManagerImpl()).saveData(id);
      },
      async report(...ids) {
        return (await getCoverageManagerImpl()).report(...ids);
      },
      enableReport() {
        reportEnabled = true;
        coverageManagerImpl?.enableReport();
      },
      disableReport() {
        reportEnabled = false;
        coverageManagerImpl?.disableReport();
      },
    };

    setCoverageManager(hre, coverageManager);

    // NOTE: We register this hook dynamically because we use the information about
    // the existence of onCoverageData hook handlers to determine whether coverage
    // is enabled or not.
    hre.hooks.registerHandlers("network", {
      onCoverageData: async (_context, coverageData) => {
        await coverageManager.addData(coverageData);

        return;
      },
    });
  },
});
