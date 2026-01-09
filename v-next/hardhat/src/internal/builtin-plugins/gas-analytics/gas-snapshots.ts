import type { SuiteResult } from "@nomicfoundation/edr";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  FileNotFoundError,
  readUtf8File,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { findDuplicates } from "@nomicfoundation/hardhat-utils/lang";
import chalk from "chalk";

import { getFullyQualifiedName } from "../../../utils/contract-names.js";

const FUNCTION_GAS_SNAPSHOTS_FILE = ".gas-snapshot";

export interface FunctionGasSnapshot {
  contractNameOrFqn: string;
  functionSig: string;
  gasUsage: StandardTestKindGasUsage | FuzzTestKindGasUsage;
}

export interface StandardTestKindGasUsage {
  kind: "standard";
  gas: bigint;
}

export interface FuzzTestKindGasUsage {
  kind: "fuzz";
  runs: bigint;
  meanGas: bigint;
  medianGas: bigint;
}

export interface FunctionGasSnapshotComparison {
  added: FunctionGasSnapshot[];
  removed: FunctionGasSnapshot[];
  changed: FunctionGasSnapshotChange[];
}

export interface FunctionGasSnapshotChange {
  contractNameOrFqn: string;
  functionSig: string;
  kind: "standard" | "fuzz";
  expected: number;
  actual: number;
  runs?: number;
}

export function getFunctionGasSnapshotsPath(basePath: string): string {
  return path.join(basePath, FUNCTION_GAS_SNAPSHOTS_FILE);
}

export function extractFunctionGasSnapshots(
  suiteResults: SuiteResult[],
): FunctionGasSnapshot[] {
  const duplicateContractNames = findDuplicates(
    suiteResults.map(({ id }) => id.name),
  );

  const snapshots: FunctionGasSnapshot[] = [];
  for (const { id: suiteId, testResults } of suiteResults) {
    for (const { name: functionSig, kind: testKind } of testResults) {
      if ("calls" in testKind) {
        continue;
      }

      const contractNameOrFqn = duplicateContractNames.has(suiteId.name)
        ? getFullyQualifiedName(suiteId.source, suiteId.name)
        : suiteId.name;

      const gasUsage =
        "consumedGas" in testKind
          ? {
              kind: "standard" as const,
              gas: testKind.consumedGas,
            }
          : {
              kind: "fuzz" as const,
              runs: testKind.runs,
              meanGas: testKind.meanGas,
              medianGas: testKind.medianGas,
            };

      snapshots.push({
        contractNameOrFqn,
        functionSig,
        gasUsage,
      });
    }
  }
  return snapshots;
}

export async function writeFunctionGasSnapshots(
  basePath: string,
  snapshots: FunctionGasSnapshot[],
): Promise<void> {
  const snapshotsPath = getFunctionGasSnapshotsPath(basePath);
  try {
    await writeUtf8File(
      snapshotsPath,
      stringifyFunctionGasSnapshots(snapshots),
    );
  } catch (error) {
    ensureError(error);
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.GAS_SNAPSHOT_WRITE_ERROR,
      { snapshotsPath, error: error.message },
      error,
    );
  }
}

export async function readFunctionGasSnapshots(
  basePath: string,
): Promise<FunctionGasSnapshot[]> {
  const snapshotsPath = getFunctionGasSnapshotsPath(basePath);
  let stringifiedSnapshots: string;
  try {
    stringifiedSnapshots = await readUtf8File(snapshotsPath);
  } catch (error) {
    ensureError(error);

    // Re-throw as-is to allow the caller to handle this case specifically
    if (error instanceof FileNotFoundError) {
      throw error;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.GAS_SNAPSHOT_READ_ERROR,
      { snapshotsPath, error: error.message },
      error,
    );
  }

  return parseFunctionGasSnapshots(stringifiedSnapshots);
}

export function stringifyFunctionGasSnapshots(
  snapshots: FunctionGasSnapshot[],
): string {
  const lines: string[] = [];
  for (const { contractNameOrFqn, functionSig, gasUsage } of snapshots) {
    const gasDetails =
      gasUsage.kind === "standard"
        ? `gas: ${gasUsage.gas}`
        : `runs: ${gasUsage.runs}, μ: ${gasUsage.meanGas}, ~: ${gasUsage.medianGas}`;

    lines.push(`${contractNameOrFqn}#${functionSig} (${gasDetails})`);
  }

  return lines.sort((a, b) => a.localeCompare(b)).join("\n");
}

export function parseFunctionGasSnapshots(
  stringifiedSnapshots: string,
): FunctionGasSnapshot[] {
  if (stringifiedSnapshots.trim() === "") {
    return [];
  }

  const lines = stringifiedSnapshots.split("\n");
  const snapshots: FunctionGasSnapshot[] = [];

  const standardTestRegex = /^(.+)#(.+) \(gas: (\d+)\)$/;
  const fuzzTestRegex = /^(.+)#(.+) \(runs: (\d+), μ: (\d+), ~: (\d+)\)$/;

  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }

    const standardMatch = standardTestRegex.exec(line);
    if (standardMatch !== null) {
      const [, contractNameOrFqn, functionSig, gasValue] = standardMatch;
      snapshots.push({
        contractNameOrFqn,
        functionSig,
        gasUsage: { kind: "standard", gas: BigInt(gasValue) },
      });
      continue;
    }

    const fuzzMatch = fuzzTestRegex.exec(line);
    if (fuzzMatch !== null) {
      const [, contractNameOrFqn, functionSig, runs, meanGas, medianGas] =
        fuzzMatch;
      snapshots.push({
        contractNameOrFqn,
        functionSig,
        gasUsage: {
          kind: "fuzz",
          runs: BigInt(runs),
          meanGas: BigInt(meanGas),
          medianGas: BigInt(medianGas),
        },
      });
      continue;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_GAS_SNAPSHOT_FORMAT,
      { line },
    );
  }

  return snapshots;
}

export function compareFunctionGasSnapshots(
  previousSnapshots: FunctionGasSnapshot[],
  currentSnapshots: FunctionGasSnapshot[],
): FunctionGasSnapshotComparison {
  const previousSnapshotsMap = new Map(
    previousSnapshots.map((s) => [
      `${s.contractNameOrFqn}#${s.functionSig}`,
      s,
    ]),
  );

  const added: FunctionGasSnapshot[] = [];
  const changed: FunctionGasSnapshotChange[] = [];

  for (const current of currentSnapshots) {
    const key = `${current.contractNameOrFqn}#${current.functionSig}`;
    const previous = previousSnapshotsMap.get(key);
    const currentKind = current.gasUsage.kind;
    const previousKind = previous?.gasUsage.kind;

    if (
      previous === undefined ||
      // If the kind doesn't match, we treat it as an addition + removal
      previousKind !== currentKind
    ) {
      added.push(current);
      continue;
    }

    if (hasGasUsageChanged(previous.gasUsage, current.gasUsage)) {
      const expectedValue =
        previousKind === "standard"
          ? previous.gasUsage.gas
          : previous.gasUsage.medianGas;
      const actualValue =
        currentKind === "standard"
          ? current.gasUsage.gas
          : current.gasUsage.medianGas;

      changed.push({
        contractNameOrFqn: current.contractNameOrFqn,
        functionSig: current.functionSig,
        kind: currentKind,
        expected: Number(expectedValue),
        actual: Number(actualValue),
        runs:
          currentKind === "fuzz" ? Number(current.gasUsage.runs) : undefined,
      });
    }
    previousSnapshotsMap.delete(key);
  }

  const removed = Array.from(previousSnapshotsMap.values());

  return { added, removed, changed };
}

export function hasGasUsageChanged(
  previous: StandardTestKindGasUsage | FuzzTestKindGasUsage,
  current: StandardTestKindGasUsage | FuzzTestKindGasUsage,
): boolean {
  if (previous.kind === "standard" && current.kind === "standard") {
    return previous.gas !== current.gas;
  }

  if (previous.kind === "fuzz" && current.kind === "fuzz") {
    return previous.medianGas !== current.medianGas;
  }

  return false;
}

export function printFunctionGasSnapshotChanges(
  changes: FunctionGasSnapshotChange[],
): void {
  const lines: string[] = [];

  for (const change of changes) {
    lines.push(`  ${change.contractNameOrFqn}#${change.functionSig}`);

    if (change.kind === "fuzz") {
      lines.push(chalk.grey(`    Runs: ${change.runs}`));
    }

    const diff = change.actual - change.expected;
    const formattedDiff = diff > 0 ? `Δ+${diff}` : `Δ${diff}`;

    let gasChange = `${formattedDiff}`;
    if (change.expected > 0) {
      const percent = (diff / change.expected) * 100;
      const formattedPercent =
        percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
      gasChange = `${formattedPercent}, ${formattedDiff}`;
    }

    // Color: green for decrease (improvement), red for increase (regression)
    const formattedGasChange =
      diff < 0 ? chalk.green(gasChange) : chalk.red(gasChange);

    const label = change.kind === "fuzz" ? "~" : "gas";

    lines.push(chalk.grey(`    Expected (${label}): ${change.expected}`));
    lines.push(
      chalk.grey(`    Actual (${label}):   ${change.actual} (`) +
        formattedGasChange +
        chalk.grey(")"),
    );

    lines.push("");
  }

  console.error(lines.join("\n"));
}
