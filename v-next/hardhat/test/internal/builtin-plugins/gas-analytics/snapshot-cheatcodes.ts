import type {
  SnapshotCheatcode,
  SnapshotCheatcodeChange,
  SnapshotCheatcodesMap,
  SnapshotCheatcodesWithMetadataMap,
} from "../../../../src/internal/builtin-plugins/gas-analytics/snapshot-cheatcodes.js";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, before, describe, it } from "node:test";

import {
  emptyDir,
  exists,
  FileNotFoundError,
  mkdtemp,
  readJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  compareSnapshotCheatcodes,
  extractSnapshotCheatcodes,
  getSnapshotCheatcodesPath,
  printSnapshotCheatcodeChanges,
  readSnapshotCheatcodes,
  SNAPSHOT_CHEATCODES_DIR,
  stringifySnapshotCheatcodes,
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
        createSuiteResult("contracts/MyContract.t.sol:MyContract", [
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
      assert.equal(groupA["entry-a"].value, "100");
      assert.equal(
        groupA["entry-a"].metadata.source,
        "contracts/MyContract.t.sol",
      );
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
      assert.equal(groupB["entry-a"].value, "100");
      assert.equal(groupB["entry-b"].value, "200");
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
      assert.equal(groupA["entry-a"].value, "100");
      const groupB = snapshots.get("GroupB");
      assert.ok(groupB !== undefined, "groupB should be defined");
      assert.equal(groupB["entry-a"].value, "100");
      assert.equal(groupB["entry-b"].value, "200");
    });

    it("should handle multiple suites", () => {
      const suiteResults = [
        createSuiteResult("contracts/ContractA.t.sol:ContractA", [
          createTestResultWithSnapshots([
            {
              name: "GroupA",
              entries: [{ name: "entry-a", value: "100" }],
            },
          ]),
        ]),
        createSuiteResult("contracts/ContractB.t.sol:ContractB", [
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
      assert.equal(groupA["entry-a"].value, "100");
      assert.equal(
        groupA["entry-a"].metadata.source,
        "contracts/ContractA.t.sol",
      );
      const groupB = snapshots.get("GroupB");
      assert.ok(groupB !== undefined, "groupB should be defined");
      assert.equal(groupB["entry-b"].value, "200");
      assert.equal(
        groupB["entry-b"].metadata.source,
        "contracts/ContractB.t.sol",
      );
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
      assert.equal(sharedGroup["entry-1"].value, "100");
      assert.equal(sharedGroup["entry-2"].value, "200");
      assert.equal(sharedGroup["entry-3"].value, "300");
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
      assert.equal(testGroup["duplicate-entry"].value, "300");
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
            "calculator-add": {
              value: "48359",
              metadata: {
                source: "tests/CalculatorTest.sol",
              },
            },
            "calculator-subtract": {
              value: "47891",
              metadata: {
                source: "tests/CalculatorTest.sol",
              },
            },
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
      const snapshots: SnapshotCheatcodesWithMetadataMap = new Map<
        string,
        Record<string, { value: string; metadata: { source: string } }>
      >([
        [
          "GroupA",
          {
            "entry-a": {
              value: "100",
              metadata: { source: "contracts/GroupA.t.sol" },
            },
          },
        ],
        [
          "GroupB",
          {
            "entry-b": {
              value: "200",
              metadata: { source: "contracts/GroupB.t.sol" },
            },
            "entry-c": {
              value: "300",
              metadata: { source: "contracts/GroupB.t.sol" },
            },
          },
        ],
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
            "old-entry": {
              value: "100",
              metadata: { source: "contracts/TestGroup.t.sol" },
            },
          },
        ],
      ]);
      const secondSnapshots = new Map([
        [
          "TestGroup",
          {
            "new-entry": {
              value: "200",
              metadata: { source: "contracts/TestGroup.t.sol" },
            },
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

  describe("readSnapshotCheatcodes", () => {
    let tmpDir: string;

    before(async () => {
      tmpDir = await mkdtemp("snapshot-cheatcodes-test-");
    });

    afterEach(async () => {
      await emptyDir(tmpDir);
    });

    it("should read single snapshot group from JSON file", async () => {
      const snapshots: SnapshotCheatcodesWithMetadataMap = new Map([
        [
          "CalculatorTest",
          {
            "calculator-add": {
              value: "48359",
              metadata: {
                source: "tests/CalculatorTest.sol",
              },
            },
            "calculator-subtract": {
              value: "47891",
              metadata: {
                source: "tests/CalculatorTest.sol",
              },
            },
          },
        ],
      ]);

      await writeSnapshotCheatcodes(tmpDir, snapshots);
      const readSnapshots = await readSnapshotCheatcodes(tmpDir);

      assert.equal(readSnapshots.size, 1);
      const calculatorTest = readSnapshots.get("CalculatorTest");
      assert.ok(
        calculatorTest !== undefined,
        "CalculatorTest should be defined",
      );
      assert.equal(calculatorTest["calculator-add"], "48359");
      assert.equal(calculatorTest["calculator-subtract"], "47891");
    });

    it("should read multiple snapshot groups from separate JSON files", async () => {
      const snapshots: SnapshotCheatcodesWithMetadataMap = new Map<
        string,
        Record<string, { value: string; metadata: { source: string } }>
      >([
        [
          "GroupA",
          {
            "entry-a": {
              value: "100",
              metadata: { source: "contracts/GroupA.t.sol" },
            },
          },
        ],
        [
          "GroupB",
          {
            "entry-b": {
              value: "200",
              metadata: { source: "contracts/GroupB.t.sol" },
            },
            "entry-c": {
              value: "300",
              metadata: { source: "contracts/GroupB.t.sol" },
            },
          },
        ],
      ]);

      await writeSnapshotCheatcodes(tmpDir, snapshots);
      const readSnapshots = await readSnapshotCheatcodes(tmpDir);

      assert.equal(readSnapshots.size, 2);
      const groupA = readSnapshots.get("GroupA");
      assert.ok(groupA !== undefined, "GroupA should be defined");
      assert.equal(groupA["entry-a"], "100");
      const groupB = readSnapshots.get("GroupB");
      assert.ok(groupB !== undefined, "GroupB should be defined");
      assert.equal(groupB["entry-b"], "200");
      assert.equal(groupB["entry-c"], "300");
    });

    it("should throw FileNotFoundError when snapshots directory doesn't exist", async () => {
      try {
        await readSnapshotCheatcodes(tmpDir);
        assert.fail("Expected FileNotFoundError to be thrown");
      } catch (error) {
        assert.ok(
          error instanceof FileNotFoundError,
          "Error should be FileNotFoundError",
        );
      }
    });
  });

  describe("stringifySnapshotCheatcodes", () => {
    it("should stringify single snapshot", () => {
      const snapshots: SnapshotCheatcode[] = [
        { group: "GroupA", name: "entry-a", value: "100" },
      ];

      const result = stringifySnapshotCheatcodes(snapshots);

      assert.equal(result, "GroupA#entry-a: 100");
    });

    it("should stringify multiple snapshots", () => {
      const snapshots: SnapshotCheatcode[] = [
        { group: "GroupA", name: "entry-a", value: "100" },
        { group: "GroupA", name: "entry-b", value: "200" },
      ];

      const result = stringifySnapshotCheatcodes(snapshots);

      const expected = `GroupA#entry-a: 100
GroupA#entry-b: 200`;
      assert.equal(result, expected);
    });

    it("should handle empty snapshots array", () => {
      const snapshots: SnapshotCheatcode[] = [];

      const result = stringifySnapshotCheatcodes(snapshots);

      assert.equal(result, "");
    });

    it("should handle snapshots from multiple groups", () => {
      const snapshots: SnapshotCheatcode[] = [
        { group: "GroupA", name: "entry-a", value: "100" },
        { group: "GroupB", name: "entry-b", value: "200" },
        { group: "GroupA", name: "entry-c", value: "300" },
      ];

      const result = stringifySnapshotCheatcodes(snapshots);

      const expected = `GroupA#entry-a: 100
GroupA#entry-c: 300
GroupB#entry-b: 200`;
      assert.equal(result, expected);
    });

    it("should sort snapshots alphabetically", () => {
      const snapshots: SnapshotCheatcode[] = [
        { group: "ZGroup", name: "entry-z", value: "300" },
        { group: "AGroup", name: "entry-b", value: "100" },
        { group: "AGroup", name: "entry-a", value: "200" },
        { group: "MGroup", name: "entry-m", value: "150" },
      ];

      const result = stringifySnapshotCheatcodes(snapshots);

      const expected = `AGroup#entry-a: 200
AGroup#entry-b: 100
MGroup#entry-m: 150
ZGroup#entry-z: 300`;
      assert.equal(result, expected);
    });
  });

  describe("compareSnapshotCheatcodes", () => {
    it("should return empty comparison when both snapshots are empty", () => {
      const result = compareSnapshotCheatcodes(new Map(), new Map());

      assert.deepEqual(result, {
        added: [],
        removed: [],
        changed: [],
      });
    });

    it("should detect added snapshots", () => {
      const previous: SnapshotCheatcodesMap = new Map();
      const current: SnapshotCheatcodesWithMetadataMap = new Map([
        [
          "GroupA",
          {
            "entry-a": {
              value: "100",
              metadata: { source: "contracts/GroupA.t.sol" },
            },
          },
        ],
      ]);

      const result = compareSnapshotCheatcodes(previous, current);

      assert.equal(result.added.length, 1);
      assert.equal(result.removed.length, 0);
      assert.equal(result.changed.length, 0);
      assert.deepEqual(result.added[0], {
        group: "GroupA",
        name: "entry-a",
        value: "100",
      });
    });

    it("should detect removed snapshots", () => {
      const previous: SnapshotCheatcodesMap = new Map([
        ["GroupA", { "entry-a": "100" }],
      ]);
      const current: SnapshotCheatcodesWithMetadataMap = new Map();

      const result = compareSnapshotCheatcodes(previous, current);

      assert.equal(result.added.length, 0);
      assert.equal(result.removed.length, 1);
      assert.equal(result.changed.length, 0);
      assert.deepEqual(result.removed[0], {
        group: "GroupA",
        name: "entry-a",
        value: "100",
      });
    });

    it("should detect changed snapshots", () => {
      const previous: SnapshotCheatcodesMap = new Map([
        ["GroupA", { "entry-a": "100" }],
      ]);
      const current: SnapshotCheatcodesWithMetadataMap = new Map([
        [
          "GroupA",
          {
            "entry-a": {
              value: "200",
              metadata: { source: "contracts/GroupA.t.sol" },
            },
          },
        ],
      ]);

      const result = compareSnapshotCheatcodes(previous, current);

      assert.equal(result.added.length, 0);
      assert.equal(result.removed.length, 0);
      assert.equal(result.changed.length, 1);
      assert.deepEqual(result.changed[0], {
        group: "GroupA",
        name: "entry-a",
        expected: 100,
        actual: 200,
        source: "contracts/GroupA.t.sol",
      });
    });

    it("should handle multiple changes", () => {
      const previous: SnapshotCheatcodesMap = new Map<
        string,
        Record<string, string>
      >([
        ["GroupA", { "entry-a": "100" }],
        ["GroupB", { "entry-b": "200" }],
        ["GroupC", { "entry-c": "300" }],
      ]);
      const current: SnapshotCheatcodesWithMetadataMap = new Map<
        string,
        Record<string, { value: string; metadata: { source: string } }>
      >([
        [
          "GroupA",
          {
            "entry-a": {
              value: "150",
              metadata: { source: "contracts/GroupA.t.sol" },
            },
          },
        ],
        [
          "GroupB",
          {
            "entry-b": {
              value: "200",
              metadata: { source: "contracts/GroupB.t.sol" },
            },
          },
        ],
        [
          "GroupD",
          {
            "entry-d": {
              value: "400",
              metadata: { source: "contracts/GroupD.t.sol" },
            },
          },
        ],
      ]);

      const result = compareSnapshotCheatcodes(previous, current);

      assert.equal(result.added.length, 1);
      assert.equal(result.removed.length, 1);
      assert.equal(result.changed.length, 1);
      assert.equal(result.added[0].group, "GroupD");
      assert.equal(result.added[0].name, "entry-d");
      assert.equal(result.removed[0].group, "GroupC");
      assert.equal(result.removed[0].name, "entry-c");
      assert.equal(result.changed[0].group, "GroupA");
      assert.equal(result.changed[0].name, "entry-a");
    });

    it("should handle unchanged snapshots", () => {
      const previous: SnapshotCheatcodesMap = new Map([
        ["GroupA", { "entry-a": "100" }],
      ]);
      const current: SnapshotCheatcodesWithMetadataMap = new Map([
        [
          "GroupA",
          {
            "entry-a": {
              value: "100",
              metadata: { source: "contracts/GroupA.t.sol" },
            },
          },
        ],
      ]);

      const result = compareSnapshotCheatcodes(previous, current);

      assert.equal(result.added.length, 0);
      assert.equal(result.removed.length, 0);
      assert.equal(result.changed.length, 0);
    });

    it("should sort results by group#name", () => {
      const previous: SnapshotCheatcodesMap = new Map<
        string,
        Record<string, string>
      >([
        ["ZGroup", { "entry-z": "100", "entry-a": "200" }],
        ["AGroup", { "entry-m": "300", "entry-b": "400" }],
      ]);
      const current: SnapshotCheatcodesWithMetadataMap = new Map<
        string,
        Record<string, { value: string; metadata: { source: string } }>
      >([
        [
          "MGroup",
          {
            "entry-x": {
              value: "500",
              metadata: { source: "contracts/MGroup.t.sol" },
            },
            "entry-c": {
              value: "600",
              metadata: { source: "contracts/MGroup.t.sol" },
            },
          },
        ],
        [
          "BGroup",
          {
            "entry-y": {
              value: "150",
              metadata: { source: "contracts/BGroup.t.sol" },
            },
            "entry-d": {
              value: "250",
              metadata: { source: "contracts/BGroup.t.sol" },
            },
          },
        ],
        [
          "ZGroup",
          {
            "entry-z": {
              value: "999",
              metadata: { source: "contracts/ZGroup.t.sol" },
            },
          },
        ],
      ]);

      const result = compareSnapshotCheatcodes(previous, current);

      assert.equal(result.added.length, 4);
      assert.equal(
        `${result.added[0].group}#${result.added[0].name}`,
        "BGroup#entry-d",
      );
      assert.equal(
        `${result.added[1].group}#${result.added[1].name}`,
        "BGroup#entry-y",
      );
      assert.equal(
        `${result.added[2].group}#${result.added[2].name}`,
        "MGroup#entry-c",
      );
      assert.equal(
        `${result.added[3].group}#${result.added[3].name}`,
        "MGroup#entry-x",
      );

      assert.equal(result.removed.length, 3);
      assert.equal(
        `${result.removed[0].group}#${result.removed[0].name}`,
        "AGroup#entry-b",
      );
      assert.equal(
        `${result.removed[1].group}#${result.removed[1].name}`,
        "AGroup#entry-m",
      );
      assert.equal(
        `${result.removed[2].group}#${result.removed[2].name}`,
        "ZGroup#entry-a",
      );

      assert.equal(result.changed.length, 1);
      assert.equal(
        `${result.changed[0].group}#${result.changed[0].name}`,
        "ZGroup#entry-z",
      );
    });
  });

  describe("printSnapshotCheatcodeChanges", () => {
    let output: string[] = [];
    const logger = (...args: unknown[]) => output.push(args.join(""));
    const getLoggerOutput = (): string =>
      // Remove ANSI escape codes for color and formatting
      output.join("\n").replace(/\x1b\[[0-9;]*m/g, "");

    afterEach(() => {
      output = [];
    });

    it("should print value increase", () => {
      const changes: SnapshotCheatcodeChange[] = [
        {
          group: "GroupA",
          name: "entry-a",
          expected: 10000,
          actual: 15000,
          source: "contracts/GroupA.t.sol",
        },
      ];

      printSnapshotCheatcodeChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /GroupA#entry-a/);
      assert.match(text, /\(in contracts\/GroupA\.t\.sol\)/);
      assert.match(text, /Expected: 10000/);
      assert.match(text, /Actual:\s+15000/);
      assert.match(text, /\+50\.00%/);
      assert.match(text, /Δ\+5000/);
    });

    it("should print value decrease", () => {
      const changes: SnapshotCheatcodeChange[] = [
        {
          group: "GroupA",
          name: "entry-a",
          expected: 15000,
          actual: 10000,
          source: "contracts/GroupA.t.sol",
        },
      ];

      printSnapshotCheatcodeChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /Expected: 15000/);
      assert.match(text, /Actual:\s+10000/);
      assert.match(text, /-33\.33%/);
      assert.match(text, /Δ-5000/);
    });

    it("should omit percentage when expected is 0", () => {
      const changes: SnapshotCheatcodeChange[] = [
        {
          group: "GroupA",
          name: "entry-a",
          expected: 0,
          actual: 5000,
          source: "contracts/GroupA.t.sol",
        },
      ];

      printSnapshotCheatcodeChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /Expected: 0/);
      assert.match(text, /Actual:\s+5000/);
      assert.match(text, /Δ\+5000/);
      assert.doesNotMatch(text, /%/);
    });

    it("should print multiple changes", () => {
      const changes: SnapshotCheatcodeChange[] = [
        {
          group: "GroupA",
          name: "entry-a",
          expected: 10000,
          actual: 15000,
          source: "contracts/GroupA.t.sol",
        },
        {
          group: "GroupB",
          name: "entry-b",
          expected: 20000,
          actual: 18000,
          source: "contracts/GroupB.t.sol",
        },
      ];

      printSnapshotCheatcodeChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /GroupA#entry-a/);
      assert.match(text, /GroupB#entry-b/);
    });

    it("should handle empty changes array", () => {
      const changes: SnapshotCheatcodeChange[] = [];

      printSnapshotCheatcodeChanges(changes, logger);

      const text = getLoggerOutput();
      assert.equal(text, "");
    });
  });
});
