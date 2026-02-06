import type { SuiteResult } from "@nomicfoundation/edr";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  FileNotFoundError,
  readdir,
  readJsonFile,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import {
  getFullyQualifiedName,
  parseFullyQualifiedName,
} from "../../../utils/contract-names.js";

import { getUserFqn } from "./gas-analytics-manager.js";
import { formatSectionHeader } from "./helpers.js";

export const SNAPSHOT_CHEATCODES_DIR = "snapshots";

export type SnapshotCheatcodesMap = Map<
  string, // group
  Record<
    string, // name
    string // value
  >
>;

export type SnapshotCheatcodesWithMetadataMap = Map<
  string, // group
  Record<
    string, // name
    {
      value: string;
      metadata: {
        source: string;
      };
    }
  >
>;

export interface SnapshotCheatcode {
  group: string;
  name: string;
  value: string;
}

export interface SnapshotCheatcodeChange {
  group: string;
  name: string;
  expected: number;
  actual: number;
  source: string;
}

export interface SnapshotCheatcodesComparison {
  added: SnapshotCheatcode[];
  removed: SnapshotCheatcode[];
  changed: SnapshotCheatcodeChange[];
}

export interface SnapshotCheatcodesCheckResult {
  passed: boolean;
  comparison: SnapshotCheatcodesComparison;
  written: boolean;
}

export function getSnapshotCheatcodesPath(
  basePath: string,
  filename: string,
): string {
  return path.join(basePath, SNAPSHOT_CHEATCODES_DIR, filename);
}

export function extractSnapshotCheatcodes(
  suiteResults: SuiteResult[],
): SnapshotCheatcodesWithMetadataMap {
  const snapshots: SnapshotCheatcodesWithMetadataMap = new Map();
  for (const { id: suiteId, testResults } of suiteResults) {
    for (const { valueSnapshotGroups: snapshotGroups } of testResults) {
      if (snapshotGroups === undefined) {
        continue;
      }

      const userFqn = getUserFqn(
        getFullyQualifiedName(suiteId.source, suiteId.name),
      );

      for (const group of snapshotGroups) {
        let snapshot = snapshots.get(group.name);
        if (snapshot === undefined) {
          snapshot = {};
          snapshots.set(group.name, snapshot);
        }

        for (const entry of group.entries) {
          snapshot[entry.name] = {
            value: entry.value,
            metadata: {
              source: parseFullyQualifiedName(userFqn).sourceName,
            },
          };
        }
      }
    }
  }

  return snapshots;
}

export async function writeSnapshotCheatcodes(
  basePath: string,
  snapshotCheatcodes: SnapshotCheatcodesWithMetadataMap,
): Promise<void> {
  for (const [snapshotGroup, snapshot] of snapshotCheatcodes) {
    const snapshotCheatcodesPath = getSnapshotCheatcodesPath(
      basePath,
      `${snapshotGroup}.json`,
    );

    const snapshotWithoutMetadata: Record<string, string> = {};
    for (const [name, entry] of Object.entries(snapshot)) {
      snapshotWithoutMetadata[name] = entry.value;
    }

    try {
      await writeJsonFile(snapshotCheatcodesPath, snapshotWithoutMetadata);
    } catch (error) {
      ensureError(error);
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SNAPSHOT_WRITE_ERROR,
        { snapshotsPath: snapshotCheatcodesPath, error: error.message },
        error,
      );
    }
  }
}

export async function readSnapshotCheatcodes(
  basePath: string,
): Promise<SnapshotCheatcodesMap> {
  const snapshots: SnapshotCheatcodesMap = new Map();
  const snapshotsDir = path.join(basePath, SNAPSHOT_CHEATCODES_DIR);

  let dirEntries: string[];
  try {
    dirEntries = await readdir(snapshotsDir);
  } catch (error) {
    ensureError(error);

    // Re-throw as-is to allow the caller to handle this case specifically
    if (error instanceof FileNotFoundError) {
      throw error;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SNAPSHOT_READ_ERROR,
      { snapshotsPath: snapshotsDir, error: error.message },
      error,
    );
  }

  for (const entry of dirEntries) {
    if (entry.endsWith(".json")) {
      const snapshotGroup = entry.slice(0, -5); // remove .json extension
      const snapshotCheatcodesPath = getSnapshotCheatcodesPath(basePath, entry);

      let snapshot: Record<string, string>;
      try {
        snapshot = await readJsonFile(snapshotCheatcodesPath);
      } catch (error) {
        ensureError(error);
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SNAPSHOT_READ_ERROR,
          { snapshotsPath: snapshotCheatcodesPath, error: error.message },
          error,
        );
      }

      snapshots.set(snapshotGroup, snapshot);
    }
  }

  return snapshots;
}

export function stringifySnapshotCheatcodes(
  snapshots: SnapshotCheatcode[],
): string {
  const lines: string[] = [];
  for (const { group, name, value } of snapshots) {
    lines.push(`${group}#${name}: ${value}`);
  }

  return lines.sort((a, b) => a.localeCompare(b)).join("\n");
}

export function compareSnapshotCheatcodes(
  previousSnapshotsMap: SnapshotCheatcodesMap,
  currentSnapshotsMap: SnapshotCheatcodesWithMetadataMap,
): SnapshotCheatcodesComparison {
  const added: SnapshotCheatcode[] = [];
  const removed: SnapshotCheatcode[] = [];
  const changed: SnapshotCheatcodeChange[] = [];
  const seenPreviousEntries = new Set<string>();

  for (const [group, currentSnapshots] of currentSnapshotsMap) {
    const previousSnapshots = previousSnapshotsMap.get(group);

    for (const [name, currentEntry] of Object.entries(currentSnapshots)) {
      const key = `${group}#${name}`;

      if (
        previousSnapshots === undefined ||
        !Object.hasOwn(previousSnapshots, name)
      ) {
        added.push({ group, name, value: currentEntry.value });
      } else {
        seenPreviousEntries.add(key);
        const previousValue = previousSnapshots[name];
        if (previousValue !== currentEntry.value) {
          changed.push({
            group,
            name,
            expected: Number(previousValue),
            actual: Number(currentEntry.value),
            source: currentEntry.metadata.source,
          });
        }
      }
    }
  }

  for (const [group, previousSnapshots] of previousSnapshotsMap) {
    for (const [name, previousValue] of Object.entries(previousSnapshots)) {
      const key = `${group}#${name}`;
      if (!seenPreviousEntries.has(key)) {
        removed.push({ group, name, value: previousValue });
      }
    }
  }

  const sortByKey = <T extends { group: string; name: string }>(
    a: T,
    b: T,
  ): number => `${a.group}#${a.name}`.localeCompare(`${b.group}#${b.name}`);

  // Sort the results for consistent output
  return {
    added: added.sort(sortByKey),
    removed: removed.sort(sortByKey),
    changed: changed.sort(sortByKey),
  };
}

export async function checkSnapshotCheatcodes(
  basePath: string,
  suiteResults: SuiteResult[],
): Promise<SnapshotCheatcodesCheckResult> {
  const snapshotCheatcodes = extractSnapshotCheatcodes(suiteResults);

  let previousSnapshotCheatcodes;
  try {
    previousSnapshotCheatcodes = await readSnapshotCheatcodes(basePath);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      // Only write if there are cheatcodes to save
      const written = snapshotCheatcodes.size > 0;
      if (written) {
        await writeSnapshotCheatcodes(basePath, snapshotCheatcodes);
      }

      return {
        passed: true,
        comparison: {
          added: [],
          removed: [],
          changed: [],
        },
        written,
      };
    }

    throw error;
  }

  const comparison = compareSnapshotCheatcodes(
    previousSnapshotCheatcodes,
    snapshotCheatcodes,
  );

  // Update snapshots when functions are added or removed (but not changed)
  const hasAddedOrRemoved =
    comparison.added.length > 0 || comparison.removed.length > 0;
  if (comparison.changed.length === 0 && hasAddedOrRemoved) {
    await writeSnapshotCheatcodes(basePath, snapshotCheatcodes);
  }

  return {
    passed: comparison.changed.length === 0,
    comparison,
    written: hasAddedOrRemoved,
  };
}

export function logSnapshotCheatcodesSection(
  result: SnapshotCheatcodesCheckResult,
  logger: typeof console.log = console.log,
): void {
  const { comparison, written } = result;
  const changedLength = comparison.changed.length;
  const addedLength = comparison.added.length;
  const removedLength = comparison.removed.length;
  const hasChanges = changedLength > 0;
  const hasAdded = addedLength > 0;
  const hasRemoved = removedLength > 0;
  const hasAnyDifferences = hasChanges || hasAdded || hasRemoved;
  const isFirstTimeWrite = written && !hasAnyDifferences;

  // Nothing to report
  if (!isFirstTimeWrite && !hasAnyDifferences) {
    return;
  }

  logger(
    formatSectionHeader("Snapshot cheatcodes", {
      changedLength,
      addedLength,
      removedLength,
    }),
  );

  if (isFirstTimeWrite) {
    logger();
    logger(
      chalk.green(
        "  No existing snapshots found. Snapshot cheatcodes written successfully",
      ),
    );
    logger();
    return;
  }

  if (hasChanges) {
    logger();
    printSnapshotCheatcodeChanges(comparison.changed, logger);
  }

  if (hasAdded) {
    logger();
    logger(`  Added ${comparison.added.length} snapshot(s):`);
    const addedLines = stringifySnapshotCheatcodes(comparison.added).split(
      "\n",
    );
    for (const line of addedLines) {
      logger(chalk.green(`    + ${line}`));
    }
  }

  if (hasRemoved) {
    logger();
    logger(`  Removed ${comparison.removed.length} snapshot(s):`);
    const removedLines = stringifySnapshotCheatcodes(comparison.removed).split(
      "\n",
    );
    for (const line of removedLines) {
      logger(chalk.red(`    - ${line}`));
    }
  }

  logger();
}

export function printSnapshotCheatcodeChanges(
  changes: SnapshotCheatcodeChange[],
  logger: typeof console.log = console.log,
): void {
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const isLast = i === changes.length - 1;

    logger(`  ${change.group}#${change.name}`);
    logger(chalk.grey(`    (in ${change.source})`));

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

    logger(chalk.grey(`    Expected: ${change.expected}`));
    logger(
      chalk.grey(`    Actual:   ${change.actual} (`) +
        formattedGasChange +
        chalk.grey(")"),
    );

    if (!isLast) {
      logger();
    }
  }
}
