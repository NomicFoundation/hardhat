import type { CoverageManager as InternalCoverageManager } from "./internal/types.js";
import type {
  CoverageManager,
  CoverageReport,
} from "../../../types/coverage.js";

import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  getAllFilesMatching,
  readJsonFile,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

export class CoverageManagerImplementation implements CoverageManager {
  readonly #coverageManager: InternalCoverageManager;
  readonly #coveragePath: string;

  constructor(coverageManager: InternalCoverageManager, coveragePath: string) {
    this.#coverageManager = coverageManager;
    this.#coveragePath = coveragePath;
  }

  public async save(): Promise<void> {
    const report = await this.#coverageManager.getReport();
    const reportPath = path.join(this.#coveragePath, `${randomUUID()}.json`);
    await writeJsonFile(reportPath, report);
  }

  public async load(): Promise<CoverageReport> {
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
}
