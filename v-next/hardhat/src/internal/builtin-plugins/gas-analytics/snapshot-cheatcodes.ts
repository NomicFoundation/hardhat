import type { SuiteResult } from "@nomicfoundation/edr";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";

export const SNAPSHOT_CHEATCODES_DIR = "snapshots";

export type SnapshotCheatcodesMap = Map<
  string, // group
  Record<
    string, // name
    string // value
  >
>;

export function getSnapshotCheatcodesPath(
  basePath: string,
  filename: string,
): string {
  return path.join(basePath, SNAPSHOT_CHEATCODES_DIR, filename);
}

export function extractSnapshotCheatcodes(
  suiteResults: SuiteResult[],
): SnapshotCheatcodesMap {
  const snapshots: SnapshotCheatcodesMap = new Map();
  for (const { testResults } of suiteResults) {
    for (const { valueSnapshotGroups: snapshotGroups } of testResults) {
      if (snapshotGroups === undefined) {
        continue;
      }

      for (const group of snapshotGroups) {
        let snapshot = snapshots.get(group.name);
        if (snapshot === undefined) {
          snapshot = {};
          snapshots.set(group.name, snapshot);
        }

        for (const entry of group.entries) {
          snapshot[entry.name] = entry.value;
        }
      }
    }
  }

  return snapshots;
}

export async function writeSnapshotCheatcodes(
  basePath: string,
  snapshotCheatcodes: SnapshotCheatcodesMap,
): Promise<void> {
  for (const [snapshotGroup, snapshot] of snapshotCheatcodes) {
    const snapshotCheatcodesPath = getSnapshotCheatcodesPath(
      basePath,
      `${snapshotGroup}.json`,
    );

    try {
      await writeJsonFile(snapshotCheatcodesPath, snapshot);
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
