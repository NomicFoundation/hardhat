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
    let output: string[] = [];
    const logger = (...args: any[]) => output.push(args.join(""));
    const getLoggerOutput = (): string =>
      // Remove ANSI escape codes for color and formatting
      output.join("\n").replace(/\x1b\[[0-9;]*m/g, "");

    afterEach(() => {
      output = [];
    });

    it("should log success message when function gas snapshots were written", () => {
      const result = { functionGasSnapshotsWritten: true };

      logSnapshotResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Function gas snapshots written successfully/);
    });

    it("should not log anything when function gas snapshots were not written", () => {
      const result = { functionGasSnapshotsWritten: false };

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

    describe("function gas snapshots", () => {
      it("should write function gas snapshots on first run (no existing file)", async () => {
        const suiteResults = [
          createSuiteResult("MyContract", [
            createStandardTestResult("testA", 10000n),
          ]),
        ];

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmpDir,
          suiteResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, true);
        assert.equal(functionGasSnapshotsCheck.written, true);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 0);
        const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
        const savedContent = await readUtf8File(snapshotPath);
        assert.equal(savedContent, "MyContract#testA (gas: 10000)");
      });

      it("should pass when function gas snapshots are unchanged", async () => {
        const suiteResults = [
          createSuiteResult("MyContract", [
            createStandardTestResult("testA", 10000n),
          ]),
        ];

        await handleSnapshot(tmpDir, suiteResults, true);

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmpDir,
          suiteResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, true);
        assert.equal(functionGasSnapshotsCheck.written, false);
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

        await handleSnapshot(tmpDir, initialResults, true);

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmpDir,
          changedResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, false);
        assert.equal(functionGasSnapshotsCheck.written, false);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 1);
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

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmpDir,
          withAddedResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, true);
        assert.equal(functionGasSnapshotsCheck.written, true);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 1);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 0);

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

        const { functionGasSnapshotsCheck } = await handleSnapshotCheck(
          tmpDir,
          withRemovedResults,
        );

        assert.equal(functionGasSnapshotsCheck.passed, true);
        assert.equal(functionGasSnapshotsCheck.written, true);
        assert.equal(functionGasSnapshotsCheck.comparison.added.length, 0);
        assert.equal(functionGasSnapshotsCheck.comparison.removed.length, 1);
        assert.equal(functionGasSnapshotsCheck.comparison.changed.length, 0);

        const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
        const savedContent = await readUtf8File(snapshotPath);
        assert.doesNotMatch(savedContent, /testB/);
      });
    });

    describe("snapshot cheatcodes", () => {
      it("should write snapshot cheatcodes on first run (no existing file)", async () => {
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
          tmpDir,
          suiteResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        assert.equal(snapshotCheatcodesCheck.written, true);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 0);

        const cheatcodePath = getSnapshotCheatcodesPath(
          tmpDir,
          "TestGroup.json",
        );
        const cheatcodeContent = await readJsonFile(cheatcodePath);
        assert.deepEqual(cheatcodeContent, { "test-entry": "42" });
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

        await handleSnapshot(tmpDir, suiteResults, true);

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmpDir,
          suiteResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        assert.equal(snapshotCheatcodesCheck.written, false);
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

        await handleSnapshot(tmpDir, initialResults, true);

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmpDir,
          changedResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, false);
        assert.equal(snapshotCheatcodesCheck.written, false);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 1);
      });

      it("should pass and update file when cheatcodes are added", async () => {
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

        await handleSnapshot(tmpDir, initialResults, true);

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmpDir,
          withAddedResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        assert.equal(snapshotCheatcodesCheck.written, true);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 1);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 0);

        const cheatcodePath = getSnapshotCheatcodesPath(
          tmpDir,
          "TestGroup.json",
        );
        const cheatcodeContent = await readJsonFile(cheatcodePath);
        assert.deepEqual(cheatcodeContent, {
          "entry-a": "42",
          "entry-b": "100",
        });
      });

      it("should pass and update file when cheatcodes are removed", async () => {
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

        await handleSnapshot(tmpDir, initialResults, true);

        const { snapshotCheatcodesCheck } = await handleSnapshotCheck(
          tmpDir,
          withRemovedResults,
        );

        assert.equal(snapshotCheatcodesCheck.passed, true);
        assert.equal(snapshotCheatcodesCheck.written, true);
        assert.equal(snapshotCheatcodesCheck.comparison.added.length, 0);
        assert.equal(snapshotCheatcodesCheck.comparison.removed.length, 1);
        assert.equal(snapshotCheatcodesCheck.comparison.changed.length, 0);

        const cheatcodePath = getSnapshotCheatcodesPath(
          tmpDir,
          "TestGroup.json",
        );
        const cheatcodeContent = await readJsonFile(cheatcodePath);
        assert.deepEqual(cheatcodeContent, { "entry-a": "42" });
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
          written: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          written: false,
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
          written: false,
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
          written: false,
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check failed/);
      assert.match(text, /Snapshot cheatcodes: 1 changed/);
      assert.match(text, /To update snapshots, run your tests with --snapshot/);
    });

    it("should log first-time write message when function gas snapshots written with no changes", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: {
            added: [],
            removed: [],
            changed: [],
          },
          written: true,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          written: false,
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Function gas snapshots:/);
      assert.match(
        text,
        /No existing snapshots found\. Function gas snapshots written successfully/,
      );
    });

    it("should log first-time write message when snapshot cheatcodes written with no changes", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          written: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: {
            added: [],
            removed: [],
            changed: [],
          },
          written: true,
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Snapshot cheatcodes:/);
      assert.match(
        text,
        /No existing snapshots found\. Snapshot cheatcodes written successfully/,
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
          written: false,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          written: false,
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
          written: true,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          written: false,
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Function gas snapshots: 1 added/);
      assert.match(text, /Added 1 function\(s\):/);
      assert.match(text, /\+ MyContract#testB \(gas: 20000\)/);
    });

    it("should log check passed with added snapshot cheatcodes", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          written: false,
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
          written: true,
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Snapshot cheatcodes: 1 added/);
      assert.match(text, /Added 1 snapshot\(s\):/);
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
          written: true,
        },
        snapshotCheatcodesCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          written: false,
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Function gas snapshots: 1 removed/);
      assert.match(text, /Removed 1 function\(s\):/);
      assert.match(text, /- MyContract#testB \(gas: 20000\)/);
    });

    it("should log check passed with removed snapshot cheatcodes", () => {
      const result = {
        functionGasSnapshotsCheck: {
          passed: true,
          comparison: { added: [], removed: [], changed: [] },
          written: false,
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
          written: true,
        },
      };

      logSnapshotCheckResult(result, logger);

      const text = getLoggerOutput();
      assert.match(text, /Snapshot check passed/);
      assert.match(text, /Snapshot cheatcodes: 1 removed/);
      assert.match(text, /Removed 1 snapshot\(s\):/);
      assert.match(text, /- TestGroup#test-entry: 42/);
    });

    describe("full output", () => {
      describe("success cases", () => {
        it("no changes", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check passed`;

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
              written: true,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check passed

Function gas snapshots: 1 added

  Added 1 function(s):
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
              written: true,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check passed

Function gas snapshots: 1 removed

  Removed 1 function(s):
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
              written: true,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check passed

Function gas snapshots: 2 added, 1 removed

  Added 2 function(s):
    + ContractA#testNew() (gas: 10000)
    + ContractB#testFuzz(uint256) (runs: 256, μ: 15000, ~: 14500)

  Removed 1 function(s):
    - ContractA#testOld() (gas: 8000)
`;

          assert.equal(text, expected);
        });

        it("function gas first-time write", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: true,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          // Note: "Function gas snapshots: " has a trailing space when there are no counts
          const expected = `
Snapshot check passed

Function gas snapshots: 

  No existing snapshots found. Function gas snapshots written successfully
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
              written: false,
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
              written: true,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check passed

Snapshot cheatcodes: 1 added

  Added 1 snapshot(s):
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
              written: false,
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
              written: true,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check passed

Snapshot cheatcodes: 1 removed

  Removed 1 snapshot(s):
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
              written: false,
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
              written: true,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check passed

Snapshot cheatcodes: 1 added, 2 removed

  Added 1 snapshot(s):
    + TestGroup#test-entry: 42

  Removed 2 snapshot(s):
    - AnotherGroup#old-entry: 150
    - TestGroup#removed-entry: 100
`;

          assert.equal(text, expected);
        });

        it("cheatcodes first-time write", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: true,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          // Note: "Snapshot cheatcodes: " has a trailing space when there are no counts
          const expected = `
Snapshot check passed

Snapshot cheatcodes: 

  No existing snapshots found. Snapshot cheatcodes written successfully
`;

          assert.equal(text, expected);
        });

        it("both function gas and cheatcodes first-time write", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: true,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: true,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          // Note: "Function gas snapshots: " has a trailing space when there are no counts
          const expected = `
Snapshot check passed

Function gas snapshots: 

  No existing snapshots found. Function gas snapshots written successfully

Snapshot cheatcodes: 

  No existing snapshots found. Snapshot cheatcodes written successfully
`;

          assert.equal(text, expected);
        });
      });

      describe("failure cases", () => {
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
              written: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

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
              written: false,
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
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

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
              written: false,
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
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

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
              written: false,
            },
            snapshotCheatcodesCheck: {
              passed: true,
              comparison: { added: [], removed: [], changed: [] },
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

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

  Added 1 function(s):
    + ContractA#testNew() (gas: 12000)

  Removed 1 function(s):
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
              written: false,
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
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

Snapshot cheatcodes: 1 changed, 1 added, 1 removed

  GroupC#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

  Added 1 snapshot(s):
    + GroupA#new-entry: 256

  Removed 1 snapshot(s):
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
              written: false,
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
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

Function gas snapshots: 1 changed, 1 added, 1 removed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

  Added 1 function(s):
    + NewContract#testA() (gas: 7500)

  Removed 1 function(s):
    - OldContract#testDeprecated() (gas: 3000)

Snapshot cheatcodes: 1 changed, 1 added, 1 removed

  GroupC#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

  Added 1 snapshot(s):
    + GroupA#new-entry: 256

  Removed 1 snapshot(s):
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
              written: true,
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
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

Function gas snapshots: 1 added, 1 removed

  Added 1 function(s):
    + NewContract#testA() (gas: 7500)

  Removed 1 function(s):
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
              written: false,
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
              written: true,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

Function gas snapshots: 1 changed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

Snapshot cheatcodes: 1 added, 1 removed

  Added 1 snapshot(s):
    + GroupA#new-entry: 256

  Removed 1 snapshot(s):
    - GroupB#old-entry: 128

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("function gas first-time write, cheatcodes changed", () => {
          const result = {
            functionGasSnapshotsCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [],
              },
              written: true,
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
              written: false,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

Function gas snapshots: 

  No existing snapshots found. Function gas snapshots written successfully

Snapshot cheatcodes: 1 changed

  GroupC#test-entry
    (in test/source/path.sol)
    Expected: 42
    Actual:   100 (+138.10%, Δ+58)

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });

        it("cheatcodes first-time write, function gas changed", () => {
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
              written: false,
            },
            snapshotCheatcodesCheck: {
              passed: false,
              comparison: {
                added: [],
                removed: [],
                changed: [],
              },
              written: true,
            },
          };

          logSnapshotCheckResult(result, logger);

          const text = getLoggerOutput();
          const expected = `
Snapshot check failed

Function gas snapshots: 1 changed

  MyContract#testFunc()
    (in contracts/MyContract.sol)
    Expected (gas): 5000
    Actual (gas):   6000 (+20.00%, Δ+1000)

Snapshot cheatcodes: 

  No existing snapshots found. Snapshot cheatcodes written successfully

To update snapshots, run your tests with --snapshot
`;

          assert.equal(text, expected);
        });
      });
    });
  });
});
