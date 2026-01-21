import type { SnapshotCheatcodesMap } from "../../../../src/internal/builtin-plugins/gas-analytics/snapshot-cheatcodes.js";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, before, describe, it } from "node:test";

import {
  emptyDir,
  exists,
  mkdtemp,
  readJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  extractSnapshotCheatcodes,
  getSnapshotCheatcodesPath,
  SNAPSHOT_CHEATCODES_DIR,
  writeSnapshotCheatcodes,
} from "../../../../src/internal/builtin-plugins/gas-analytics/snapshot-cheatcodes.js";

import {
  createSuiteResult,
  createTestResultWithSnapshots,
} from "./suite-result-helpers.js";

describe("snapshot-cheatcodes", () => {
  describe("extractSnapshotCheatcodes", () => {
    it("should extract single snapshot group with single entry", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots([
            {
              name: "GroupA",
              entries: [{ name: "entry-a", value: "100" }],
            },
          ]),
        ]),
      ];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 1);
      const groupA = snapshots.get("GroupA");
      assert.ok(groupA !== undefined, "GroupA should be defined");
      assert.equal(groupA["entry-a"], "100");
    });

    it("should extract single snapshot group with multiple entries", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots([
            {
              name: "GroupB",
              entries: [
                { name: "entry-a", value: "100" },
                { name: "entry-b", value: "200" },
              ],
            },
          ]),
        ]),
      ];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 1);
      const groupB = snapshots.get("GroupB");
      assert.ok(groupB !== undefined, "GroupB should be defined");
      assert.equal(groupB["entry-a"], "100");
      assert.equal(groupB["entry-b"], "200");
    });

    it("should extract multiple snapshot groups", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots([
            {
              name: "GroupA",
              entries: [{ name: "entry-a", value: "100" }],
            },
            {
              name: "GroupB",
              entries: [
                { name: "entry-a", value: "100" },
                { name: "entry-b", value: "200" },
              ],
            },
          ]),
        ]),
      ];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 2);
      const groupA = snapshots.get("GroupA");
      assert.ok(groupA !== undefined, "groupA should be defined");
      assert.equal(groupA["entry-a"], "100");
      const groupB = snapshots.get("GroupB");
      assert.ok(groupB !== undefined, "groupB should be defined");
      assert.equal(groupB["entry-a"], "100");
      assert.equal(groupB["entry-b"], "200");
    });

    it("should handle multiple suites", () => {
      const suiteResults = [
        createSuiteResult("ContractA", [
          createTestResultWithSnapshots([
            {
              name: "GroupA",
              entries: [{ name: "entry-a", value: "100" }],
            },
          ]),
        ]),
        createSuiteResult("ContractB", [
          createTestResultWithSnapshots([
            {
              name: "GroupB",
              entries: [{ name: "entry-b", value: "200" }],
            },
          ]),
        ]),
      ];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 2);
      const groupA = snapshots.get("GroupA");
      assert.ok(groupA !== undefined, "groupA should be defined");
      assert.equal(groupA["entry-a"], "100");
      const groupB = snapshots.get("GroupB");
      assert.ok(groupB !== undefined, "groupB should be defined");
      assert.equal(groupB["entry-b"], "200");
    });

    it("should merge entries from same group across multiple suites", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots([
            {
              name: "SharedGroup",
              entries: [{ name: "entry-1", value: "100" }],
            },
          ]),
          createTestResultWithSnapshots([
            {
              name: "SharedGroup",
              entries: [{ name: "entry-2", value: "200" }],
            },
          ]),
        ]),
        createSuiteResult("AnotherContract", [
          createTestResultWithSnapshots([
            {
              name: "SharedGroup",
              entries: [{ name: "entry-3", value: "300" }],
            },
          ]),
        ]),
      ];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 1);
      const sharedGroup = snapshots.get("SharedGroup");
      assert.ok(sharedGroup !== undefined, "sharedGroup should be defined");
      assert.equal(sharedGroup["entry-1"], "100");
      assert.equal(sharedGroup["entry-2"], "200");
      assert.equal(sharedGroup["entry-3"], "300");
    });

    it("should overwrite entries with the same name in the same group with the latest value across multiple suites", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots([
            {
              name: "TestGroup",
              entries: [{ name: "duplicate-entry", value: "100" }],
            },
          ]),
          createTestResultWithSnapshots([
            {
              name: "TestGroup",
              entries: [{ name: "duplicate-entry", value: "200" }],
            },
          ]),
        ]),
        createSuiteResult("AnotherContract", [
          createTestResultWithSnapshots([
            {
              name: "TestGroup",
              entries: [{ name: "duplicate-entry", value: "300" }],
            },
          ]),
        ]),
      ];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 1);
      const testGroup = snapshots.get("TestGroup");
      assert.ok(testGroup !== undefined, "testGroup should be defined");
      assert.equal(testGroup["duplicate-entry"], "300");
    });

    it("should handle empty suite results", () => {
      const snapshots = extractSnapshotCheatcodes([]);

      assert.equal(snapshots.size, 0);
    });

    it("should handle suite with no test results", () => {
      const suiteResults = [createSuiteResult("EmptyContract", [])];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 0);
    });

    it("should handle test results with no snapshot groups", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots(undefined),
        ]),
      ];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 0);
    });

    it("should handle test results with empty snapshot groups array", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [createTestResultWithSnapshots([])]),
      ];

      const snapshots = extractSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 0);
    });
  });

  describe("writeSnapshotCheatcodes", () => {
    let tmpDir: string;

    before(async () => {
      tmpDir = await mkdtemp("snapshot-cheatcodes-test-");
    });

    afterEach(async () => {
      await emptyDir(tmpDir);
    });

    it("should write single snapshot group to JSON file", async () => {
      const snapshots = new Map([
        [
          "CalculatorTest",
          {
            "calculator-add": "48359",
            "calculator-subtract": "47891",
          },
        ],
      ]);

      await writeSnapshotCheatcodes(tmpDir, snapshots);

      const snapshotPath = getSnapshotCheatcodesPath(
        tmpDir,
        "CalculatorTest.json",
      );
      const savedContent = await readJsonFile(snapshotPath);

      assert.deepEqual(savedContent, {
        "calculator-add": "48359",
        "calculator-subtract": "47891",
      });
    });

    it("should write multiple snapshot groups to separate JSON files", async () => {
      const snapshots: SnapshotCheatcodesMap = new Map<
        string,
        Record<string, string>
      >([
        ["GroupA", { "entry-a": "100" }],
        ["GroupB", { "entry-b": "200", "entry-c": "300" }],
      ]);

      await writeSnapshotCheatcodes(tmpDir, snapshots);

      const groupAPath = getSnapshotCheatcodesPath(tmpDir, "GroupA.json");
      const groupAContent = await readJsonFile(groupAPath);
      assert.deepEqual(groupAContent, { "entry-a": "100" });

      const groupBPath = getSnapshotCheatcodesPath(tmpDir, "GroupB.json");
      const groupBContent = await readJsonFile(groupBPath);
      assert.deepEqual(groupBContent, {
        "entry-b": "200",
        "entry-c": "300",
      });
    });

    it("should overwrite existing snapshot files", async () => {
      const firstSnapshots = new Map([
        [
          "TestGroup",
          {
            "old-entry": "100",
          },
        ],
      ]);
      const secondSnapshots = new Map([
        [
          "TestGroup",
          {
            "new-entry": "200",
          },
        ],
      ]);

      await writeSnapshotCheatcodes(tmpDir, firstSnapshots);
      await writeSnapshotCheatcodes(tmpDir, secondSnapshots);

      const snapshotPath = getSnapshotCheatcodesPath(tmpDir, "TestGroup.json");
      const savedContent = await readJsonFile(snapshotPath);

      assert.deepEqual(savedContent, { "new-entry": "200" });
    });

    it("should handle empty snapshots map", async () => {
      const emptySnapshots = new Map();

      await writeSnapshotCheatcodes(tmpDir, emptySnapshots);

      const snapshotsDir = path.join(tmpDir, SNAPSHOT_CHEATCODES_DIR);
      const dirExists = await exists(snapshotsDir);
      assert.equal(
        dirExists,
        false,
        "Snapshots directory should not be created when map is empty",
      );
    });
  });
});
