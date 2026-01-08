import type { SuiteResult } from "@nomicfoundation/edr";

type GasSnapshotCheatcodesMap = Map<
  string, // group
  Record<
    string, // name
    string // value
  >
>;

export function extractGasSnapshotCheatcodes(
  suiteResults: SuiteResult[],
): GasSnapshotCheatcodesMap {
  const snapshots: GasSnapshotCheatcodesMap = new Map();
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
