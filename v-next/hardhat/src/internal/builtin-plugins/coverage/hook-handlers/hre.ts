import type { CoverageManager } from "../../../../types/coverage.js";
import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import { getEmptyTmpDir } from "@nomicfoundation/hardhat-utils/fs";

export class LazyCoverageManager implements CoverageManager {
  #coverageManager: CoverageManager | undefined;

  constructor() {
    this.#coverageManager = undefined;
  }

  public async save(): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.save();
  }

  async #getCoverageManager(): Promise<CoverageManager> {
    if (this.#coverageManager === undefined) {
      const { getOrCreateCoverageManager } = await import(
        "../coverage-manager.js"
      );
      this.#coverageManager = await getOrCreateCoverageManager();
    }

    return this.#coverageManager;
  }
}

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  const handlers: Partial<HardhatRuntimeEnvironmentHooks> = {
    created: async (_context, hre): Promise<void> => {
      if (process.env.HARDHAT_COVERAGE_PATH === undefined) {
        // NOTE: Saving the environment variable so that any subprocesses that
        // inherit the env will operate within the same coverage path
        process.env.HARDHAT_COVERAGE_PATH =
          await getEmptyTmpDir("hardhat-coverage");
      }
      hre.coverage = new LazyCoverageManager();
    },
  };

  return handlers;
};
