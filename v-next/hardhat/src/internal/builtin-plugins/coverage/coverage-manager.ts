import type {
  CoverageManager,
  CoverageReport,
} from "../../../types/coverage.js";
import type { ChainType, NetworkConnection } from "../../../types/network.js";
import type { EthereumProvider } from "../../../types/providers.js";

import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  getAllFilesMatching,
  getEmptyTmpDir,
  readJsonFile,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

export class CoverageManagerImplementation implements CoverageManager {
  static #coverageManager: CoverageManagerImplementation;

  public static async getOrCreate(): Promise<CoverageManagerImplementation> {
    if (this.#coverageManager === undefined) {
      const coveragePath =
        process.env.HARDHAT_COVERAGE_PATH ??
        (await getEmptyTmpDir("hardhat:builtin:coverage"));
      // NOTE: Saving the environment variable so that any subprocesses that
      // inherit the env will operate inside the same coverage path
      process.env.HARDHAT_COVERAGE_PATH = coveragePath;
      this.#coverageManager = new CoverageManagerImplementation(coveragePath);
    }
    return this.#coverageManager;
  }

  readonly #coveragePath: string;
  readonly #providers: Record<number, EthereumProvider> = {};
  readonly #report: CoverageReport = {
    markerIds: [],
  };

  private constructor(coveragePath: string) {
    this.#coveragePath = coveragePath;
  }

  public async save(): Promise<void> {
    for (const _provider of Object.values(this.#providers)) {
      // TODO: Get the coverage data from the EDR provider
      // if it exposes pull API instead of callback push API
    }
    const reportPath = path.join(this.#coveragePath, `${randomUUID()}.json`);
    await writeJsonFile(reportPath, this.#report);
  }

  public async read(): Promise<CoverageReport> {
    const reportPaths = await getAllFilesMatching(
      this.#coveragePath,
      (filePath) => path.extname(filePath) === ".json",
    );
    const report: CoverageReport = {
      markerIds: [],
    };
    for (const reportPath of reportPaths) {
      const { markerIds } = await readJsonFile<CoverageReport>(reportPath);
      report.markerIds.push(...markerIds);
    }
    return report;
  }

  public async handleNewConnection<ChainTypeT extends ChainType | string>(
    connection: NetworkConnection<ChainTypeT>,
  ): Promise<void> {
    if (connection.networkConfig.type === "edr") {
      this.#providers[connection.id] = connection.provider;
    }
  }

  public async handleCloseConnection<ChainTypeT extends ChainType | string>(
    connection: NetworkConnection<ChainTypeT>,
  ): Promise<void> {
    // TODO: Get the coverage data from the EDR provider before it is closed
    // if it exposes pull API instead of callback push API

    delete this.#providers[connection.id];
  }
}
