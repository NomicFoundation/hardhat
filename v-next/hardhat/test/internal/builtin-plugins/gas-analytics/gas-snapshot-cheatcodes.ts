import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractGasSnapshotCheatcodes } from "../../../../src/internal/builtin-plugins/gas-analytics/gas-snapshot-cheatcodes.js";

import {
  createSuiteResult,
  createTestResultWithSnapshots,
} from "./suite-result-helpers.js";

describe("gas-snapshot-cheatcodes", () => {
  describe("extractGasSnapshotCheatcodes", () => {
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

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

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

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

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

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

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

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

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

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

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

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 1);
      const testGroup = snapshots.get("TestGroup");
      assert.ok(testGroup !== undefined, "testGroup should be defined");
      assert.equal(testGroup["duplicate-entry"], "300");
    });

    it("should handle empty suite results", () => {
      const snapshots = extractGasSnapshotCheatcodes([]);

      assert.equal(snapshots.size, 0);
    });

    it("should handle suite with no test results", () => {
      const suiteResults = [createSuiteResult("EmptyContract", [])];

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 0);
    });

    it("should handle test results with no snapshot groups", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots(undefined),
        ]),
      ];

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 0);
    });

    it("should handle test results with empty snapshot groups array", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [createTestResultWithSnapshots([])]),
      ];

      const snapshots = extractGasSnapshotCheatcodes(suiteResults);

      assert.equal(snapshots.size, 0);
    });
  });
});
