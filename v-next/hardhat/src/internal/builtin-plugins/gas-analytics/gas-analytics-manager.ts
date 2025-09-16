import type { GasAnalyticsManager, GasMeasurement } from "./types.js";

import crypto from "node:crypto";
import path from "node:path";

import {
  ensureDir,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import debug from "debug";

const gasStatsLog = debug(
  "hardhat:core:gas-analytics:gas-analytics-manager:gas-stats",
);

export class GasAnalyticsManagerImplementation implements GasAnalyticsManager {
  public gasMeasurements: GasMeasurement[] = [];
  readonly #gasStatsPath: string;

  constructor(gasStatsPath: string) {
    this.#gasStatsPath = gasStatsPath;
  }

  public addGasMeasurement(gasMeasurement: GasMeasurement): void {
    this.gasMeasurements.push(gasMeasurement);

    gasStatsLog(
      "Added gas measurement",
      JSON.stringify(
        gasMeasurement,
        (_, val) => (typeof val === "bigint" ? val.toString() : val),
        2,
      ),
    );
  }

  public async clearGasStats(id: string): Promise<void> {
    const dataPath = await this.#getGasStatsPath(id);
    await remove(dataPath);
    this.gasMeasurements = [];
    gasStatsLog("Cleared gas stats from disk and memory");
  }

  public async saveGasStats(id: string): Promise<void> {
    const dataPath = await this.#getGasStatsPath(id);
    const filePath = path.join(dataPath, `${crypto.randomUUID()}.json`);
    await writeJsonFile(filePath, this.gasMeasurements);
    gasStatsLog("Saved gas stats", id, filePath);
  }

  public async reportGasStats(..._ids: string[]): Promise<void> {
    // TODO
  }

  async #getGasStatsPath(id: string): Promise<string> {
    const dataPath = path.join(this.#gasStatsPath, "gas-stats", id);
    await ensureDir(dataPath);
    return dataPath;
  }
}
