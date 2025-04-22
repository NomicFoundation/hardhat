import type {
  CoverageManager,
  CoverageHits,
} from "../../../../types/coverage.js";
import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import { getEmptyTmpDir } from "@nomicfoundation/hardhat-utils/fs";

export class LazyCoverageManager implements CoverageManager {
  readonly #coveragePath: string;
  #coverageManager: CoverageManager | undefined;

  constructor(coveragePath: string) {
    this.#coverageManager = undefined;
    this.#coveragePath = coveragePath;
  }

  public async save(): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.save();
  }

  public async loadProviderHits(): Promise<CoverageHits> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.loadProviderHits();
  }

  async #getCoverageManager(): Promise<CoverageManager> {
    if (this.#coverageManager === undefined) {
      const { CoverageManagerImplementation } = await import(
        "../coverage-manager.js"
      );
      this.#coverageManager = new CoverageManagerImplementation(
        this.#coveragePath,
      );
    }

    return this.#coverageManager;
  }
}

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  const handlers: Partial<HardhatRuntimeEnvironmentHooks> = {
    created: async (_context, hre): Promise<void> => {
      const coveragePath =
        process.env.HARDHAT_COVERAGE_PATH ??
        (await getEmptyTmpDir("hardhat-coverage"));
      // NOTE: Saving the environment variable so that any subprocesses that
      // inherit the env will operate within the same coverage path
      process.env.HARDHAT_COVERAGE_PATH = coveragePath;
      hre.coverage = new LazyCoverageManager(coveragePath);
    },
  };

  return handlers;
};
