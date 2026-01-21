import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";

import {
  emptyDir,
  exists,
  readJsonFile,
  readUtf8File,
  mkdtemp,
} from "@nomicfoundation/hardhat-utils/fs";

import { getFunctionGasSnapshotsPath } from "../../../../../../src/internal/builtin-plugins/gas-analytics/function-gas-snapshots.js";
import { getSnapshotCheatcodesPath } from "../../../../../../src/internal/builtin-plugins/gas-analytics/snapshot-cheatcodes.js";
import {
  handleSnapshot,
  handleSnapshotCheck,
  logSnapshotResult,
  logSnapshotCheckResult,
} from "../../../../../../src/internal/builtin-plugins/gas-analytics/tasks/solidity-test/task-action.js";
import {
  createSuiteResult,
  createStandardTestResult,
  createTestResultWithSnapshots,
} from "../../suite-result-helpers.js";

describe("solidity-test/task-action (override in gas-analytics/index)", () => {
  describe("handleSnapshot", () => {
    let tmpDir: string;

    before(async () => {
      tmpDir = await mkdtemp("snapshots-handler-test-");
    });

    afterEach(async () => {
      await emptyDir(tmpDir);
    });

    it("should write function gas snapshots when tests pass", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      const result = await handleSnapshot(tmpDir, suiteResults, true);

      assert.equal(result.functionGasSnapshotsWritten, true);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);
      assert.equal(savedContent, "MyContract#testA (gas: 10000)");
    });

    it("should not write function gas snapshots when tests fail", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      const result = await handleSnapshot(tmpDir, suiteResults, false);

      assert.equal(result.functionGasSnapshotsWritten, false);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const fileExists = await exists(snapshotPath);
      assert.equal(fileExists, false);
    });

    it("should write snapshot cheatcodes when tests pass", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots([
            {
              name: "TestGroup",
              entries: [{ name: "test-entry", value: "42" }],
            },
          ]),
        ]),
      ];

      await handleSnapshot(tmpDir, suiteResults, true);

      const cheatcodePath = getSnapshotCheatcodesPath(tmpDir, "TestGroup.json");
      const cheatcodeContent = await readJsonFile(cheatcodePath);
      assert.deepEqual(cheatcodeContent, { "test-entry": "42" });
    });

    it("should write snapshot cheatcodes even when tests fail", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createTestResultWithSnapshots([
            {
              name: "TestGroup",
              entries: [{ name: "test-entry", value: "42" }],
            },
          ]),
        ]),
      ];

      await handleSnapshot(tmpDir, suiteResults, false);

      const cheatcodePath = getSnapshotCheatcodesPath(tmpDir, "TestGroup.json");
      const cheatcodeContent = await readJsonFile(cheatcodePath);
      assert.deepEqual(cheatcodeContent, { "test-entry": "42" });
    });

    it("should write both function snapshots and cheatcodes when both are present", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
          createTestResultWithSnapshots([
            {
              name: "TestGroup",
              entries: [{ name: "test-entry", value: "42" }],
            },
          ]),
        ]),
      ];

      await handleSnapshot(tmpDir, suiteResults, true);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const functionContent = await readUtf8File(snapshotPath);
      assert.equal(functionContent, "MyContract#testA (gas: 10000)");

      const cheatcodePath = getSnapshotCheatcodesPath(tmpDir, "TestGroup.json");
      const cheatcodeContent = await readJsonFile(cheatcodePath);
      assert.deepEqual(cheatcodeContent, { "test-entry": "42" });
    });
  });

  describe("logSnapshotResult", () => {
    it("should log success message when function gas snapshots were written", () => {
      const result = { functionGasSnapshotsWritten: true };
      const output: string[] = [];
      const logger = (...args: any[]) => output.push(args.join(""));

      logSnapshotResult(result, logger);

      const text = output.join("\n");
      assert.match(text, /Function gas snapshots written successfully/);
    });

    it("should not log anything when function gas snapshots were not written", () => {
      const result = { functionGasSnapshotsWritten: false };
      const output: string[] = [];
      const logger = (...args: any[]) => output.push(args.join(""));

      logSnapshotResult(result, logger);

      assert.equal(output.length, 0);
    });
  });

  describe("handleSnapshotCheck", () => {
    let tmpDir: string;

    before(async () => {
      tmpDir = await mkdtemp("snapshots-check-test-");
    });

    afterEach(async () => {
      await emptyDir(tmpDir);
    });

    it("should write snapshots on first run (no existing file)", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      const result = await handleSnapshotCheck(tmpDir, suiteResults);

      assert.equal(result.passed, true);
      assert.equal(result.functionGasSnapshotsWritten, true);
      assert.equal(result.comparison.added.length, 0);
      assert.equal(result.comparison.removed.length, 0);
      assert.equal(result.comparison.changed.length, 0);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);
      assert.equal(savedContent, "MyContract#testA (gas: 10000)");
    });

    it("should pass when snapshots are unchanged", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      await handleSnapshot(tmpDir, suiteResults, true);

      const result = await handleSnapshotCheck(tmpDir, suiteResults);

      assert.equal(result.passed, true);
      assert.equal(result.functionGasSnapshotsWritten, false);
      assert.equal(result.comparison.added.length, 0);
      assert.equal(result.comparison.removed.length, 0);
      assert.equal(result.comparison.changed.length, 0);
    });

    it("should fail when gas changes", async () => {
      const initialResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];
      const changedResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 15000n),
        ]),
      ];

      await handleSnapshot(tmpDir, initialResults, true);

      const result = await handleSnapshotCheck(tmpDir, changedResults);

      assert.equal(result.passed, false);
      assert.equal(result.functionGasSnapshotsWritten, false);
      assert.equal(result.comparison.added.length, 0);
      assert.equal(result.comparison.removed.length, 0);
      assert.equal(result.comparison.changed.length, 1);
    });

    it("should pass and update file when functions are added", async () => {
      const initialResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];
      const withAddedResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
          createStandardTestResult("testB", 20000n),
        ]),
      ];

      await handleSnapshot(tmpDir, initialResults, true);

      const result = await handleSnapshotCheck(tmpDir, withAddedResults);

      assert.equal(result.passed, true);
      assert.equal(result.functionGasSnapshotsWritten, true);
      assert.equal(result.comparison.added.length, 1);
      assert.equal(result.comparison.removed.length, 0);
      assert.equal(result.comparison.changed.length, 0);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);
      assert.match(savedContent, /MyContract#testB \(gas: 20000\)/);
    });

    it("should pass and update file when functions are removed", async () => {
      const initialResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
          createStandardTestResult("testB", 20000n),
        ]),
      ];
      const withRemovedResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      await handleSnapshot(tmpDir, initialResults, true);

      const result = await handleSnapshotCheck(tmpDir, withRemovedResults);

      assert.equal(result.passed, true);
      assert.equal(result.functionGasSnapshotsWritten, true);
      assert.equal(result.comparison.added.length, 0);
      assert.equal(result.comparison.removed.length, 1);
      assert.equal(result.comparison.changed.length, 0);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);
      assert.doesNotMatch(savedContent, /testB/);
    });
  });

  describe("logSnapshotCheckResult", () => {
    it("should log failure message when check fails", () => {
      const result = {
        passed: false,
        comparison: {
          added: [],
          removed: [],
          changed: [
            {
              contractNameOrFqn: "MyContract",
              functionSig: "testA",
              kind: "standard" as const,
              expected: 10000,
              actual: 15000,
            },
          ],
        },
        functionGasSnapshotsWritten: false,
      };
      const output: string[] = [];
      const logger = (...args: any[]) => output.push(args.join(""));

      logSnapshotCheckResult(result, logger);

      const text = output.join("\n");
      assert.match(text, /Snapshot check failed/);
      assert.match(text, /1 function\(s\) changed/);
      assert.match(text, /To update snapshots, run your tests with --snapshot/);
    });

    it("should log first-time write message when function gas snapshots written with no changes", () => {
      const result = {
        passed: true,
        comparison: {
          added: [],
          removed: [],
          changed: [],
        },
        functionGasSnapshotsWritten: true,
      };
      const output: string[] = [];
      const logger = (...args: any[]) => output.push(args.join(""));

      logSnapshotCheckResult(result, logger);

      const text = output.join("\n");
      assert.match(text, /Function gas snapshots written successfully/);
    });

    it("should log check passed message when there are no changes", () => {
      const result = {
        passed: true,
        comparison: {
          added: [],
          removed: [],
          changed: [],
        },
        functionGasSnapshotsWritten: false,
      };
      const output: string[] = [];
      const logger = (...args: any[]) => output.push(args.join(""));

      logSnapshotCheckResult(result, logger);

      const text = output.join("\n");
      assert.match(text, /Snapshot check passed/);
    });

    it("should log check passed with added functions", () => {
      const result = {
        passed: true,
        comparison: {
          added: [
            {
              contractNameOrFqn: "MyContract",
              functionSig: "testB",
              gasUsage: {
                kind: "standard" as const,
                gas: 20000n,
              },
            },
          ],
          removed: [],
          changed: [],
        },
        functionGasSnapshotsWritten: true,
      };
      const output: string[] = [];
      const logger = (...args: any[]) => output.push(args.join(""));

      logSnapshotCheckResult(result, logger);

      const text = output.join("\n");
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Added 1 function\(s\):/);
      assert.match(text, /\+ MyContract#testB \(gas: 20000\)/);
    });

    it("should log check passed with removed functions", () => {
      const result = {
        passed: true,
        comparison: {
          added: [],
          removed: [
            {
              contractNameOrFqn: "MyContract",
              functionSig: "testB",
              gasUsage: {
                kind: "standard" as const,
                gas: 20000n,
              },
            },
          ],
          changed: [],
        },
        functionGasSnapshotsWritten: true,
      };
      const output: string[] = [];
      const logger = (...args: any[]) => output.push(args.join(""));

      logSnapshotCheckResult(result, logger);

      const text = output.join("\n");
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Removed 1 function\(s\):/);
      assert.match(text, /- MyContract#testB \(gas: 20000\)/);
    });
  });
});
