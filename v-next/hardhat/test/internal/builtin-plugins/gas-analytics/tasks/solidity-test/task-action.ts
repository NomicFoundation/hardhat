import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import {
  emptyDir,
  exists,
  readJsonFile,
  readUtf8File,
  mkdtemp,
} from "@nomicfoundation/hardhat-utils/fs";

import { getFunctionGasSnapshotsPath } from "../../../../../../src/internal/builtin-plugins/gas-analytics/function-gas-snapshots.js";
import { getGasSnapshotCheatcodesPath } from "../../../../../../src/internal/builtin-plugins/gas-analytics/gas-snapshot-cheatcodes.js";
import {
  handleSnapshot,
  handleSnapshotCheck,
} from "../../../../../../src/internal/builtin-plugins/gas-analytics/tasks/solidity-test/task-action.js";
import {
  createSuiteResult,
  createStandardTestResult,
  createTestResultWithSnapshots,
} from "../../suite-result-helpers.js";

describe("solidity-test/task-action (override in gas-analytics/index)", () => {
  describe("handleSnapshot", () => {
    let tmpDir: string;
    let consoleLogOutput: string[];
    let originalConsoleLog: typeof console.log;

    before(async () => {
      tmpDir = await mkdtemp("gas-snapshots-handler-test-");
      consoleLogOutput = [];
      originalConsoleLog = console.log;
      console.log = (...args: any[]) => {
        consoleLogOutput.push(args.join(""));
      };
    });

    after(() => {
      console.log = originalConsoleLog;
    });

    afterEach(async () => {
      await emptyDir(tmpDir);
      consoleLogOutput = [];
    });

    it("should write function gas snapshots when tests pass", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      await handleSnapshot(tmpDir, suiteResults, true);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);
      assert.equal(savedContent, "MyContract#testA (gas: 10000)");

      const output = consoleLogOutput.join("\n");
      assert.match(output, /Gas snapshots written successfully/);
    });

    it("should not write function gas snapshots when tests fail", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      await handleSnapshot(tmpDir, suiteResults, false);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const fileExists = await exists(snapshotPath);
      assert.equal(fileExists, false);

      const output = consoleLogOutput.join("\n");
      assert.doesNotMatch(output, /Gas snapshots written successfully/);
    });

    it("should write gas snapshot cheatcodes when tests pass", async () => {
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

      const cheatcodePath = getGasSnapshotCheatcodesPath(
        tmpDir,
        "TestGroup.json",
      );
      const cheatcodeContent = await readJsonFile(cheatcodePath);
      assert.deepEqual(cheatcodeContent, { "test-entry": "42" });
    });

    it("should write gas snapshot cheatcodes even when tests fail", async () => {
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

      const cheatcodePath = getGasSnapshotCheatcodesPath(
        tmpDir,
        "TestGroup.json",
      );
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

      const cheatcodePath = getGasSnapshotCheatcodesPath(
        tmpDir,
        "TestGroup.json",
      );
      const cheatcodeContent = await readJsonFile(cheatcodePath);
      assert.deepEqual(cheatcodeContent, { "test-entry": "42" });
    });
  });

  describe("handleSnapshotCheck", () => {
    let tmpDir: string;
    let consoleLogOutput: string[];
    let consoleErrorOutput: string[];
    let originalConsoleLog: typeof console.log;
    let originalConsoleError: typeof console.error;
    let originalExitCode: typeof process.exitCode;

    before(async () => {
      tmpDir = await mkdtemp("gas-snapshots-check-test-");
      consoleLogOutput = [];
      consoleErrorOutput = [];
      originalConsoleLog = console.log;
      originalConsoleError = console.error;
      originalExitCode = process.exitCode;
      console.log = (...args: any[]) => {
        consoleLogOutput.push(args.join(""));
      };
      console.error = (...args: any[]) => {
        consoleErrorOutput.push(args.join(""));
      };
    });

    after(() => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    });

    afterEach(async () => {
      await emptyDir(tmpDir);
      consoleLogOutput = [];
      consoleErrorOutput = [];
      process.exitCode = undefined;
    });

    after(() => {
      process.exitCode = originalExitCode;
    });

    it("should write snapshots on first run (no existing file)", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      await handleSnapshotCheck(tmpDir, suiteResults);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);
      assert.equal(savedContent, "MyContract#testA (gas: 10000)");

      const output = consoleLogOutput.join("\n");
      assert.match(output, /Gas snapshots written successfully/);
    });

    it("should pass when snapshots are unchanged", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      await handleSnapshot(tmpDir, suiteResults, true);
      consoleLogOutput = [];

      await handleSnapshotCheck(tmpDir, suiteResults);

      const output = consoleLogOutput.join("\n");
      assert.match(output, /Gas snapshot check passed/);
      assert.equal(process.exitCode, undefined);
    });

    it("should fail and set exit code when gas changes", async () => {
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
      consoleLogOutput = [];

      await handleSnapshotCheck(tmpDir, changedResults);

      const output = consoleLogOutput.join("\n");
      assert.match(output, /Gas snapshot check failed/);
      assert.match(output, /1 function\(s\) changed/);
      assert.match(
        output,
        /To update snapshots, run your tests with --snapshot/,
      );
      assert.equal(process.exitCode, 1);

      const errorOutput = consoleErrorOutput.join("\n");
      assert.match(errorOutput, /MyContract#testA/);
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
      consoleLogOutput = [];

      await handleSnapshotCheck(tmpDir, withAddedResults);

      const output = consoleLogOutput.join("\n");
      assert.match(output, /Gas snapshot check passed/);
      assert.match(output, /Added 1 function\(s\):/);
      assert.match(output, /\+ MyContract#testB \(gas: 20000\)/);
      assert.equal(process.exitCode, undefined);

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
      consoleLogOutput = [];

      await handleSnapshotCheck(tmpDir, withRemovedResults);

      const output = consoleLogOutput.join("\n");
      assert.match(output, /Gas snapshot check passed/);
      assert.match(output, /Removed 1 function\(s\):/);
      assert.match(output, /- MyContract#testB \(gas: 20000\)/);
      assert.equal(process.exitCode, undefined);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);
      assert.doesNotMatch(savedContent, /testB/);
    });
  });
});
