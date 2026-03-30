import type {
  ContractGasStatsJson,
  GasAnalyticsManager,
  GasMeasurement,
  GasStatsJson,
  GasStatsJsonEntry,
} from "./types.js";
import type { TableItem } from "@nomicfoundation/hardhat-utils/format";

import crypto from "node:crypto";
import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { formatTable } from "@nomicfoundation/hardhat-utils/format";
import {
  ensureDir,
  exists,
  getAllFilesMatching,
  isDirectory,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import { findDuplicates } from "@nomicfoundation/hardhat-utils/lang";
import chalk from "chalk";
import debug from "debug";

import { parseFullyQualifiedName } from "../../../utils/contract-names.js";

const gasStatsLog = debug(
  "hardhat:core:gas-analytics:gas-analytics-manager:gas-stats",
);

interface ContractGasStats {
  deployment?: GasStats;
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
  count: number;
}

type GasMeasurementsByContract = Map<string, ContractGasMeasurements>;

interface ContractGasMeasurements {
  deployments: number[];
  functions: Map<
    string, // functionSig
    number[]
  >;
}

export class GasAnalyticsManagerImplementation implements GasAnalyticsManager {
  public gasMeasurements: GasMeasurement[] = [];
  readonly #gasStatsPath: string;
  #reportEnabled = true;

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
    if (!this.#reportEnabled) {
      return;
    }

    await this._loadGasMeasurements(...ids);

    const gasStatsByContract = this._calculateGasStats();

    const report = this._generateGasStatsReport(gasStatsByContract);

    console.log(report);
    console.log();
    gasStatsLog("Printed markdown report");
  }

  public async writeGasStatsJson(
    outputPath: string,
    ...ids: string[]
  ): Promise<void> {
    if (!this.#reportEnabled) {
      return;
    }

    await this._loadGasMeasurements(...ids);

    const gasStatsByContract = this._calculateGasStats();

    const resolvedPath = path.resolve(outputPath);
    if ((await exists(resolvedPath)) && (await isDirectory(resolvedPath))) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.BUILTIN_TASKS.INVALID_FILE_PATH,
        { path: outputPath },
      );
    }
    await ensureDir(path.dirname(resolvedPath));

    const json = this._generateGasStatsJson(gasStatsByContract);
    await writeJsonFile(resolvedPath, json);
    gasStatsLog("Written gas stats JSON to", resolvedPath);
  }

  public enableReport(): void {
    this.#reportEnabled = true;
  }

  public disableReport(): void {
    this.#reportEnabled = false;
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

      if (measurements.deployments.length > 0) {
        contractGasStats.deployment = {
          min: Math.min(...measurements.deployments),
          max: Math.max(...measurements.deployments),
          avg: Math.round(avg(measurements.deployments)),
          median: Math.round(median(measurements.deployments)),
          count: measurements.deployments.length,
        };
      }

      const overloadedFnNames = findDuplicates(
        [...measurements.functions.keys()].map(getFunctionName),
      );

      for (const [functionSig, gasValues] of measurements.functions) {
        const functionName = getFunctionName(functionSig);

        const isOverloaded = overloadedFnNames.has(functionName);
        const stats: GasStats = {
          min: Math.min(...gasValues),
          max: Math.max(...gasValues),
          avg: Math.round(avg(gasValues)),
          median: Math.round(median(gasValues)),
          count: gasValues.length,
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
          deployments: [],
          functions: new Map(),
        };
        measurementsByContract.set(
          currentMeasurement.contractFqn,
          contractMeasurements,
        );
      }

      if (currentMeasurement.type === "deployment") {
        contractMeasurements.deployments.push(currentMeasurement.gas);
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

    if (gasStatsByContract.size > 0) {
      rows.push({ type: "title", text: chalk.bold("Gas Usage Statistics") });
    }

    // Sort contracts alphabetically for consistent output
    const sortedContracts = [...gasStatsByContract.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );

    for (const [contractFqn, contractGasStats] of sortedContracts) {
      rows.push({
        type: "section-header",
        text: chalk.cyan.bold(getUserFqn(contractFqn)),
      });

      if (contractGasStats.functions.size > 0) {
        rows.push({
          type: "header",
          cells: [
            "Function name",
            "Min",
            "Average",
            "Median",
            "Max",
            "#calls",
          ].map((s) => chalk.yellow(s)),
        });
      }

      // Sort functions by removing trailing ) and comparing alphabetically.
      // This ensures that overloaded functions with fewer params come first
      // (e.g., foo(uint256) comes before foo(uint256,uint256)). In other
      // scenarios, removing the trailing ) has no effect on the order.
      const sortedFunctions = [...contractGasStats.functions.entries()].sort(
        ([a], [b]) => a.split(")")[0].localeCompare(b.split(")")[0]),
      );

      for (const [functionDisplayName, gasStats] of sortedFunctions) {
        rows.push({
          type: "row",
          cells: [
            functionDisplayName,
            `${gasStats.min}`,
            `${gasStats.avg}`,
            `${gasStats.median}`,
            `${gasStats.max}`,
            `${gasStats.count}`,
          ],
        });
      }

      if (contractGasStats.deployment !== undefined) {
        rows.push({
          type: "header",
          cells: [
            "Deployment",
            "Min",
            "Average",
            "Median",
            "Max",
            "#deployments",
          ].map((s) => chalk.yellow(s)),
        });
        rows.push({
          type: "row",
          cells: [
            "",
            `${contractGasStats.deployment.min}`,
            `${contractGasStats.deployment.avg}`,
            `${contractGasStats.deployment.median}`,
            `${contractGasStats.deployment.max}`,
            `${contractGasStats.deployment.count}`,
          ],
        });
      }
    }

    return formatTable(rows);
  }

  /**
   * @private exposed for testing purposes only
   */
  public _generateGasStatsJson(
    gasStatsByContract: GasStatsByContract,
  ): GasStatsJson {
    const sortedContracts = [...gasStatsByContract.entries()]
      .map(([internalFqn, stats]) => ({
        userFqn: getUserFqn(internalFqn),
        stats,
      }))
      .sort((a, b) => a.userFqn.localeCompare(b.userFqn));

    const contracts: Record<string, ContractGasStatsJson> = {};

    for (const { userFqn, stats } of sortedContracts) {
      const { sourceName, contractName } = parseFullyQualifiedName(userFqn);

      const deployment: GasStatsJsonEntry | null =
        stats.deployment !== undefined ? { ...stats.deployment } : null;

      let functions: Record<string, GasStatsJsonEntry> | null = null;
      if (stats.functions.size > 0) {
        functions = {};
        // Sort functions by removing trailing ) and comparing alphabetically.
        // This ensures that overloaded functions with fewer params come first
        // (e.g., foo(uint256) comes before foo(uint256,uint256)). In other
        // scenarios, removing the trailing ) has no effect on the order.
        const sortedFunctions = [...stats.functions.entries()].sort(
          ([a], [b]) => a.split(")")[0].localeCompare(b.split(")")[0]),
        );
        functions = Object.fromEntries(sortedFunctions);
      }

      contracts[userFqn] = { sourceName, contractName, deployment, functions };
    }

    return { contracts };
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
