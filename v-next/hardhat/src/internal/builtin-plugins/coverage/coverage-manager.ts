import type { InternalCoverageManager } from "./types.js";
import type { CoverageReport } from "../../../types/coverage.js";
import type { ChainType, NetworkConnection } from "../../../types/network.js";
import type { EthereumProvider } from "../../../types/providers.js";

import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  getAllFilesMatching,
  readJsonFile,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

export class CoverageManagerImplementation implements InternalCoverageManager {
  readonly #coveragePath: string;
  readonly #providers: Record<number, EthereumProvider> = {};
  readonly #report: CoverageReport = {
    markerIds: [],
  };

  constructor(coveragePath: string) {
    this.#coveragePath = coveragePath;
  }

  public async save(): Promise<void> {
    for (const _provider of Object.values(this.#providers)) {
      // TODO: Get the coverage data from the EDR provider
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
    if (connection.networkConfig.type === "edr") {
      // TODO: Get the coverage data from the EDR provider before it is closed
    }

    delete this.#providers[connection.id];
  }
}
