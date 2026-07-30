import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { createTmpDir } from "@nomicfoundation/hardhat-test-utils";
import {
  exists,
  readJsonFile,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import { getFunctionGasSnapshotsPath } from "../../../../../../src/internal/builtin-plugins/gas-analytics/function-gas-snapshots.js";
import { getSnapshotCheatcodesPath } from "../../../../../../src/internal/builtin-plugins/gas-analytics/snapshot-cheatcodes.js";
import {
  handleSnapshot,
  handleSnapshotCheck,
  isFilteredRun,
  logSnapshotResult,
  logSnapshotCheckResult,
} from "../../../../../../src/internal/builtin-plugins/gas-analytics/tasks/solidity-test/task-action.js";
import {
  createSuiteResult,
  createStandardTestResult,
  createTestResultWithSnapshots,
} from "../../suite-result-helpers.js";

describe("solidity-test/task-action (override in gas-analytics/index)", () => {
  describe("isFilteredRun", () => {
    it("should be false for an unscoped run (no patterns, no files)", () => {
      assert.equal(isFilteredRun({}), false);
      assert.equal(isFilteredRun({ testFiles: [] }), false);
    });

    it("should be true when --grep is a non-empty pattern", () => {
      assert.equal(isFilteredRun({ grep: "MyTest" }), true);
    });

    it("should be true when --grep-exclude is a non-empty pattern", () => {
      assert.equal(isFilteredRun({ grepExclude: "MyTest" }), true);
    });

    it("should be true when specific test files are given", () => {
      assert.equal(isFilteredRun({ testFiles: ["test/Foo.t.sol"] }), true);
    });

    // The base task normalizes an explicit empty pattern to "no filter" before
    // running EDR, so the full suite runs and added/removed snapshots are real.
    it("should be false for an empty --grep pattern", () => {
      assert.equal(isFilteredRun({ grep: "" }), false);
    });

    it("should be false for an empty --grep-exclude pattern", () => {
      assert.equal(isFilteredRun({ grepExclude: "" }), false);
    });

    it("should be false when both patterns are empty and no files are given", () => {
      assert.equal(isFilteredRun({ grep: "", grepExclude: "" }), false);
    });

    it("should be true when a non-empty pattern accompanies an empty one", () => {
      assert.equal(isFilteredRun({ grep: "", grepExclude: "MyTest" }), true);
    });
  });

  describe("handleSnapshot", () => {
    const tmp = createTmpDir("snapshots-handler-test", "test");

    it("should write function gas snapshots when tests pass", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      const result = await handleSnapshot(tmp.path, suiteResults, true);

      assert.equal(result.functionGasSnapshotsWritten, true);

      const snapshotPath = getFunctionGasSnapshotsPath(tmp.path);
      const savedContent = await readUtf8File(snapshotPath);
      assert.equal(savedContent, "MyContract#testA (gas: 10000)");
    });

    it("should not write function gas snapshots when tests fail", async () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testA", 10000n),
        ]),
      ];

      const result = await handleSnapshot(tmp.path, suiteResults, false);

      assert.equal(result.functionGasSnapshotsWritten, false);

      const snapshotPath = getFunctionGasSnapshotsPath(tmp.path);
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

      await handleSnapshot(tmp.path, suiteResults, true);

      const cheatcodePath = getSnapshotCheatcodesPath(
        tmp.path,
        "TestGroup.json",
      );
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

      await handleSnapshot(tmp.path, suiteResults, false);

      const cheatcodePath = getSnapshotCheatcodesPath(
        tmp.path,
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

      await handleSnapshot(tmp.path, suiteResults, true);

      const snapshotPath = getFunctionGasSnapshotsPath(tmp.path);
      const functionContent = await readUtf8File(snapshotPath);
      assert.equal(functionContent, "MyContract#testA (gas: 10000)");

      const cheatcodePath = getSnapshotCheatcodesPath(
        tmp.path,
        "TestGroup.json",
      );
      const cheatcodeContent = await readJsonFile(cheatcodePath);
      assert.deepEqual(cheatcodeContent, { "test-entry": "42" });
    });
  });

  describe("logSnapshotResult", () => {
    let output: string[] = [];
    const logger = (...args: any[]) => output.push(args.join(""));
    const getLoggerOutput = (): string =>
      // Remove ANSI escape codes for color and formatting
      output.join("\n").replace(/\x1b\[[0-9;]*m/g, "");

    afterEach(() => {
      output = [];
    });

    it("should log success message when function gas snapshots were written", () => {
      const result = { functionGasSnapshotsWritten: true, renamedGroups: [] };

      logSnapshotResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Function gas snapshots written successfully/);
    });

    it("should not log anything when function gas snapshots were not written", () => {
      const result = { functionGasSnapshotsWritten: false, renamedGroups: [] };

      logSnapshotResult(result, logger);

      assert.equal(output.length, 0);
    });
  });

  describe("handleSnapshotCheck", () => {
    const tmp = createTmpDir("snapshots-check-test", "test");

    describe("function gas snapshots", () => {
      it("should fail on first run when there's no function gas snapshot", async () => {
        const suiteResults = [
          createSuiteResult("MyContract", [
            createStandardTestResult("testA", 10000n),
          ]),
        ];

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmp.path,
          suiteResults,
        );

        // Checking with no stored snapshot is a mistake: it must fail.
        assert.equal(functionGasSnapshotsCheck.passed, false);
        assert.equal(functionGasSnapshotsCheck.noBaseline, true);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 0);

        // --snapshot-check is read-only: it must not bootstrap the snapshot.
        const snapshotPath = getFunctionGasSnapshotsPath(tmp.path);
        assert.equal(await exists(snapshotPath), false);
      });

      it("should pass when function gas snapshots are unchanged", async () => {
        const suiteResults = [
          createSuiteResult("MyContract", [
            createStandardTestResult("testA", 10000n),
          ]),
        ];

        await handleSnapshot(tmp.path, suiteResults, true);

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmp.path,
          suiteResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, true);
        assert.equal(functionGasSnapshotsCheck.noBaseline, false);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 0);
      });

      it("should fail when function gas changes", async () => {
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

        await handleSnapshot(tmp.path, initialResults, true);

        const snapshotPath = getFunctionGasSnapshotsPath(tmp.path);
        const before = await readUtf8File(snapshotPath);

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmp.path,
          changedResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, false);
        assert.equal(functionGasSnapshotsCheck.noBaseline, false);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 1);

        // Read-only: a changed value must not be written to the baseline.
        const after = await readUtf8File(snapshotPath);
        assert.equal(after, before);
      });

      it("should pass and not modify the baseline when functions are added", async () => {
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

        await handleSnapshot(tmp.path, initialResults, true);

        const snapshotPath = getFunctionGasSnapshotsPath(tmp.path);
        const before = await readUtf8File(snapshotPath);

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmp.path,
          withAddedResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, true);
        assert.equal(functionGasSnapshotsCheck.noBaseline, false);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 1);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 0);

        // Read-only: the added function must not be written to the baseline.
        const after = await readUtf8File(snapshotPath);
        assert.equal(after, before);
        assert.doesNotMatch(after, /testB/);
      });

      it("should pass and not modify the baseline when functions are removed", async () => {
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

        await handleSnapshot(tmp.path, initialResults, true);

        const snapshotPath = getFunctionGasSnapshotsPath(tmp.path);
        const before = await readUtf8File(snapshotPath);

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmp.path,
          withRemovedResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, true);
        assert.equal(functionGasSnapshotsCheck.noBaseline, false);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 1);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 0);

        // Read-only: the missing function must remain in the baseline.
        const after = await readUtf8File(snapshotPath);
        assert.equal(after, before);
        assert.match(after, /testB/);
      });

      it("should not flag no baseline when no existing file and no function gas snapshots produced", async () => {
        // e.g. a project that only uses snapshot cheatcodes never produces a
        // `.gas-snapshot`; the check should stay quiet rather than nag about it.
        const suiteResults = [createSuiteResult("MyContract", [])];

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmp.path,
          suiteResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, true);
        assert.equal(functionGasSnapshotsCheck.noBaseline, false);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 0);

        const snapshotPath = getFunctionGasSnapshotsPath(tmp.path);
        assert.equal(await exists(snapshotPath), false);
      });
    });

    describe("snapshot cheatcodes", () => {
      it("should fail on first run when there are no stored snapshot cheatcodes", async () => {
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

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmp.path,
          suiteResults,
        );

        // Checking with no stored snapshots is a mistake: it must fail.
        assert.equal(snapshotCheatcodesCheck.passed, false);
        assert.equal(snapshotCheatcodesCheck.noBaseline, true);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 0);

        // --snapshot-check is read-only: it must not bootstrap the snapshots.
        const cheatcodePath = getSnapshotCheatcodesPath(
          tmp.path,
          "TestGroup.json",
        );
        assert.equal(await exists(cheatcodePath), false);
      });

      it("should not flag no baseline when no existing file and no cheatcodes produced", async () => {
        const suiteResults = [
          createSuiteResult("MyContract", [
            createTestResultWithSnapshots(undefined),
          ]),
        ];

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmp.path,
          suiteResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        // Nothing was produced, so there's nothing to flag as missing a baseline.
        assert.equal(snapshotCheatcodesCheck.noBaseline, false);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 0);
      });

      it("should pass when snapshot cheatcodes are unchanged", async () => {
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

        await handleSnapshot(tmp.path, suiteResults, true);

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmp.path,
          suiteResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        assert.equal(snapshotCheatcodesCheck.noBaseline, false);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 0);
      });

      it("should fail when cheatcode values change", async () => {
        const initialResults = [
          createSuiteResult("MyContract", [
            createTestResultWithSnapshots([
              {
                name: "TestGroup",
                entries: [{ name: "test-entry", value: "42" }],
              },
            ]),
          ]),
        ];
        const changedResults = [
          createSuiteResult("MyContract", [
            createTestResultWithSnapshots([
              {
                name: "TestGroup",
                entries: [{ name: "test-entry", value: "100" }],
              },
            ]),
          ]),
        ];

        await handleSnapshot(tmp.path, initialResults, true);

        const cheatcodePath = getSnapshotCheatcodesPath(
          tmp.path,
          "TestGroup.json",
        );
        const before = await readJsonFile(cheatcodePath);

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmp.path,
          changedResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, false);
        assert.equal(snapshotCheatcodesCheck.noBaseline, false);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 1);

        // Read-only: a changed value must not be written to the baseline.
        const after = await readJsonFile(cheatcodePath);
        assert.deepEqual(after, before);
      });

      it("should pass and not modify the baseline when cheatcodes are added", async () => {
        const initialResults = [
          createSuiteResult("MyContract", [
            createTestResultWithSnapshots([
              {
                name: "TestGroup",
                entries: [{ name: "entry-a", value: "42" }],
              },
            ]),
          ]),
        ];
        const withAddedResults = [
          createSuiteResult("MyContract", [
            createTestResultWithSnapshots([
              {
                name: "TestGroup",
                entries: [
                  { name: "entry-a", value: "42" },
                  { name: "entry-b", value: "100" },
                ],
              },
            ]),
          ]),
        ];

        await handleSnapshot(tmp.path, initialResults, true);

        const cheatcodePath = getSnapshotCheatcodesPath(
          tmp.path,
          "TestGroup.json",
        );
        const before = await readJsonFile(cheatcodePath);

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmp.path,
          withAddedResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        assert.equal(snapshotCheatcodesCheck.noBaseline, false);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 1);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 0);

        // Read-only: the added entry must not be written to the baseline.
        const after = await readJsonFile(cheatcodePath);
        assert.deepEqual(after, before);
      });

      it("should pass and not modify the baseline when cheatcodes are removed", async () => {
        const initialResults = [
          createSuiteResult("MyContract", [
            createTestResultWithSnapshots([
              {
                name: "TestGroup",
                entries: [
                  { name: "entry-a", value: "42" },
                  { name: "entry-b", value: "100" },
                ],
              },
            ]),
          ]),
        ];
        const withRemovedResults = [
          createSuiteResult("MyContract", [
            createTestResultWithSnapshots([
              {
                name: "TestGroup",
                entries: [{ name: "entry-a", value: "42" }],
              },
            ]),
          ]),
        ];

        await handleSnapshot(tmp.path, initialResults, true);

        const cheatcodePath = getSnapshotCheatcodesPath(
          tmp.path,
          "TestGroup.json",
        );
        const before = await readJsonFile(cheatcodePath);

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmp.path,
          withRemovedResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        assert.equal(snapshotCheatcodesCheck.noBaseline, false);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 1);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 0);

        // Read-only: the removed entry must remain in the baseline.
        const after = await readJsonFile(cheatcodePath);
        assert.deepEqual(after, before);
      });

      it("should not delete group files when a scoped run omits a group", async () => {
        // Reproduces the issue: a baseline with two groups, then a scoped run
        // (e.g. via --grep) that only exercises one of them.
        const initialResults = [
          createSuiteResult("GroupAContract", [
            createTestResultWithSnapshots([
              {
                name: "A",
                entries: [{ name: "a1", value: "42" }],
              },
            ]),
          ]),
          createSuiteResult("GroupBContract", [
            createTestResultWithSnapshots([
              {
                name: "B",
                entries: [{ name: "b1", value: "100" }],
              },
            ]),
          ]),
        ];

        await handleSnapshot(tmp.path, initialResults, true);

        const pathA = getSnapshotCheatcodesPath(tmp.path, "A.json");
        const pathB = getSnapshotCheatcodesPath(tmp.path, "B.json");
        const beforeA = await readJsonFile(pathA);
        const beforeB = await readJsonFile(pathB);

        // Only group A is produced this run; group B's tests weren't run.
        const scopedResults = [
          createSuiteResult("GroupAContract", [
            createTestResultWithSnapshots([
              {
                name: "A",
                entries: [{ name: "a1", value: "42" }],
              },
            ]),
          ]),
        ];

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmp.path,
          scopedResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        assert.equal(snapshotCheatcodesCheck.noBaseline, false);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 1);

        // The orphaned group file must NOT be deleted, and neither file changed.
        assert.equal(await exists(pathB), true);
        assert.deepEqual(await readJsonFile(pathA), beforeA);
        assert.deepEqual(await readJsonFile(pathB), beforeB);
      });
    });
  });

  describe("logSnapshotCheckResult", () => {
    let output: string[] = [];
    const logger = (...args: any[]) => output.push(args.join(""));
    const getLoggerOutput = (): string =>
      // Remove ANSI escape codes for color and formatting
      output.join("\n").replace(/\x1b\[[0-9;]*m/g, "");

    afterEach(() => {
      output = [];
    });

    it("should log failure message when function gas check fails", () => {
      const result = {
        functionGasSnapshotsCheck: {
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
                source: "test/source/path.sol",
              },
            ],
          },
          noBaseline: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check failed/);
      assert.match(text, /Function gas snapshots: 1 changed/);
      assert.match(text, /To update snapshots, run your tests with --snapshot/);
    });

    it("should log failure message when snapshot cheatcodes check fails", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
        },
        snapshotCheatcodesCheck: {
          passed: false,
          comparison: {
            added: [],
            removed: [],
            changed: [
              {
                group: "TestGroup",
                name: "test-entry",
                expected: 42,
                actual: 100,
                source: "test/source/path.sol",
              },
            ],
          },
          noBaseline: false,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check failed/);
      assert.match(text, /Snapshot cheatcodes: 1 changed/);
      assert.match(text, /To update snapshots, run your tests with --snapshot/);
    });

    it("should fail and log message when there's no function gas snapshot", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: false,
          comparison: {
            added: [],
            removed: [],
            changed: [],
          },
          noBaseline: true,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check failed/);
      assert.match(
        text,
        /Function gas snapshots: no snapshot found\. Run your tests with --snapshot to create one\./,
      );
    });

    it("should fail and log message when there are no stored snapshot cheatcodes", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
        },
        snapshotCheatcodesCheck: {
          passed: false,
          comparison: {
            added: [],
            removed: [],
            changed: [],
          },
          noBaseline: true,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check failed/);
      assert.match(
        text,
        /Snapshot cheatcodes: no snapshots found\. Run your tests with --snapshot to create one\./,
      );
    });

    it("should log check passed message when there are no changes", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: {
            added: [],
            removed: [],
            changed: [],
          },
          noBaseline: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
    });

    it("should log check passed with added functions", () => {
      const result = {
        functionGasSnapshotsCheck: {
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
          noBaseline: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Function gas snapshots: 1 added/);
      assert.match(
        text,
        /1 function\(s\) produced by this run are not in the snapshot:/,
      );
      assert.match(text, /\+ MyContract#testB \(gas: 20000\)/);
    });

    it("should log check passed with added snapshot cheatcodes", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: {
            added: [
              {
                group: "TestGroup",
                name: "test-entry",
                value: "42",
              },
            ],
            removed: [],
            changed: [],
          },
          noBaseline: false,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Snapshot cheatcodes: 1 added/);
      assert.match(
        text,
        /1 snapshot\(s\) produced by this run are not in the snapshot:/,
      );
      assert.match(text, /\+ TestGroup#test-entry: 42/);
    });

    it("should log check passed with removed functions", () => {
      const result = {
        functionGasSnapshotsCheck: {
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
          noBaseline: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Function gas snapshots: 1 removed/);
      assert.match(
        text,
        /1 stored function\(s\) were not produced by this run:/,
      );
      assert.match(text, /- MyContract#testB \(gas: 20000\)/);
    });

    it("should log check passed with removed snapshot cheatcodes", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          noBaseline: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: {
            added: [],
            removed: [
              {
                group: "TestGroup",
                name: "test-entry",
                value: "42",
              },
            ],
            changed: [],
          },
          noBaseline: false,
          renamedGroups: [],
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Snapshot cheatcodes: 1 removed/);
      assert.match(
        text,
        /1 stored snapshot\(s\) were not produced by this run:/,
      );
      assert.match(text, /- TestGroup#test-entry: 42/);
    });

    describe("full output", () => {
      describe("success cases", () => {
        it("no changes", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check passed`;

          assert.equal(text, expected);
        });

        it("function gas added", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: {
                added: [
                  {
                    contractNameOrFqn: "NewContract",
                    functionSig: "testA()",
                    gasUsage: { kind: "standard" as const, gas: 7500n },
                  },
                ],
                removed: [],
                changed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check passed

Function gas snapshots: 1 added

  1 function(s) produced by this run are not in the snapshot:
    + NewContract#testA() (gas: 7500)
`;

          assert.equal(text, expected);
        });

        it("function gas removed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: {
                added: [],
                removed: [
                  {
                    contractNameOrFqn: "OldContract",
                    functionSig: "testDeprecated()",
                    gasUsage: { kind: "standard" as const, gas: 3000n },
                  },
                ],
                changed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check passed

Function gas snapshots: 1 removed

  1 stored function(s) were not produced by this run:
    - OldContract#testDeprecated() (gas: 3000)
`;

          assert.equal(text, expected);
        });

        it("function gas added and removed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: {
                added: [
                  {
                    contractNameOrFqn: "ContractA",
                    functionSig: "testNew()",
                    gasUsage: { kind: "standard" as const, gas: 10000n },
                  },
                  {
                    contractNameOrFqn: "ContractB",
                    functionSig: "testFuzz(uint256)",
                    gasUsage: {
                      kind: "fuzz" as const,
                      runs: 256n,
                      meanGas: 15000n,
                      medianGas: 14500n,
                    },
                  },
                ],
                removed: [
                  {
                    contractNameOrFqn: "ContractA",
                    functionSig: "testOld()",
                    gasUsage: { kind: "standard" as const, gas: 8000n },
                  },
                ],
                changed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check passed

Function gas snapshots: 2 added, 1 removed

  2 function(s) produced by this run are not in the snapshot:
    + ContractA#testNew() (gas: 10000)
    + ContractB#testFuzz(uint256) (runs: 256, μ: 15000, ~: 14500)

  1 stored function(s) were not produced by this run:
    - ContractA#testOld() (gas: 8000)
`;

          assert.equal(text, expected);
        });

        it("cheatcodes added", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: {
                added: [],
                removed: [],
                changed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: {
                added: [
                  {
                    group: "TestGroup",
                    name: "test-entry",
                    value: "42",
                  },
                ],
                removed: [],
                changed: [],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check passed

Snapshot cheatcodes: 1 added

  1 snapshot(s) produced by this run are not in the snapshot:
    + TestGroup#test-entry: 42
`;

          assert.equal(text, expected);
        });

        it("cheatcodes removed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: {
                added: [],
                removed: [],
                changed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: {
                added: [],
                removed: [
                  {
                    group: "TestGroup",
                    name: "test-entry",
                    value: "42",
                  },
                ],
                changed: [],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check passed

Snapshot cheatcodes: 1 removed

  1 stored snapshot(s) were not produced by this run:
    - TestGroup#test-entry: 42
`;

          assert.equal(text, expected);
        });

        it("cheatcodes added and removed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: {
                added: [],
                removed: [],
                changed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: {
                added: [
                  {
                    group: "TestGroup",
                    name: "test-entry",
                    value: "42",
                  },
                ],
                removed: [
                  {
                    group: "TestGroup",
                    name: "removed-entry",
                    value: "100",
                  },
                  {
                    group: "AnotherGroup",
                    name: "old-entry",
                    value: "150",
                  },
                ],
                changed: [],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check passed

Snapshot cheatcodes: 1 added, 2 removed

  1 snapshot(s) produced by this run are not in the snapshot:
    + TestGroup#test-entry: 42

  2 stored snapshot(s) were not produced by this run:
    - AnotherGroup#old-entry: 150
    - TestGroup#removed-entry: 100
`;

          assert.equal(text, expected);
        });
      });

      describe("failure cases", () => {
        it("function gas no baseline", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: true,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: no snapshot found. Run your tests with --snapshot to create one.

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("cheatcodes no baseline", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: true,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Snapshot cheatcodes: no snapshots found. Run your tests with --snapshot to create one.

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("both function gas and cheatcodes no baseline", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: true,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: true,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: no snapshot found. Run your tests with --snapshot to create one.

Snapshot cheatcodes: no snapshots found. Run your tests with --snapshot to create one.

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("function gas changed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                changed: [
                  {
                    contractNameOrFqn: "MyContract",
                    functionSig: "testFunc()",
                    kind: "standard" as const,
                    expected: 5000,
                    actual: 6000,
                    source: "contracts/MyContract.sol",
                  },
                ],
                added: [],
                removed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: 1 changed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("cheatcodes changed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [
                  {
                    group: "TestGroup",
                    name: "test-entry",
                    expected: 42,
                    actual: 100,
                    source: "test/source/path.sol",
                  },
                ],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Snapshot cheatcodes: 1 changed

  TestGroup#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("both function gas and cheatcodes changed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [
                  {
                    contractNameOrFqn: "MyContract",
                    functionSig: "testFunc()",
                    kind: "standard" as const,
                    expected: 5000,
                    actual: 6000,
                    source: "contracts/MyContract.sol",
                  },
                ],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [
                  {
                    group: "TestGroup",
                    name: "test-entry",
                    expected: 42,
                    actual: 100,
                    source: "test/source/path.sol",
                  },
                ],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: 1 changed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

Snapshot cheatcodes: 1 changed

  TestGroup#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("function gas changed, added, and removed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                changed: [
                  {
                    contractNameOrFqn: "ContractA",
                    functionSig: "testStandard()",
                    kind: "standard" as const,
                    expected: 10000,
                    actual: 15000,
                    source: "contracts/ContractA.sol",
                  },
                  {
                    contractNameOrFqn: "ContractB",
                    functionSig: "testFuzz(uint256)",
                    kind: "fuzz" as const,
                    expected: 20000,
                    actual: 18000,
                    runs: 256,
                    source: "contracts/ContractB.sol",
                  },
                ],
                added: [
                  {
                    contractNameOrFqn: "ContractA",
                    functionSig: "testNew()",
                    gasUsage: { kind: "standard" as const, gas: 12000n },
                  },
                ],
                removed: [
                  {
                    contractNameOrFqn: "ContractA",
                    functionSig: "testOld()",
                    gasUsage: { kind: "standard" as const, gas: 9000n },
                  },
                ],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: 2 changed, 1 added, 1 removed

  ContractA#testStandard()
    (in contracts/ContractA.sol)
    Expected (gas): 10000
    Actual (gas):   15000 (+50.00%, Δ+5000)

  ContractB#testFuzz(uint256)
    (in contracts/ContractB.sol)
    Runs: 256
    Expected (~): 20000
    Actual (~):   18000 (-10.00%, Δ-2000)

  1 function(s) produced by this run are not in the snapshot:
    + ContractA#testNew() (gas: 12000)

  1 stored function(s) were not produced by this run:
    - ContractA#testOld() (gas: 9000)

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("cheatcodes changed, added, and removed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [
                  {
                    group: "GroupA",
                    name: "new-entry",
                    value: "256",
                  },
                ],
                removed: [
                  {
                    group: "GroupB",
                    name: "old-entry",
                    value: "128",
                  },
                ],
                changed: [
                  {
                    group: "GroupC",
                    name: "test-entry",
                    expected: 42,
                    actual: 100,
                    source: "test/source/path.sol",
                  },
                ],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Snapshot cheatcodes: 1 changed, 1 added, 1 removed

  GroupC#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

  1 snapshot(s) produced by this run are not in the snapshot:
    + GroupA#new-entry: 256

  1 stored snapshot(s) were not produced by this run:
    - GroupB#old-entry: 128

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("both function gas and cheatcodes changed, added, and removed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                added: [
                  {
                    contractNameOrFqn: "NewContract",
                    functionSig: "testA()",
                    gasUsage: { kind: "standard" as const, gas: 7500n },
                  },
                ],
                removed: [
                  {
                    contractNameOrFqn: "OldContract",
                    functionSig: "testDeprecated()",
                    gasUsage: { kind: "standard" as const, gas: 3000n },
                  },
                ],
                changed: [
                  {
                    contractNameOrFqn: "MyContract",
                    functionSig: "testFunc()",
                    kind: "standard" as const,
                    expected: 5000,
                    actual: 6000,
                    source: "contracts/MyContract.sol",
                  },
                ],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [
                  {
                    group: "GroupA",
                    name: "new-entry",
                    value: "256",
                  },
                ],
                removed: [
                  {
                    group: "GroupB",
                    name: "old-entry",
                    value: "128",
                  },
                ],
                changed: [
                  {
                    group: "GroupC",
                    name: "test-entry",
                    expected: 42,
                    actual: 100,
                    source: "test/source/path.sol",
                  },
                ],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: 1 changed, 1 added, 1 removed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

  1 function(s) produced by this run are not in the snapshot:
    + NewContract#testA() (gas: 7500)

  1 stored function(s) were not produced by this run:
    - OldContract#testDeprecated() (gas: 3000)

Snapshot cheatcodes: 1 changed, 1 added, 1 removed

  GroupC#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

  1 snapshot(s) produced by this run are not in the snapshot:
    + GroupA#new-entry: 256

  1 stored snapshot(s) were not produced by this run:
    - GroupB#old-entry: 128

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("function gas added and removed, cheatcodes changed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                added: [
                  {
                    contractNameOrFqn: "NewContract",
                    functionSig: "testA()",
                    gasUsage: { kind: "standard" as const, gas: 7500n },
                  },
                ],
                removed: [
                  {
                    contractNameOrFqn: "OldContract",
                    functionSig: "testDeprecated()",
                    gasUsage: { kind: "standard" as const, gas: 3000n },
                  },
                ],
                changed: [],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [
                  {
                    group: "GroupC",
                    name: "test-entry",
                    expected: 42,
                    actual: 100,
                    source: "test/source/path.sol",
                  },
                ],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: 1 added, 1 removed

  1 function(s) produced by this run are not in the snapshot:
    + NewContract#testA() (gas: 7500)

  1 stored function(s) were not produced by this run:
    - OldContract#testDeprecated() (gas: 3000)

Snapshot cheatcodes: 1 changed

  GroupC#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("cheatcodes added and removed, function gas changed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [
                  {
                    contractNameOrFqn: "MyContract",
                    functionSig: "testFunc()",
                    kind: "standard" as const,
                    expected: 5000,
                    actual: 6000,
                    source: "contracts/MyContract.sol",
                  },
                ],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [
                  {
                    group: "GroupA",
                    name: "new-entry",
                    value: "256",
                  },
                ],
                removed: [
                  {
                    group: "GroupB",
                    name: "old-entry",
                    value: "128",
                  },
                ],
                changed: [],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: 1 changed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

Snapshot cheatcodes: 1 added, 1 removed

  1 snapshot(s) produced by this run are not in the snapshot:
    + GroupA#new-entry: 256

  1 stored snapshot(s) were not produced by this run:
    - GroupB#old-entry: 128

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("function gas no baseline, cheatcodes changed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [],
              },
              noBaseline: true,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [
                  {
                    group: "GroupC",
                    name: "test-entry",
                    expected: 42,
                    actual: 100,
                    source: "test/source/path.sol",
                  },
                ],
              },
              noBaseline: false,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: no snapshot found. Run your tests with --snapshot to create one.

Snapshot cheatcodes: 1 changed

  GroupC#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("cheatcodes no baseline, function gas changed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [
                  {
                    contractNameOrFqn: "MyContract",
                    functionSig: "testFunc()",
                    kind: "standard" as const,
                    expected: 5000,
                    actual: 6000,
                    source: "contracts/MyContract.sol",
                  },
                ],
              },
              noBaseline: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [],
              },
              noBaseline: true,
              renamedGroups: [],
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `Snapshot check failed

Function gas snapshots: 1 changed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

Snapshot cheatcodes: no snapshots found. Run your tests with --snapshot to create one.

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });
      });
    });

    describe("filtered runs (--grep, --grep-exclude, or specific files)", () => {
      it("should not report added/removed function gas snapshots", () => {
        const result = {
          functionGasSnapshotsCheck: {
            passed: true,
            comparison: {
              added: [
                {
                  contractNameOrFqn: "NewContract",
                  functionSig: "testNew()",
                  gasUsage: { kind: "standard" as const, gas: 7500n },
                },
              ],
              removed: [
                {
                  contractNameOrFqn: "OldContract",
                  functionSig: "testOld()",
                  gasUsage: { kind: "standard" as const, gas: 3000n },
                },
              ],
              changed: [],
            },
            noBaseline: false,
          },
          snapshotCheatcodesCheck: {
            passed: true,
            comparison: { added: [], removed: [], changed: [] },
            noBaseline: false,
            renamedGroups: [],
          },
        };

        logSnapshotCheckResult(result, logger, true);

        const text = getLoggerOutput();
        // Nothing but the header: added/removed are suppressed on filtered runs.
        assert.equal(text, "Snapshot check passed");
      });

      it("should not report added/removed snapshot cheatcodes", () => {
        const result = {
          functionGasSnapshotsCheck: {
            passed: true,
            comparison: { added: [], removed: [], changed: [] },
            noBaseline: false,
          },
          snapshotCheatcodesCheck: {
            passed: true,
            comparison: {
              added: [{ group: "GroupA", name: "new-entry", value: "256" }],
              removed: [{ group: "GroupB", name: "old-entry", value: "128" }],
              changed: [],
            },
            noBaseline: false,
            renamedGroups: [],
          },
        };

        logSnapshotCheckResult(result, logger, true);

        const text = getLoggerOutput();
        assert.equal(text, "Snapshot check passed");
      });

      it("should still report changed values while hiding added/removed", () => {
        const result = {
          functionGasSnapshotsCheck: {
            passed: false,
            comparison: {
              added: [
                {
                  contractNameOrFqn: "NewContract",
                  functionSig: "testNew()",
                  gasUsage: { kind: "standard" as const, gas: 7500n },
                },
              ],
              removed: [
                {
                  contractNameOrFqn: "OldContract",
                  functionSig: "testOld()",
                  gasUsage: { kind: "standard" as const, gas: 3000n },
                },
              ],
              changed: [
                {
                  contractNameOrFqn: "MyContract",
                  functionSig: "testFunc()",
                  kind: "standard" as const,
                  expected: 5000,
                  actual: 6000,
                  source: "contracts/MyContract.sol",
                },
              ],
            },
            noBaseline: false,
          },
          snapshotCheatcodesCheck: {
            passed: true,
            comparison: { added: [], removed: [], changed: [] },
            noBaseline: false,
            renamedGroups: [],
          },
        };

        logSnapshotCheckResult(result, logger, true);

        const text = getLoggerOutput();
        const expected = `Snapshot check failed

Function gas snapshots: 1 changed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

To update snapshots, run your tests with --snapshot
`;

        assert.equal(text, expected);
      });
    });
  });
});
