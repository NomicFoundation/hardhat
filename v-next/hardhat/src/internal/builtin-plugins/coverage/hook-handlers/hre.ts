import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type { EdrProvider } from "../../network-manager/edr/edr-provider.js";
import type { CoverageManager } from "../types.js";

import path from "node:path";

export class LazyCoverageManager implements CoverageManager {
  readonly #coveragePath: string;

  #coverageManager: CoverageManager | undefined;

  constructor(coveragePath: string) {
    this.#coveragePath = coveragePath;
    this.#coverageManager = undefined;
  }

  public async save(): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.save();
  }

  public async clear(): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.clear();
  }

  public async addProvider(id: string, provider: EdrProvider): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.addProvider(id, provider);
  }

  public async removeProvider(id: string): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.removeProvider(id);
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
      hre.coverage = new LazyCoverageManager(
        path.join(hre.config.paths.cache, "coverage"),
      );
    },
  };

  return handlers;
};
