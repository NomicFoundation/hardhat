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
      JSON.stringify(gasMeasurement, null, 2),
    );
  }

  public async clearGasMeasurements(id: string): Promise<void> {
    const gasMeasurementsPath = await this.#getGasMeasurementsPath(id);
    await remove(gasMeasurementsPath);
    this.gasMeasurements = [];
    gasStatsLog("Cleared gas measurements from disk and memory");
  }

  public async saveGasMeasurements(id: string): Promise<void> {
    const gasMeasurementsPath = await this.#getGasMeasurementsPath(id);
    const filePath = path.join(
      gasMeasurementsPath,
      `${crypto.randomUUID()}.json`,
    );
    await writeJsonFile(filePath, this.gasMeasurements);
    gasStatsLog("Saved gas measurements", id, filePath);
  }

  public async reportGasStats(..._ids: string[]): Promise<void> {
    // TODO
  }

  async #getGasMeasurementsPath(id: string): Promise<string> {
    const dataPath = path.join(this.#gasStatsPath, "gas-stats", id);
    await ensureDir(dataPath);
    return dataPath;
  }
}
