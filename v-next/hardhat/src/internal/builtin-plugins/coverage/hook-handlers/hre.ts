import type { CoverageReport } from "../../../../types/coverage.js";
import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type {
  ChainType,
  NetworkConnection,
} from "../../../../types/network.js";
import type { InternalCoverageManager } from "../types.js";

import { getEmptyTmpDir } from "@nomicfoundation/hardhat-utils/fs";

export class LazyCoverageManager implements InternalCoverageManager {
  readonly #coveragePath: string;
  #coverageManager: InternalCoverageManager | undefined;

  constructor(coveragePath: string) {
    this.#coverageManager = undefined;
    this.#coveragePath = coveragePath;
  }

  public async handleNewConnection<ChainTypeT extends ChainType | string>(
    connection: NetworkConnection<ChainTypeT>,
  ): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.handleNewConnection(connection);
  }

  public async handleCloseConnection<ChainTypeT extends ChainType | string>(
    connection: NetworkConnection<ChainTypeT>,
  ): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.handleCloseConnection(connection);
  }

  public async save(): Promise<void> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.save();
  }

  public async read(): Promise<CoverageReport> {
    const coverageManager = await this.#getCoverageManager();
    return coverageManager.read();
  }

  async #getCoverageManager(): Promise<InternalCoverageManager> {
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
      // inherit the env will operate inside the same coverage path
      process.env.HARDHAT_COVERAGE_PATH = coveragePath;
      hre.coverage = new LazyCoverageManager(coveragePath);
    },
  };

  return handlers;
};
