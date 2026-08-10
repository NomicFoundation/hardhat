import type { SuiteResult } from "@nomicfoundation/edr";

import path from "node:path";
import { styleText } from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  FileNotFoundError,
  readdir,
  readdirOrEmpty,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import { sanitizeFilename } from "@nomicfoundation/hardhat-utils/path";

import {
  getFullyQualifiedName,
  parseFullyQualifiedName,
} from "../../../utils/contract-names.js";

import {
  formatSectionHeader,
  getUserFqn,
  isWithinTolerance,
} from "./helpers/utils.js";

export const SNAPSHOT_CHEATCODES_DIR = "snapshots";

export interface RenamedSnapshotGroup {
  original: string;
  sanitized: string;
}

export interface SanitizedSnapshotCheatcodes {
  snapshotCheatcodes: SnapshotCheatcodesWithMetadataMap;
  renamedGroups: RenamedSnapshotGroup[];
}

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
  // Raw snapshot values: cheatcode snapshots can be arbitrary strings, not
  // just numbers, so they are preserved as-is.
  expected: string;
  actual: string;
  source: string;
}

export interface SnapshotCheatcodesComparison {
  added: SnapshotCheatcode[];
  removed: SnapshotCheatcode[];
  changed: SnapshotCheatcodeChange[];
  // Diffs within the allowed tolerance: they don't fail the check. They are
  // included in the result for programmatic inspection, but are not shown in
  // the default console output.
  tolerated: SnapshotCheatcodeChange[];
}

export interface SnapshotCheatcodesCheckResult {
  passed: boolean;
  comparison: SnapshotCheatcodesComparison;
  noBaseline: boolean;
  renamedGroups: RenamedSnapshotGroup[];
}

export function getSnapshotCheatcodesPath(
  basePath: string,
  filename: string,
): string {
  return path.join(basePath, SNAPSHOT_CHEATCODES_DIR, filename);
}

/**
 * Rekeys {@link snapshotCheatcodes} so each group name is safe to use as a
 * filename component, returning the rekeyed map alongside the list of names
 * that were actually changed by sanitization.
 *
 * @throws `SOLIDITY_TESTS.SNAPSHOT_GROUP_NAME_COLLISION` if two distinct
 * original names sanitize to the same on-disk filename. Originals are
 * sorted by codepoint in the error message so the same input always
 * produces the same error text.
 */
export function sanitizeSnapshotCheatcodes(
  snapshotCheatcodes: SnapshotCheatcodesWithMetadataMap,
): SanitizedSnapshotCheatcodes {
  const sanitizedSnapshotCheatcodes: SnapshotCheatcodesWithMetadataMap =
    new Map();
  const originalBySanitized = new Map<string, string>();
  const renamedGroups: RenamedSnapshotGroup[] = [];

  for (const [original, entries] of snapshotCheatcodes) {
    const sanitizedName = sanitizeFilename(original);

    const previousOriginal = originalBySanitized.get(sanitizedName);
    if (previousOriginal !== undefined) {
      const [nameA, nameB] =
        previousOriginal < original
          ? [previousOriginal, original]
          : [original, previousOriginal];
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SNAPSHOT_GROUP_NAME_COLLISION,
        { nameA, nameB, sanitized: sanitizedName },
      );
    }

    originalBySanitized.set(sanitizedName, original);
    sanitizedSnapshotCheatcodes.set(sanitizedName, entries);

    if (sanitizedName !== original) {
      renamedGroups.push({ original, sanitized: sanitizedName });
    }
  }

  return {
    snapshotCheatcodes: sanitizedSnapshotCheatcodes,
    renamedGroups,
  };
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

async function deleteOrphanedSnapshotFiles(
  snapshotsDir: string,
  currentGroups: Set<string>,
): Promise<void> {
  try {
    const dirEntries = await readdirOrEmpty(snapshotsDir);

    for (const entry of dirEntries) {
      if (entry.endsWith(".json")) {
        const groupName = entry.slice(0, -5); // remove .json
        if (!currentGroups.has(groupName)) {
          const filePath = path.join(snapshotsDir, entry);
          await remove(filePath);
        }
      }
    }
  } catch (error) {
    ensureError(error);
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SNAPSHOT_WRITE_ERROR,
      { snapshotsPath: snapshotsDir, error: error.message },
      error,
    );
  }
}

export async function writeSnapshotCheatcodes(
  basePath: string,
  snapshotCheatcodes: SnapshotCheatcodesWithMetadataMap,
): Promise<void> {
  const snapshotsDir = path.join(basePath, SNAPSHOT_CHEATCODES_DIR);

  // Delete old files that are no longer in the map
  const currentGroups = new Set(snapshotCheatcodes.keys());
  await deleteOrphanedSnapshotFiles(snapshotsDir, currentGroups);

  // Write current snapshot files
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

      let parsedSnapshot: Record<string, unknown>;
      try {
        parsedSnapshot = await readJsonFile(snapshotCheatcodesPath);
      } catch (error) {
        ensureError(error);
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SNAPSHOT_READ_ERROR,
          { snapshotsPath: snapshotCheatcodesPath, error: error.message },
          error,
        );
      }

      // The file is user-editable, so values may not be strings (e.g. a
      // hand-written JSON number). Normalize them, as the rest of the
      // snapshot cheatcode logic assumes string values.
      const snapshot: Record<string, string> = {};
      for (const [name, value] of Object.entries(parsedSnapshot)) {
        snapshot[name] = typeof value === "string" ? value : String(value);
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
  tolerance: number,
): SnapshotCheatcodesComparison {
  const added: SnapshotCheatcode[] = [];
  const removed: SnapshotCheatcode[] = [];
  const changed: SnapshotCheatcodeChange[] = [];
  const tolerated: SnapshotCheatcodeChange[] = [];
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
          const change: SnapshotCheatcodeChange = {
            group,
            name,
            expected: previousValue,
            actual: currentEntry.value,
            source: currentEntry.metadata.source,
          };

          // The tolerance only applies when both values are strictly numeric;
          // otherwise the exact string comparison stands. Snapshot cheatcode
          // values can be arbitrary strings, unlike function gas snapshots.
          if (
            tolerance > 0 &&
            isStrictlyNumeric(previousValue) &&
            isStrictlyNumeric(currentEntry.value) &&
            isWithinTolerance(
              Number(previousValue),
              Number(currentEntry.value),
              tolerance,
            )
          ) {
            tolerated.push(change);
          } else {
            changed.push(change);
          }
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
    tolerated: tolerated.sort(sortByKey),
  };
}

// The emptiness check is needed because `Number("")` is `0`, so a bare
// `Number.isFinite(Number(value))` would treat empty/whitespace values as
// numeric.
function isStrictlyNumeric(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

const INTEGER_REGEX = /^-?\d+$/;

export async function checkSnapshotCheatcodes(
  basePath: string,
  suiteResults: SuiteResult[],
  tolerance: number,
): Promise<SnapshotCheatcodesCheckResult> {
  const { snapshotCheatcodes, renamedGroups } = sanitizeSnapshotCheatcodes(
    extractSnapshotCheatcodes(suiteResults),
  );

  let previousSnapshotCheatcodes;
  try {
    previousSnapshotCheatcodes = await readSnapshotCheatcodes(basePath);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      // Running a check without stored snapshots is a mistake: fail so it's
      // caught, but only when this run actually produced something to check.
      const noBaseline = snapshotCheatcodes.size > 0;
      return {
        passed: !noBaseline,
        comparison: {
          added: [],
          removed: [],
          changed: [],
          tolerated: [],
        },
        noBaseline,
        renamedGroups,
      };
    }

    throw error;
  }

  const comparison = compareSnapshotCheatcodes(
    previousSnapshotCheatcodes,
    snapshotCheatcodes,
    tolerance,
  );

  return {
    passed: comparison.changed.length === 0,
    comparison,
    noBaseline: false,
    renamedGroups,
  };
}

export function logSnapshotCheatcodesSection(
  result: SnapshotCheatcodesCheckResult,
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
        "Snapshot cheatcodes: no snapshots found. Run your tests with --snapshot to create one.",
      ),
    );
    logger();
    return;
  }

  logger(
    formatSectionHeader("Snapshot cheatcodes", {
      changedLength,
      addedLength,
      removedLength,
    }),
  );

  if (hasChanges) {
    logger();
    printSnapshotCheatcodeChanges(comparison.changed, logger);
  }

  if (hasAdded) {
    logger();
    logger(
      `  ${comparison.added.length} snapshot(s) produced by this run are not in the snapshot:`,
    );
    const addedLines = stringifySnapshotCheatcodes(comparison.added).split(
      "\n",
    );
    for (const line of addedLines) {
      logger(styleText("green", `    + ${line}`));
    }
  }

  if (hasRemoved) {
    logger();
    logger(
      `  ${comparison.removed.length} stored snapshot(s) were not produced by this run:`,
    );
    const removedLines = stringifySnapshotCheatcodes(comparison.removed).split(
      "\n",
    );
    for (const line of removedLines) {
      logger(styleText("red", `    - ${line}`));
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
    logger(styleText("grey", `    (in ${change.source})`));

    logger(styleText("grey", `    Expected: ${change.expected}`));

    // The diff and percentage only make sense when both values are numeric;
    // snapshot cheatcode values can be arbitrary strings.
    if (
      !isStrictlyNumeric(change.expected) ||
      !isStrictlyNumeric(change.actual)
    ) {
      logger(styleText("grey", `    Actual:   ${change.actual}`));

      if (!isLast) {
        logger();
      }

      continue;
    }

    // Gas values are integer strings that can exceed 2^53, so the exact diff
    // needs BigInt. Non-integer numeric values (e.g. "1.5") use float math.
    const bothIntegers =
      INTEGER_REGEX.test(change.expected) && INTEGER_REGEX.test(change.actual);

    const diff = bothIntegers
      ? BigInt(change.actual) - BigInt(change.expected)
      : Number(change.actual) - Number(change.expected);

    const formattedDiff = diff > 0 ? `Δ+${diff}` : `Δ${diff}`;

    let gasChange = `${formattedDiff}`;

    const expected = Number(change.expected);
    if (expected > 0) {
      const percent = (Number(diff) / expected) * 100;
      const formattedPercent =
        percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
      gasChange = `${formattedPercent}, ${formattedDiff}`;
    }

    // Color: green for decrease (improvement), red for increase (regression)
    const formattedGasChange =
      diff < 0 ? styleText("green", gasChange) : styleText("red", gasChange);

    logger(
      styleText("grey", `    Actual:   ${change.actual} (`) +
        formattedGasChange +
        styleText("grey", ")"),
    );

    if (!isLast) {
      logger();
    }
  }
}

export function logSnapshotRenameWarnings(
  renamedGroups: RenamedSnapshotGroup[],
  logger: typeof console.log = console.log,
): void {
  if (renamedGroups.length === 0) {
    return;
  }

  logger(
    styleText(
      "yellow",
      `Renamed ${renamedGroups.length} snapshot group name(s) for safe filesystem use:`,
    ),
  );
  for (const { original, sanitized } of renamedGroups) {
    logger(styleText("yellow", `  "${original}" → "${sanitized}"`));
  }
  logger(
    styleText(
      "yellow",
      "If you'd like the on-disk filename(s) to match exactly, consider renaming the group(s) in Solidity.",
    ),
  );
  logger();
}
