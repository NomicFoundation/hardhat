import type { GasAnalyticsManager, GasMeasurement } from "./types.js";
import type { TableItem } from "@nomicfoundation/hardhat-utils/format";

import crypto from "node:crypto";
import path from "node:path";

import { divider, formatTable } from "@nomicfoundation/hardhat-utils/format";
import {
  ensureDir,
  getAllFilesMatching,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";
import debug from "debug";

const gasStatsLog = debug(
  "hardhat:core:gas-analytics:gas-analytics-manager:gas-stats",
);

interface ContractGasStats {
  deployment?: { gas: number; size: number };
  functions: Map<
    string, // function name or signature (if overloaded)
    GasStats
  >;
}

type GasStatsByContract = Map<string, ContractGasStats>;

interface GasStats {
  min: number;
  max: number;
  avg: number;
  median: number;
  calls: number;
}

type GasMeasurementsByContract = Map<string, ContractGasMeasurements>;

interface ContractGasMeasurements {
  deployment?: { gas: number; size: number };
  functions: Map<
    string, // functionSig
    number[]
  >;
}

export class GasAnalyticsManagerImplementation implements GasAnalyticsManager {
  public gasMeasurements: GasMeasurement[] = [];
  readonly #gasStatsPath: string;

  constructor(gasStatsRootPath: string) {
    this.#gasStatsPath = path.join(gasStatsRootPath, "gas-stats");
  }

  public addGasMeasurement(gasMeasurement: GasMeasurement): void {
    this.gasMeasurements.push(gasMeasurement);
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

  public async reportGasStats(...ids: string[]): Promise<void> {
    await this._loadGasMeasurements(...ids);

    const gasStatsByContract = this._calculateGasStats();

    const report = this._generateGasStatsReport(gasStatsByContract);

    console.log(report);
    gasStatsLog("Printed markdown report");
  }

  async #getGasMeasurementsPath(id: string): Promise<string> {
    const gasMeasurementsPath = path.join(this.#gasStatsPath, id);
    await ensureDir(gasMeasurementsPath);
    return gasMeasurementsPath;
  }

  /**
   * @private exposed for testing purposes only
   */
  public async _loadGasMeasurements(...ids: string[]): Promise<void> {
    this.gasMeasurements = [];
    for (const id of ids) {
      const gasMeasurementsPath = await this.#getGasMeasurementsPath(id);
      const filePaths = await getAllFilesMatching(gasMeasurementsPath);
      for (const filePath of filePaths) {
        const entries = await readJsonFile<GasMeasurement[]>(filePath);
        for (const entry of entries) {
          this.gasMeasurements.push(entry);
        }
        gasStatsLog("Loaded gas measurements", id, filePath);
      }
    }
  }

  /**
   * @private exposed for testing purposes only
   */
  public _calculateGasStats(): GasStatsByContract {
    const gasStatsByContract: GasStatsByContract = new Map();
    const measurementsByContract = this._aggregateGasMeasurements();

    for (const [contractFqn, measurements] of measurementsByContract) {
      const contractGasStats: ContractGasStats = {
        functions: new Map(),
      };

      if (measurements.deployment !== undefined) {
        contractGasStats.deployment = {
          gas: measurements.deployment.gas,
          size: measurements.deployment.size,
        };
      }

      const overloadedFnNames = new Set(
        findDuplicates([...measurements.functions.keys()].map(getFunctionName)),
      );

      for (const [functionSig, gasValues] of measurements.functions) {
        const functionName = getFunctionName(functionSig);

        const isOverloaded = overloadedFnNames.has(functionName);
        const stats: GasStats = {
          min: Math.min(...gasValues),
          max: Math.max(...gasValues),
          avg: roundTo(avg(gasValues), 2),
          median: roundTo(median(gasValues), 2),
          calls: gasValues.length,
        };

        contractGasStats.functions.set(
          isOverloaded ? functionSig : functionName,
          stats,
        );
      }

      gasStatsByContract.set(contractFqn, contractGasStats);
    }

    return gasStatsByContract;
  }

  /**
   * @private exposed for testing purposes only
   */
  public _aggregateGasMeasurements(): GasMeasurementsByContract {
    const measurementsByContract: GasMeasurementsByContract = new Map();

    for (const currentMeasurement of this.gasMeasurements) {
      let contractMeasurements = measurementsByContract.get(
        currentMeasurement.contractFqn,
      );
      if (contractMeasurements === undefined) {
        contractMeasurements = {
          functions: new Map(),
        };
        measurementsByContract.set(
          currentMeasurement.contractFqn,
          contractMeasurements,
        );
      }

      if (currentMeasurement.type === "deployment") {
        contractMeasurements.deployment = {
          gas: currentMeasurement.gas,
          size: currentMeasurement.size,
        };
      } else {
        let measurements = contractMeasurements.functions.get(
          currentMeasurement.functionSig,
        );
        if (measurements === undefined) {
          measurements = [];
          contractMeasurements.functions.set(
            currentMeasurement.functionSig,
            measurements,
          );
        }

        measurements.push(currentMeasurement.gas);
      }
    }

    return measurementsByContract;
  }

  /**
   * @private exposed for testing purposes only
   */
  public _generateGasStatsReport(
    gasStatsByContract: GasStatsByContract,
  ): string {
    const rows: TableItem[] = [];
    for (const [contractFqn, contractGasStats] of gasStatsByContract) {
      rows.push([chalk.cyan.bold(getUserFqn(contractFqn))]);
      rows.push(divider);

      if (contractGasStats.deployment !== undefined) {
        rows.push(
          ["Deployment Cost", "Deployment Size"].map((s) => chalk.yellow(s)),
        );
        rows.push([
          `${contractGasStats.deployment.gas}`,
          `${contractGasStats.deployment.size}`,
        ]);
      }

      if (contractGasStats.functions.size > 0) {
        rows.push(
          ["Function name", "Min", "Average", "Median", "Max", "#calls"].map(
            (s) => chalk.yellow(s),
          ),
        );
      }

      for (const [
        functionDisplayName,
        gasStats,
      ] of contractGasStats.functions) {
        rows.push([
          functionDisplayName,
          `${gasStats.min}`,
          `${gasStats.avg}`,
          `${gasStats.median}`,
          `${gasStats.max}`,
          `${gasStats.calls}`,
        ]);
      }
      rows.push([]);
    }

    // Remove the last empty row for better formatting
    rows.pop();

    return formatTable(rows);
  }
}

export function avg(values: number[]): number {
  return values.reduce((a, c) => a + c, 0) / values.length;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function getUserFqn(inputFqn: string): string {
  if (inputFqn.startsWith("project/")) {
    return inputFqn.slice("project/".length);
  }

  if (inputFqn.startsWith("npm/")) {
    const withoutPrefix = inputFqn.slice("npm/".length);
    // Match "<pkg>@<version>/<rest>", where <pkg> may be scoped (@scope/pkg)
    const match = withoutPrefix.match(/^(@?[^@/]+(?:\/[^@/]+)*)@[^/]+\/(.*)$/);
    if (match !== null) {
      return `${match[1]}/${match[2]}`;
    }
    return withoutPrefix;
  }

  return inputFqn;
}

export function getFunctionName(signature: string): string {
  return signature.split("(")[0];
}

export function findDuplicates<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();

  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return [...duplicates];
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
