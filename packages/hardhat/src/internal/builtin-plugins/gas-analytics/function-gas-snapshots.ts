import type { SuiteResult } from "@nomicfoundation/edr";

import path from "node:path";
import { styleText } from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  FileNotFoundError,
  readUtf8File,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { findDuplicates } from "@nomicfoundation/hardhat-utils/lang";

import {
  getFullyQualifiedName,
  parseFullyQualifiedName,
  parseName,
} from "../../../utils/contract-names.js";

import {
  formatSectionHeader,
  getUserFqn,
  isWithinTolerance,
} from "./helpers/utils.js";

export const FUNCTION_GAS_SNAPSHOTS_FILE = ".gas-snapshot";

export interface FunctionGasSnapshot {
  contractNameOrFqn: string;
  functionSig: string;
  gasUsage: StandardTestKindGasUsage | FuzzTestKindGasUsage;
}

export interface FunctionGasSnapshotWithMetadata extends FunctionGasSnapshot {
  metadata: {
    source: string;
  };
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
  // Diffs within the allowed tolerance: they don't fail the check. They are
  // included in the result for programmatic inspection, but are not shown in
  // the default console output.
  tolerated: FunctionGasSnapshotChange[];
}

export interface FunctionGasSnapshotChange {
  source: string;
  contractNameOrFqn: string;
  functionSig: string;
  kind: "standard" | "fuzz";
  expected: number;
  actual: number;
  runs?: number;
}

export interface FunctionGasSnapshotCheckResult {
  passed: boolean;
  comparison: FunctionGasSnapshotComparison;
  noBaseline: boolean;
}

export function getFunctionGasSnapshotsPath(basePath: string): string {
  return path.join(basePath, FUNCTION_GAS_SNAPSHOTS_FILE);
}

export function extractFunctionGasSnapshots(
  suiteResults: SuiteResult[],
): FunctionGasSnapshotWithMetadata[] {
  const duplicateContractNames = findDuplicates(
    suiteResults.map(({ id }) => id.name),
  );

  const snapshots: FunctionGasSnapshotWithMetadata[] = [];
  for (const { id: suiteId, testResults } of suiteResults) {
    for (const { name: functionSig, kind: testKind } of testResults) {
      if ("calls" in testKind) {
        continue;
      }

      const userFqn = getUserFqn(
        getFullyQualifiedName(suiteId.source, suiteId.name),
      );
      const contractNameOrFqn = duplicateContractNames.has(suiteId.name)
        ? userFqn
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
        metadata: {
          source: parseFullyQualifiedName(userFqn).sourceName,
        },
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
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SNAPSHOT_WRITE_ERROR,
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
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SNAPSHOT_READ_ERROR,
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
  const snapshotKeys = new Set<string>();

  const hardhatStandardTestRegex = /^(.+)#(.+) \(gas: (\d+)\)$/;
  const hardhatFuzzTestRegex =
    /^(.+)#(.+) \(runs: (\d+), μ: (\d+), ~: (\d+)\)$/;

  // Forge uses `:` as the separator. Requiring a function signature with
  // parentheses keeps a truncated Hardhat FQN such as
  // `contracts/Token.sol:Token (gas: 123)` from being accepted as a Forge row.
  const forgeStandardTestRegex = /^(.+):([^:]+\([^:]*\)) \(gas: (\d+)\)$/;
  const forgeFuzzTestRegex =
    /^(.+):([^:]+\([^:]*\)) \(runs: (\d+), μ: (\d+), ~: (\d+)(?:, failed corpus replays: \d+)?\)$/;
  const forgeInvariantTestRegex =
    /^(.+):([^:]+\([^:]*\)) \(runs: \d+, calls: \d+, reverts: \d+(?:, failed corpus replays: \d+)?\)$/;

  const expectedFormat =
    "'ContractName#functionName (gas: value)' or 'ContractName:functionName() (gas: value)' for standard tests, or the same with '(runs: value, μ: value, ~: value)' for fuzz tests; entries must be unique";

  const addSnapshot = (snapshot: FunctionGasSnapshot, line: string): void => {
    const key = `${snapshot.contractNameOrFqn}#${snapshot.functionSig}`;
    if (snapshotKeys.has(key)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_SNAPSHOT_FORMAT,
        {
          file: FUNCTION_GAS_SNAPSHOTS_FILE,
          line,
          expectedFormat,
        },
      );
    }

    snapshotKeys.add(key);
    snapshots.push(snapshot);
  };

  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }

    // Hardhat does not currently collect invariant gas snapshots. Ignore
    // Forge-only invariant rows so the supported standard and fuzz rows in a
    // Forge baseline can still be compared.
    if (forgeInvariantTestRegex.test(line)) {
      continue;
    }

    const standardMatch =
      hardhatStandardTestRegex.exec(line) ?? forgeStandardTestRegex.exec(line);
    if (standardMatch !== null) {
      const [, contractNameOrFqn, functionSig, gasValue] = standardMatch;
      addSnapshot(
        {
          contractNameOrFqn,
          functionSig,
          gasUsage: { kind: "standard", gas: BigInt(gasValue) },
        },
        line,
      );
      continue;
    }

    const fuzzMatch =
      hardhatFuzzTestRegex.exec(line) ?? forgeFuzzTestRegex.exec(line);
    if (fuzzMatch !== null) {
      const [, contractNameOrFqn, functionSig, runs, meanGas, medianGas] =
        fuzzMatch;
      addSnapshot(
        {
          contractNameOrFqn,
          functionSig,
          gasUsage: {
            kind: "fuzz",
            runs: BigInt(runs),
            meanGas: BigInt(meanGas),
            medianGas: BigInt(medianGas),
          },
        },
        line,
      );
      continue;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_SNAPSHOT_FORMAT,
      {
        file: FUNCTION_GAS_SNAPSHOTS_FILE,
        line,
        expectedFormat,
      },
    );
  }

  return snapshots;
}

export function compareFunctionGasSnapshots(
  previousSnapshots: FunctionGasSnapshot[],
  currentSnapshots: FunctionGasSnapshotWithMetadata[],
  tolerance: number,
): FunctionGasSnapshotComparison {
  const previousSnapshotsMap = new Map(
    previousSnapshots.map((s) => [
      `${s.contractNameOrFqn}#${s.functionSig}`,
      s,
    ]),
  );

  const currentUnqualifiedKeyCounts = new Map<string, number>();
  for (const current of currentSnapshots) {
    const { contractName } = parseName(current.contractNameOrFqn);
    const key = `${contractName}#${current.functionSig}`;
    currentUnqualifiedKeyCounts.set(
      key,
      (currentUnqualifiedKeyCounts.get(key) ?? 0) + 1,
    );
  }

  const added: FunctionGasSnapshot[] = [];
  const changed: FunctionGasSnapshotChange[] = [];
  const tolerated: FunctionGasSnapshotChange[] = [];

  for (const current of currentSnapshots) {
    const key = `${current.contractNameOrFqn}#${current.functionSig}`;
    let previousKey = key;
    let previous = previousSnapshotsMap.get(previousKey);

    if (previous === undefined && current.contractNameOrFqn.includes(":")) {
      const { contractName } = parseFullyQualifiedName(
        current.contractNameOrFqn,
      );
      const unqualifiedKey = `${contractName}#${current.functionSig}`;
      const unqualifiedKeyCount =
        currentUnqualifiedKeyCounts.get(unqualifiedKey) ?? 0;

      // Forge always writes bare contract names. Match a Forge-style key to a
      // Hardhat FQN only when a single current result has that bare key.
      if (unqualifiedKeyCount === 1) {
        previousKey = unqualifiedKey;
        previous = previousSnapshotsMap.get(previousKey);
      } else if (
        unqualifiedKeyCount > 1 &&
        previousSnapshotsMap.has(unqualifiedKey)
      ) {
        const matchingContracts = currentSnapshots
          .filter(({ contractNameOrFqn, functionSig }) => {
            return (
              parseName(contractNameOrFqn).contractName === contractName &&
              functionSig === current.functionSig
            );
          })
          .map(({ contractNameOrFqn }) => contractNameOrFqn)
          .join(", ");

        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS
            .AMBIGUOUS_SNAPSHOT_CONTRACT_NAME,
          {
            contractName,
            functionSig: current.functionSig,
            matchingContracts,
          },
        );
      }
    }
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

      const change: FunctionGasSnapshotChange = {
        contractNameOrFqn: current.contractNameOrFqn,
        functionSig: current.functionSig,
        kind: currentKind,
        expected: Number(expectedValue),
        actual: Number(actualValue),
        runs:
          currentKind === "fuzz" ? Number(current.gasUsage.runs) : undefined,
        source: current.metadata.source,
      };

      if (
        tolerance > 0 &&
        isWithinTolerance(change.expected, change.actual, tolerance)
      ) {
        tolerated.push(change);
      } else {
        changed.push(change);
      }
    }
    previousSnapshotsMap.delete(previousKey);
  }

  const removed = Array.from(previousSnapshotsMap.values());

  return { added, removed, changed, tolerated };
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

export async function checkFunctionGasSnapshots(
  basePath: string,
  suiteResults: SuiteResult[],
  tolerance: number,
): Promise<FunctionGasSnapshotCheckResult> {
  const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);

  let previousFunctionGasSnapshots: FunctionGasSnapshot[];
  try {
    previousFunctionGasSnapshots = await readFunctionGasSnapshots(basePath);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      // Running a check without a stored snapshot is a mistake: fail so it's
      // caught, but only when this run actually produced something to check.
      const noBaseline = functionGasSnapshots.length > 0;
      return {
        passed: !noBaseline,
        comparison: {
          added: [],
          removed: [],
          changed: [],
          tolerated: [],
        },
        noBaseline,
      };
    }

    throw error;
  }

  const comparison = compareFunctionGasSnapshots(
    previousFunctionGasSnapshots,
    functionGasSnapshots,
    tolerance,
  );

  return {
    passed: comparison.changed.length === 0,
    comparison,
    noBaseline: false,
  };
}

export function logFunctionGasSnapshotsSection(
  result: FunctionGasSnapshotCheckResult,
  logger: typeof console.log = console.log,
  isFiltered = false,
): void {
  const { comparison, noBaseline } = result;
  const changedLength = comparison.changed.length;
  const hasChanges = changedLength > 0;
  // On a filtered run (--grep, --grep-exclude, or specific files), added and
  // missing snapshots are mostly artifacts of the filter rather than real
  // differences, so they aren't reported.
  const addedLength = isFiltered ? 0 : comparison.added.length;
  const removedLength = isFiltered ? 0 : comparison.removed.length;
  const hasAdded = addedLength > 0;
  const hasRemoved = removedLength > 0;
  const hasAnyDifferences = hasChanges || hasAdded || hasRemoved;

  // Nothing to report
  if (!noBaseline && !hasAnyDifferences) {
    return;
  }

  if (noBaseline) {
    logger(
      styleText(
        "yellow",
        "Function gas snapshots: no snapshot found. Run your tests with --snapshot to create one.",
      ),
    );
    logger();
    return;
  }

  logger(
    formatSectionHeader("Function gas snapshots", {
      changedLength,
      addedLength,
      removedLength,
    }),
  );

  if (hasChanges) {
    logger();
    printFunctionGasSnapshotChanges(comparison.changed, logger);
  }

  if (hasAdded) {
    logger();
    logger(
      `  ${comparison.added.length} function(s) produced by this run are not in the snapshot:`,
    );
    const addedLines = stringifyFunctionGasSnapshots(comparison.added).split(
      "\n",
    );
    for (const line of addedLines) {
      logger(styleText("green", `    + ${line}`));
    }
  }

  if (hasRemoved) {
    logger();
    logger(
      `  ${comparison.removed.length} stored function(s) were not produced by this run:`,
    );
    const removedLines = stringifyFunctionGasSnapshots(
      comparison.removed,
    ).split("\n");
    for (const line of removedLines) {
      logger(styleText("red", `    - ${line}`));
    }
  }

  logger();
}

export function printFunctionGasSnapshotChanges(
  changes: FunctionGasSnapshotChange[],
  logger: typeof console.log = console.log,
): void {
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const isLast = i === changes.length - 1;

    logger(`  ${change.contractNameOrFqn}#${change.functionSig}`);
    logger(styleText("grey", `    (in ${change.source})`));

    if (change.kind === "fuzz") {
      logger(styleText("grey", `    Runs: ${change.runs}`));
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
      diff < 0 ? styleText("green", gasChange) : styleText("red", gasChange);

    const label = change.kind === "fuzz" ? "~" : "gas";

    logger(styleText("grey", `    Expected (${label}): ${change.expected}`));
    logger(
      styleText("grey", `    Actual (${label}):   ${change.actual} (`) +
        formattedGasChange +
        styleText("grey", ")"),
    );

    if (!isLast) {
      logger();
    }
  }
}
