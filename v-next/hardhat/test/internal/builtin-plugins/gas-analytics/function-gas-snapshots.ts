import type {
  FunctionGasSnapshot,
  FunctionGasSnapshotChange,
  FuzzTestKindGasUsage,
  StandardTestKindGasUsage,
} from "../../../../src/internal/builtin-plugins/gas-analytics/function-gas-snapshots.js";

import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import {
  emptyDir,
  FileNotFoundError,
  mkdtemp,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  compareFunctionGasSnapshots,
  extractFunctionGasSnapshots,
  FUNCTION_GAS_SNAPSHOTS_FILE,
  getFunctionGasSnapshotsPath,
  hasGasUsageChanged,
  parseFunctionGasSnapshots,
  printFunctionGasSnapshotChanges,
  readFunctionGasSnapshots,
  stringifyFunctionGasSnapshots,
  writeFunctionGasSnapshots,
} from "../../../../src/internal/builtin-plugins/gas-analytics/function-gas-snapshots.js";

import {
  createFuzzTestResult,
  createInvariantTestResult,
  createStandardTestResult,
  createSuiteResult,
} from "./suite-result-helpers.js";

describe("function-gas-snapshots", () => {
  describe("extractFunctionGasSnapshots", () => {
    it("should extract standard test gas snapshots", () => {
      const suiteResults = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testTransfer", 25000n),
          createStandardTestResult("testApprove", 30000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].contractNameOrFqn, "MyContract");
      assert.equal(snapshots[0].functionSig, "testTransfer");
      assert.equal(snapshots[0].gasUsage.kind, "standard");
      if (snapshots[0].gasUsage.kind === "standard") {
        assert.equal(snapshots[0].gasUsage.gas, 25000n);
      }
      assert.equal(snapshots[1].contractNameOrFqn, "MyContract");
      assert.equal(snapshots[1].functionSig, "testApprove");
      assert.equal(snapshots[1].gasUsage.kind, "standard");
      if (snapshots[1].gasUsage.kind === "standard") {
        assert.equal(snapshots[1].gasUsage.gas, 30000n);
      }
    });

    it("should extract fuzz test gas snapshots", () => {
      const suiteResults = [
        createSuiteResult("FuzzContract", [
          createFuzzTestResult("testFuzzTransfer", 100n, 25000n, 24500n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].contractNameOrFqn, "FuzzContract");
      assert.equal(snapshots[0].functionSig, "testFuzzTransfer");
      assert.equal(snapshots[0].gasUsage.kind, "fuzz");
      if (snapshots[0].gasUsage.kind === "fuzz") {
        assert.equal(snapshots[0].gasUsage.runs, 100n);
        assert.equal(snapshots[0].gasUsage.meanGas, 25000n);
        assert.equal(snapshots[0].gasUsage.medianGas, 24500n);
      }
    });

    it("should skip invariant tests with calls", () => {
      const suiteResults = [
        createSuiteResult("InvariantContract", [
          createInvariantTestResult("invariantTest", 10n, 5n),
          createStandardTestResult("testStandard", 20000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].functionSig, "testStandard");
    });

    it("should handle multiple suites", () => {
      const suiteResults = [
        createSuiteResult("ContractA", [
          createStandardTestResult("testA", 10000n),
        ]),
        createSuiteResult("ContractB", [
          createStandardTestResult("testB", 20000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].contractNameOrFqn, "ContractA");
      assert.equal(snapshots[0].functionSig, "testA");
      assert.equal(snapshots[1].contractNameOrFqn, "ContractB");
      assert.equal(snapshots[1].functionSig, "testB");
    });

    it("should handle empty suite results", () => {
      const snapshots = extractFunctionGasSnapshots([]);

      assert.equal(snapshots.length, 0);
    });

    it("should handle suite with no test results", () => {
      const suiteResults = [createSuiteResult("EmptyContract", [])];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 0);
    });

    it("should use simple contract name when given FQN with no duplicates", () => {
      const suiteResults = [
        createSuiteResult("contracts/MyContract.sol:MyContract", [
          createStandardTestResult("testTransfer", 25000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].contractNameOrFqn, "MyContract");
      assert.equal(snapshots[0].functionSig, "testTransfer");
    });

    it("should use FQN when there are duplicate contract names", () => {
      const suiteResults = [
        createSuiteResult("contracts/Token.sol:Token", [
          createStandardTestResult("testTransfer", 25000n),
        ]),
        createSuiteResult("contracts/legacy/Token.sol:Token", [
          createStandardTestResult("testLegacyTransfer", 30000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].contractNameOrFqn, "contracts/Token.sol:Token");
      assert.equal(snapshots[0].functionSig, "testTransfer");
      assert.equal(
        snapshots[1].contractNameOrFqn,
        "contracts/legacy/Token.sol:Token",
      );
      assert.equal(snapshots[1].functionSig, "testLegacyTransfer");
    });

    it("should use FQN only for duplicates, simple name for unique contracts", () => {
      const suiteResults = [
        createSuiteResult("contracts/Token.sol:Token", [
          createStandardTestResult("testTransfer", 25000n),
        ]),
        createSuiteResult("contracts/legacy/Token.sol:Token", [
          createStandardTestResult("testLegacyTransfer", 30000n),
        ]),
        createSuiteResult("UniqueContract", [
          createStandardTestResult("testUnique", 15000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 3);
      assert.equal(snapshots[0].contractNameOrFqn, "contracts/Token.sol:Token");
      assert.equal(
        snapshots[1].contractNameOrFqn,
        "contracts/legacy/Token.sol:Token",
      );
      assert.equal(snapshots[2].contractNameOrFqn, "UniqueContract");
    });
  });

  describe("writeFunctionGasSnapshots", () => {
    let tmpDir: string;

    before(async () => {
      tmpDir = await mkdtemp("gas-snapshots-test-");
    });

    afterEach(async () => {
      await emptyDir(tmpDir);
    });

    it("should save snapshots to .gas-snapshot file", async () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testApprove",
          gasUsage: {
            kind: "standard",
            gas: 30000n,
          },
        },
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testTransfer",
          gasUsage: {
            kind: "standard",
            gas: 25000n,
          },
        },
      ];

      await writeFunctionGasSnapshots(tmpDir, snapshots);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);

      const expected = `MyContract#testApprove (gas: 30000)
MyContract#testTransfer (gas: 25000)`;
      assert.equal(savedContent, expected);
    });

    it("should overwrite existing snapshot file", async () => {
      const firstSnapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: {
            kind: "standard",
            gas: 10000n,
          },
        },
      ];
      const secondSnapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testB",
          gasUsage: {
            kind: "standard",
            gas: 20000n,
          },
        },
      ];

      await writeFunctionGasSnapshots(tmpDir, firstSnapshots);
      await writeFunctionGasSnapshots(tmpDir, secondSnapshots);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);

      assert.equal(savedContent, "MyContract#testB (gas: 20000)");
    });

    it("should save empty snapshots", async () => {
      const emptySnapshots: FunctionGasSnapshot[] = [];

      await writeFunctionGasSnapshots(tmpDir, emptySnapshots);

      const snapshotPath = getFunctionGasSnapshotsPath(tmpDir);
      const savedContent = await readUtf8File(snapshotPath);

      assert.equal(savedContent, "");
    });
  });

  describe("readFunctionGasSnapshots", () => {
    let tmpDir: string;

    before(async () => {
      tmpDir = await mkdtemp("gas-snapshots-test-");
    });

    afterEach(async () => {
      await emptyDir(tmpDir);
    });

    it("should read snapshots from file", async () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: {
            kind: "standard",
            gas: 10000n,
          },
        },
      ];

      await writeFunctionGasSnapshots(tmpDir, snapshots);
      const readSnapshots = await readFunctionGasSnapshots(tmpDir);

      assert.deepEqual(readSnapshots, snapshots);
    });

    it("should throw FileNotFoundError when file doesn't exist", async () => {
      try {
        // file does not exist
        await readFunctionGasSnapshots(tmpDir);
        assert.fail("Expected FileNotFoundError to be thrown");
      } catch (error) {
        assert.ok(
          error instanceof FileNotFoundError,
          "Error should be FileNotFoundError",
        );
      }
    });
  });

  describe("stringifyFunctionGasSnapshots", () => {
    it("should stringify standard test snapshots", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testTransfer",
          gasUsage: {
            kind: "standard",
            gas: 25000n,
          },
        },
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testApprove",
          gasUsage: {
            kind: "standard",
            gas: 30000n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `MyContract#testApprove (gas: 30000)
MyContract#testTransfer (gas: 25000)`;
      assert.equal(result, expected);
    });

    it("should stringify fuzz test snapshots", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "FuzzContract",
          functionSig: "testFuzzTransfer",
          gasUsage: {
            kind: "fuzz",
            runs: 100n,
            meanGas: 25000n,
            medianGas: 24500n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `FuzzContract#testFuzzTransfer (runs: 100, μ: 25000, ~: 24500)`;
      assert.equal(result, expected);
    });

    it("should stringify mixed test types", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MixedContract",
          functionSig: "testStandard",
          gasUsage: {
            kind: "standard",
            gas: 20000n,
          },
        },
        {
          contractNameOrFqn: "MixedContract",
          functionSig: "testFuzz",
          gasUsage: {
            kind: "fuzz",
            runs: 50n,
            meanGas: 22000n,
            medianGas: 21500n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `MixedContract#testFuzz (runs: 50, μ: 22000, ~: 21500)
MixedContract#testStandard (gas: 20000)`;
      assert.equal(result, expected);
    });

    it("should handle empty snapshots array", () => {
      const snapshots: FunctionGasSnapshot[] = [];

      const result = stringifyFunctionGasSnapshots(snapshots);

      assert.equal(result, "");
    });

    it("should handle snapshots from multiple contracts", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "ContractA",
          functionSig: "testA",
          gasUsage: {
            kind: "standard",
            gas: 10000n,
          },
        },
        {
          contractNameOrFqn: "ContractB",
          functionSig: "testB",
          gasUsage: {
            kind: "standard",
            gas: 15000n,
          },
        },
        {
          contractNameOrFqn: "ContractA",
          functionSig: "testA2",
          gasUsage: {
            kind: "standard",
            gas: 12000n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `ContractA#testA (gas: 10000)
ContractA#testA2 (gas: 12000)
ContractB#testB (gas: 15000)`;
      assert.equal(result, expected);
    });

    it("should sort snapshots alphabetically", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "ZContract",
          functionSig: "testZ",
          gasUsage: {
            kind: "standard",
            gas: 30000n,
          },
        },
        {
          contractNameOrFqn: "AContract",
          functionSig: "testB",
          gasUsage: {
            kind: "standard",
            gas: 10000n,
          },
        },
        {
          contractNameOrFqn: "AContract",
          functionSig: "testA",
          gasUsage: {
            kind: "standard",
            gas: 20000n,
          },
        },
        {
          contractNameOrFqn: "MContract",
          functionSig: "testM",
          gasUsage: {
            kind: "standard",
            gas: 15000n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `AContract#testA (gas: 20000)
AContract#testB (gas: 10000)
MContract#testM (gas: 15000)
ZContract#testZ (gas: 30000)`;
      assert.equal(result, expected);
    });
  });

  describe("parseFunctionGasSnapshots", () => {
    it("should parse standard test snapshots", () => {
      const stringified = "MyContract#testApprove (gas: 30000)";

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].contractNameOrFqn, "MyContract");
      assert.equal(snapshots[0].functionSig, "testApprove");
      assert.equal(snapshots[0].gasUsage.kind, "standard");
      if (snapshots[0].gasUsage.kind === "standard") {
        assert.equal(snapshots[0].gasUsage.gas, 30000n);
      }
    });

    it("should parse fuzz test snapshots", () => {
      const stringified =
        "FuzzContract#testFuzzTransfer (runs: 100, μ: 25000, ~: 24500)";

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].contractNameOrFqn, "FuzzContract");
      assert.equal(snapshots[0].functionSig, "testFuzzTransfer");
      assert.equal(snapshots[0].gasUsage.kind, "fuzz");
      if (snapshots[0].gasUsage.kind === "fuzz") {
        assert.equal(snapshots[0].gasUsage.runs, 100n);
        assert.equal(snapshots[0].gasUsage.meanGas, 25000n);
        assert.equal(snapshots[0].gasUsage.medianGas, 24500n);
      }
    });

    it("should parse mixed test types", () => {
      const stringified = `MixedContract#testFuzz (runs: 50, μ: 22000, ~: 21500)
MixedContract#testStandard (gas: 20000)`;

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].contractNameOrFqn, "MixedContract");
      assert.equal(snapshots[0].functionSig, "testFuzz");
      assert.equal(snapshots[0].gasUsage.kind, "fuzz");
      assert.equal(snapshots[1].contractNameOrFqn, "MixedContract");
      assert.equal(snapshots[1].functionSig, "testStandard");
      assert.equal(snapshots[1].gasUsage.kind, "standard");
    });

    it("should parse snapshots with FQN contract names", () => {
      const stringified = `contracts/Token.sol:Token#testTransfer (gas: 25000)
contracts/legacy/Token.sol:Token#testLegacyTransfer (gas: 30000)`;

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].contractNameOrFqn, "contracts/Token.sol:Token");
      assert.equal(snapshots[0].functionSig, "testTransfer");
      assert.equal(
        snapshots[1].contractNameOrFqn,
        "contracts/legacy/Token.sol:Token",
      );
      assert.equal(snapshots[1].functionSig, "testLegacyTransfer");
    });

    it("should handle empty string", () => {
      const snapshots = parseFunctionGasSnapshots("");

      assert.equal(snapshots.length, 0);
    });

    it("should handle string with only whitespace", () => {
      const snapshots = parseFunctionGasSnapshots("   \n  \n  ");

      assert.equal(snapshots.length, 0);
    });

    it("should skip empty lines", () => {
      const stringified = `MyContract#testA (gas: 10000)

MyContract#testB (gas: 20000)`;

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].functionSig, "testA");
      assert.equal(snapshots[1].functionSig, "testB");
    });

    it("should throw on malformed line", () => {
      // Invariant tests are not supported in gas snapshots
      const stringified =
        "MyContract#invariantTest() (runs: 256, calls: 128000, reverts: 23933)";

      assertThrowsHardhatError(
        () => parseFunctionGasSnapshots(stringified),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_SNAPSHOT_FORMAT,
        {
          file: FUNCTION_GAS_SNAPSHOTS_FILE,
          line: stringified,
          expectedFormat:
            "'ContractName:functionName (gas: value)' for standard tests or 'ContractName:functionName (runs: value, μ: value, ~: value)' for fuzz tests",
        },
      );
    });
  });

  describe("compareFunctionGasSnapshots", () => {
    it("should return empty comparison when both snapshots are empty", () => {
      const result = compareFunctionGasSnapshots([], []);

      assert.deepEqual(result, {
        added: [],
        removed: [],
        changed: [],
      });
    });

    it("should detect added snapshots", () => {
      const previous: FunctionGasSnapshot[] = [];
      const current: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 10000n },
        },
      ];

      const result = compareFunctionGasSnapshots(previous, current);

      assert.equal(result.added.length, 1);
      assert.equal(result.removed.length, 0);
      assert.equal(result.changed.length, 0);
      assert.deepEqual(result.added[0], current[0]);
    });

    it("should detect removed snapshots", () => {
      const previous: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 10000n },
        },
      ];
      const current: FunctionGasSnapshot[] = [];

      const result = compareFunctionGasSnapshots(previous, current);

      assert.equal(result.added.length, 0);
      assert.equal(result.removed.length, 1);
      assert.equal(result.changed.length, 0);
      assert.deepEqual(result.removed[0], previous[0]);
    });

    it("should detect changed standard test snapshots", () => {
      const previous: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 10000n },
        },
      ];
      const current: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 15000n },
        },
      ];

      const result = compareFunctionGasSnapshots(previous, current);

      assert.equal(result.added.length, 0);
      assert.equal(result.removed.length, 0);
      assert.equal(result.changed.length, 1);
      assert.equal(result.changed[0].contractNameOrFqn, "MyContract");
      assert.equal(result.changed[0].functionSig, "testA");
      assert.equal(result.changed[0].kind, "standard");
      assert.equal(result.changed[0].expected, 10000);
      assert.equal(result.changed[0].actual, 15000);
      assert.equal(result.changed[0].runs, undefined);
    });

    it("should detect changed fuzz test snapshots", () => {
      const previous: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "FuzzContract",
          functionSig: "testFuzz",
          gasUsage: {
            kind: "fuzz",
            runs: 100n,
            meanGas: 25000n,
            medianGas: 24500n,
          },
        },
      ];
      const current: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "FuzzContract",
          functionSig: "testFuzz",
          gasUsage: {
            kind: "fuzz",
            runs: 100n,
            meanGas: 26000n,
            medianGas: 25000n,
          },
        },
      ];

      const result = compareFunctionGasSnapshots(previous, current);

      assert.equal(result.added.length, 0);
      assert.equal(result.removed.length, 0);
      assert.equal(result.changed.length, 1);
      assert.equal(result.changed[0].contractNameOrFqn, "FuzzContract");
      assert.equal(result.changed[0].functionSig, "testFuzz");
      assert.equal(result.changed[0].kind, "fuzz");
      assert.equal(result.changed[0].expected, 24500);
      assert.equal(result.changed[0].actual, 25000);
      assert.equal(result.changed[0].runs, 100);
    });

    it("should treat kind change as addition + removal", () => {
      const previous: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 10000n },
        },
      ];
      const current: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: {
            kind: "fuzz",
            runs: 100n,
            meanGas: 25000n,
            medianGas: 24500n,
          },
        },
      ];

      const result = compareFunctionGasSnapshots(previous, current);

      assert.equal(result.added.length, 1);
      assert.equal(result.removed.length, 1);
      assert.equal(result.changed.length, 0);
      assert.deepEqual(result.added[0], current[0]);
      assert.deepEqual(result.removed[0], previous[0]);
    });

    it("should handle multiple changes", () => {
      const previous: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "ContractA",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 10000n },
        },
        {
          contractNameOrFqn: "ContractB",
          functionSig: "testB",
          gasUsage: { kind: "standard", gas: 20000n },
        },
        {
          contractNameOrFqn: "ContractC",
          functionSig: "testC",
          gasUsage: { kind: "standard", gas: 30000n },
        },
      ];
      const current: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "ContractA",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 15000n },
        },
        {
          contractNameOrFqn: "ContractB",
          functionSig: "testB",
          gasUsage: { kind: "standard", gas: 20000n },
        },
        {
          contractNameOrFqn: "ContractD",
          functionSig: "testD",
          gasUsage: { kind: "standard", gas: 40000n },
        },
      ];

      const result = compareFunctionGasSnapshots(previous, current);

      assert.equal(result.added.length, 1);
      assert.equal(result.removed.length, 1);
      assert.equal(result.changed.length, 1);
      assert.equal(result.added[0].contractNameOrFqn, "ContractD");
      assert.equal(result.removed[0].contractNameOrFqn, "ContractC");
      assert.equal(result.changed[0].contractNameOrFqn, "ContractA");
    });

    it("should handle unchanged snapshots", () => {
      const previous: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 10000n },
        },
      ];
      const current: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          gasUsage: { kind: "standard", gas: 10000n },
        },
      ];

      const result = compareFunctionGasSnapshots(previous, current);

      assert.equal(result.added.length, 0);
      assert.equal(result.removed.length, 0);
      assert.equal(result.changed.length, 0);
    });
  });

  describe("hasGasUsageChanged", () => {
    it("should return false for identical standard gas usage", () => {
      const previous: StandardTestKindGasUsage = {
        kind: "standard",
        gas: 10000n,
      };
      const current: StandardTestKindGasUsage = {
        kind: "standard",
        gas: 10000n,
      };

      assert.equal(hasGasUsageChanged(previous, current), false);
    });

    it("should return true for different standard gas usage", () => {
      const previous: StandardTestKindGasUsage = {
        kind: "standard",
        gas: 10000n,
      };
      const current: StandardTestKindGasUsage = {
        kind: "standard",
        gas: 15000n,
      };

      assert.equal(hasGasUsageChanged(previous, current), true);
    });

    it("should return false for identical fuzz gas usage", () => {
      const previous: FuzzTestKindGasUsage = {
        kind: "fuzz",
        runs: 100n,
        meanGas: 25000n,
        medianGas: 24500n,
      };
      const current: FuzzTestKindGasUsage = {
        kind: "fuzz",
        runs: 100n,
        meanGas: 25000n,
        medianGas: 24500n,
      };

      assert.equal(hasGasUsageChanged(previous, current), false);
    });

    it("should return true for different fuzz median gas", () => {
      const previous: FuzzTestKindGasUsage = {
        kind: "fuzz",
        runs: 100n,
        meanGas: 25000n,
        medianGas: 24500n,
      };
      const current: FuzzTestKindGasUsage = {
        kind: "fuzz",
        runs: 100n,
        meanGas: 25000n,
        medianGas: 25000n,
      };

      assert.equal(hasGasUsageChanged(previous, current), true);
    });

    it("should return false for fuzz tests with different mean gas but same median", () => {
      const previous: FuzzTestKindGasUsage = {
        kind: "fuzz",
        runs: 100n,
        meanGas: 25000n,
        medianGas: 24500n,
      };
      const current: FuzzTestKindGasUsage = {
        kind: "fuzz",
        runs: 100n,
        meanGas: 26000n,
        medianGas: 24500n,
      };

      assert.equal(hasGasUsageChanged(previous, current), false);
    });

    it("should return false for different kinds", () => {
      const previous: StandardTestKindGasUsage = {
        kind: "standard",
        gas: 10000n,
      };
      const current: FuzzTestKindGasUsage = {
        kind: "fuzz",
        runs: 100n,
        meanGas: 25000n,
        medianGas: 24500n,
      };

      assert.equal(hasGasUsageChanged(previous, current), false);
    });
  });

  describe("printFunctionGasSnapshotChanges", () => {
    let output: string[] = [];
    const logger = (...args: any[]) => output.push(args.join(""));
    const getLoggerOutput = (): string =>
      // Remove ANSI escape codes for color and formatting
      output.join("\n").replace(/\x1b\[[0-9;]*m/g, "");

    afterEach(() => {
      output = [];
    });

    it("should print gas increase", () => {
      const changes: FunctionGasSnapshotChange[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          kind: "standard",
          expected: 10000,
          actual: 15000,
        },
      ];

      printFunctionGasSnapshotChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /MyContract#testA/);
      assert.match(text, /Expected \(gas\): 10000/);
      assert.match(text, /Actual \(gas\):\s+15000/);
      assert.match(text, /\+50\.00%/);
      assert.match(text, /Δ\+5000/);
    });

    it("should print gas decrease", () => {
      const changes: FunctionGasSnapshotChange[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          kind: "standard",
          expected: 15000,
          actual: 10000,
        },
      ];

      printFunctionGasSnapshotChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /Expected \(gas\): 15000/);
      assert.match(text, /Actual \(gas\):\s+10000/);
      assert.match(text, /-33\.33%/);
      assert.match(text, /Δ-5000/);
    });

    it("should omit percentage when expected is 0", () => {
      const changes: FunctionGasSnapshotChange[] = [
        {
          contractNameOrFqn: "MyContract",
          functionSig: "testA",
          kind: "standard",
          expected: 0,
          actual: 5000,
        },
      ];

      printFunctionGasSnapshotChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /Expected \(gas\): 0/);
      assert.match(text, /Actual \(gas\):\s+5000/);
      assert.match(text, /Δ\+5000/);
      assert.doesNotMatch(text, /%/);
    });

    it("should print runs when there are fuzz test changes", () => {
      const changes: FunctionGasSnapshotChange[] = [
        {
          contractNameOrFqn: "FuzzContract",
          functionSig: "testFuzz",
          kind: "fuzz",
          expected: 24500,
          actual: 25000,
          runs: 100,
        },
      ];

      printFunctionGasSnapshotChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /FuzzContract#testFuzz/);
      assert.match(text, /Runs: 100/);
      assert.match(text, /Expected \(~\): 24500/);
      assert.match(text, /Actual \(~\):\s+25000/);
      assert.match(text, /\+2\.04%/);
      assert.match(text, /Δ\+500/);
    });

    it("should print multiple changes", () => {
      const changes: FunctionGasSnapshotChange[] = [
        {
          contractNameOrFqn: "ContractA",
          functionSig: "testA",
          kind: "standard",
          expected: 10000,
          actual: 15000,
        },
        {
          contractNameOrFqn: "ContractB",
          functionSig: "testB",
          kind: "fuzz",
          expected: 20000,
          actual: 18000,
          runs: 256,
        },
      ];

      printFunctionGasSnapshotChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /ContractA#testA/);
      assert.match(text, /ContractB#testB/);
      assert.match(text, /Runs: 256/);
    });

    it("should handle empty changes array", () => {
      const changes: FunctionGasSnapshotChange[] = [];

      printFunctionGasSnapshotChanges(changes, logger);

      const text = getLoggerOutput();
      assert.equal(text, "");
    });

    it("should handle FQN contract names", () => {
      const changes: FunctionGasSnapshotChange[] = [
        {
          contractNameOrFqn: "contracts/Token.sol:Token",
          functionSig: "testTransfer",
          kind: "standard",
          expected: 25000,
          actual: 30000,
        },
      ];

      printFunctionGasSnapshotChanges(changes, logger);

      const text = getLoggerOutput();
      assert.match(text, /contracts\/Token\.sol:Token#testTransfer/);
    });
  });
});
