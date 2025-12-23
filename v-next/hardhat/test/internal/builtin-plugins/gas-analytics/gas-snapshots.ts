import type { FunctionGasSnapshot } from "../../../../src/internal/builtin-plugins/gas-analytics/gas-snapshots.js";
import type { SuiteResult, TestResult } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, before, describe, it } from "node:test";

import { TestStatus } from "@nomicfoundation/edr";
import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";
import {
  emptyDir,
  mkdtemp,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  extractFunctionGasSnapshots,
  parseFunctionGasSnapshots,
  stringifyFunctionGasSnapshots,
  writeFunctionGasSnapshots,
} from "../../../../src/internal/builtin-plugins/gas-analytics/gas-snapshots.js";
import { parseName } from "../../../../src/utils/contract-names.js";

describe("gas-snapshots", () => {
  describe("extractFunctionGasSnapshots", () => {
    it("should extract standard test gas snapshots", () => {
      const suiteResults: SuiteResult[] = [
        createSuiteResult("MyContract", [
          createStandardTestResult("testTransfer", 25000n),
          createStandardTestResult("testApprove", 30000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].contractNameOrFqn, "MyContract");
      assert.equal(snapshots[0].functionName, "testTransfer");
      assert.equal(snapshots[0].gasUsage.kind, "standard");
      if (snapshots[0].gasUsage.kind === "standard") {
        assert.equal(snapshots[0].gasUsage.gas, 25000n);
      }
      assert.equal(snapshots[1].contractNameOrFqn, "MyContract");
      assert.equal(snapshots[1].functionName, "testApprove");
      assert.equal(snapshots[1].gasUsage.kind, "standard");
      if (snapshots[1].gasUsage.kind === "standard") {
        assert.equal(snapshots[1].gasUsage.gas, 30000n);
      }
    });

    it("should extract fuzz test gas snapshots", () => {
      const suiteResults: SuiteResult[] = [
        createSuiteResult("FuzzContract", [
          createFuzzTestResult("testFuzzTransfer", 100n, 25000n, 24500n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].contractNameOrFqn, "FuzzContract");
      assert.equal(snapshots[0].functionName, "testFuzzTransfer");
      assert.equal(snapshots[0].gasUsage.kind, "fuzz");
      if (snapshots[0].gasUsage.kind === "fuzz") {
        assert.equal(snapshots[0].gasUsage.runs, 100n);
        assert.equal(snapshots[0].gasUsage.meanGas, 25000n);
        assert.equal(snapshots[0].gasUsage.medianGas, 24500n);
      }
    });

    it("should skip invariant tests with calls", () => {
      const suiteResults: SuiteResult[] = [
        createSuiteResult("InvariantContract", [
          createInvariantTestResult("invariantTest", 10n, 5n),
          createStandardTestResult("testStandard", 20000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].functionName, "testStandard");
    });

    it("should handle multiple suites", () => {
      const suiteResults: SuiteResult[] = [
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
      assert.equal(snapshots[0].functionName, "testA");
      assert.equal(snapshots[1].contractNameOrFqn, "ContractB");
      assert.equal(snapshots[1].functionName, "testB");
    });

    it("should handle empty suite results", () => {
      const suiteResults: SuiteResult[] = [];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 0);
    });

    it("should handle suite with no test results", () => {
      const suiteResults: SuiteResult[] = [
        createSuiteResult("EmptyContract", []),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 0);
    });

    it("should use simple contract name when given FQN with no duplicates", () => {
      const suiteResults: SuiteResult[] = [
        createSuiteResult("contracts/MyContract.sol:MyContract", [
          createStandardTestResult("testTransfer", 25000n),
        ]),
      ];

      const snapshots = extractFunctionGasSnapshots(suiteResults);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].contractNameOrFqn, "MyContract");
      assert.equal(snapshots[0].functionName, "testTransfer");
    });

    it("should use FQN when there are duplicate contract names", () => {
      const suiteResults: SuiteResult[] = [
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
      assert.equal(snapshots[0].functionName, "testTransfer");
      assert.equal(
        snapshots[1].contractNameOrFqn,
        "contracts/legacy/Token.sol:Token",
      );
      assert.equal(snapshots[1].functionName, "testLegacyTransfer");
    });

    it("should use FQN only for duplicates, simple name for unique contracts", () => {
      const suiteResults: SuiteResult[] = [
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

  describe("stringifyFunctionGasSnapshots", () => {
    it("should stringify standard test snapshots", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionName: "testTransfer",
          gasUsage: {
            kind: "standard",
            gas: 25000n,
          },
        },
        {
          contractNameOrFqn: "MyContract",
          functionName: "testApprove",
          gasUsage: {
            kind: "standard",
            gas: 30000n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `MyContract:testApprove (gas: 30000)
MyContract:testTransfer (gas: 25000)`;
      assert.equal(result, expected);
    });

    it("should stringify fuzz test snapshots", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "FuzzContract",
          functionName: "testFuzzTransfer",
          gasUsage: {
            kind: "fuzz",
            runs: 100n,
            meanGas: 25000n,
            medianGas: 24500n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `FuzzContract:testFuzzTransfer (runs: 100, μ: 25000, ~: 24500)`;
      assert.equal(result, expected);
    });

    it("should stringify mixed test types", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MixedContract",
          functionName: "testStandard",
          gasUsage: {
            kind: "standard",
            gas: 20000n,
          },
        },
        {
          contractNameOrFqn: "MixedContract",
          functionName: "testFuzz",
          gasUsage: {
            kind: "fuzz",
            runs: 50n,
            meanGas: 22000n,
            medianGas: 21500n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `MixedContract:testFuzz (runs: 50, μ: 22000, ~: 21500)
MixedContract:testStandard (gas: 20000)`;
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
          functionName: "testA",
          gasUsage: {
            kind: "standard",
            gas: 10000n,
          },
        },
        {
          contractNameOrFqn: "ContractB",
          functionName: "testB",
          gasUsage: {
            kind: "standard",
            gas: 15000n,
          },
        },
        {
          contractNameOrFqn: "ContractA",
          functionName: "testA2",
          gasUsage: {
            kind: "standard",
            gas: 12000n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `ContractA:testA (gas: 10000)
ContractA:testA2 (gas: 12000)
ContractB:testB (gas: 15000)`;
      assert.equal(result, expected);
    });

    it("should sort snapshots alphabetically", () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "ZContract",
          functionName: "testZ",
          gasUsage: {
            kind: "standard",
            gas: 30000n,
          },
        },
        {
          contractNameOrFqn: "AContract",
          functionName: "testB",
          gasUsage: {
            kind: "standard",
            gas: 10000n,
          },
        },
        {
          contractNameOrFqn: "AContract",
          functionName: "testA",
          gasUsage: {
            kind: "standard",
            gas: 20000n,
          },
        },
        {
          contractNameOrFqn: "MContract",
          functionName: "testM",
          gasUsage: {
            kind: "standard",
            gas: 15000n,
          },
        },
      ];

      const result = stringifyFunctionGasSnapshots(snapshots);

      const expected = `AContract:testA (gas: 20000)
AContract:testB (gas: 10000)
MContract:testM (gas: 15000)
ZContract:testZ (gas: 30000)`;
      assert.equal(result, expected);
    });
  });

  describe("parseFunctionGasSnapshots", () => {
    it("should parse standard test snapshots", () => {
      const stringified = "MyContract:testApprove (gas: 30000)";

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].contractNameOrFqn, "MyContract");
      assert.equal(snapshots[0].functionName, "testApprove");
      assert.equal(snapshots[0].gasUsage.kind, "standard");
      if (snapshots[0].gasUsage.kind === "standard") {
        assert.equal(snapshots[0].gasUsage.gas, 30000n);
      }
    });

    it("should parse fuzz test snapshots", () => {
      const stringified =
        "FuzzContract:testFuzzTransfer (runs: 100, μ: 25000, ~: 24500)";

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 1);
      assert.equal(snapshots[0].contractNameOrFqn, "FuzzContract");
      assert.equal(snapshots[0].functionName, "testFuzzTransfer");
      assert.equal(snapshots[0].gasUsage.kind, "fuzz");
      if (snapshots[0].gasUsage.kind === "fuzz") {
        assert.equal(snapshots[0].gasUsage.runs, 100n);
        assert.equal(snapshots[0].gasUsage.meanGas, 25000n);
        assert.equal(snapshots[0].gasUsage.medianGas, 24500n);
      }
    });

    it("should parse mixed test types", () => {
      const stringified = `MixedContract:testFuzz (runs: 50, μ: 22000, ~: 21500)
MixedContract:testStandard (gas: 20000)`;

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].contractNameOrFqn, "MixedContract");
      assert.equal(snapshots[0].functionName, "testFuzz");
      assert.equal(snapshots[0].gasUsage.kind, "fuzz");
      assert.equal(snapshots[1].contractNameOrFqn, "MixedContract");
      assert.equal(snapshots[1].functionName, "testStandard");
      assert.equal(snapshots[1].gasUsage.kind, "standard");
    });

    it("should parse snapshots with FQN contract names", () => {
      const stringified = `contracts/Token.sol:Token:testTransfer (gas: 25000)
contracts/legacy/Token.sol:Token:testLegacyTransfer (gas: 30000)`;

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].contractNameOrFqn, "contracts/Token.sol:Token");
      assert.equal(snapshots[0].functionName, "testTransfer");
      assert.equal(
        snapshots[1].contractNameOrFqn,
        "contracts/legacy/Token.sol:Token",
      );
      assert.equal(snapshots[1].functionName, "testLegacyTransfer");
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
      const stringified = `MyContract:testA (gas: 10000)

MyContract:testB (gas: 20000)`;

      const snapshots = parseFunctionGasSnapshots(stringified);

      assert.equal(snapshots.length, 2);
      assert.equal(snapshots[0].functionName, "testA");
      assert.equal(snapshots[1].functionName, "testB");
    });

    it("should throw on malformed line", () => {
      // Invariant tests are not supported in gas snapshots
      const stringified =
        "MyContract:invariantTest() (runs: 256, calls: 128000, reverts: 23933)";

      assertThrowsHardhatError(
        () => parseFunctionGasSnapshots(stringified),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_GAS_SNAPSHOT_FORMAT,
        { line: stringified },
      );
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
          functionName: "testApprove",
          gasUsage: {
            kind: "standard",
            gas: 30000n,
          },
        },
        {
          contractNameOrFqn: "MyContract",
          functionName: "testTransfer",
          gasUsage: {
            kind: "standard",
            gas: 25000n,
          },
        },
      ];

      await writeFunctionGasSnapshots(tmpDir, snapshots);

      const snapshotPath = path.join(tmpDir, ".gas-snapshot");
      const savedContent = await readUtf8File(snapshotPath);

      const expected = `MyContract:testApprove (gas: 30000)
MyContract:testTransfer (gas: 25000)`;
      assert.equal(savedContent, expected);
    });

    it("should overwrite existing snapshot file", async () => {
      const firstSnapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionName: "testA",
          gasUsage: {
            kind: "standard",
            gas: 10000n,
          },
        },
      ];
      const secondSnapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionName: "testB",
          gasUsage: {
            kind: "standard",
            gas: 20000n,
          },
        },
      ];

      await writeFunctionGasSnapshots(tmpDir, firstSnapshots);
      await writeFunctionGasSnapshots(tmpDir, secondSnapshots);

      const snapshotPath = path.join(tmpDir, ".gas-snapshot");
      const savedContent = await readUtf8File(snapshotPath);

      assert.equal(savedContent, "MyContract:testB (gas: 20000)");
    });

    it("should save empty snapshots", async () => {
      const emptySnapshots: FunctionGasSnapshot[] = [];

      await writeFunctionGasSnapshots(tmpDir, emptySnapshots);

      const snapshotPath = path.join(tmpDir, ".gas-snapshot");
      const savedContent = await readUtf8File(snapshotPath);

      assert.equal(savedContent, "");
    });

    it("should throw HardhatError on write failure", async () => {
      const snapshots: FunctionGasSnapshot[] = [
        {
          contractNameOrFqn: "MyContract",
          functionName: "testA",
          gasUsage: {
            kind: "standard",
            gas: 10000n,
          },
        },
      ];

      const invalidPath = "invalid\0path";
      const snapshotsPath = path.join(invalidPath, ".gas-snapshot");

      await assertRejectsWithHardhatError(
        () => writeFunctionGasSnapshots(invalidPath, snapshots),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.GAS_SNAPSHOT_WRITE_ERROR,
        {
          snapshotsPath,
          error:
            "The argument 'path' must be a string, Uint8Array, or URL without null bytes. Received 'invalid\\x00path'",
        },
      );
    });
  });
});

function createStandardTestResult(
  name: string,
  consumedGas: bigint,
): TestResult {
  return {
    name,
    status: TestStatus.Success,
    decodedLogs: [],
    durationNs: 0n,
    kind: {
      consumedGas,
    },
    stackTrace: () => null,
    callTraces: () => [],
  };
}

function createFuzzTestResult(
  name: string,
  runs: bigint,
  meanGas: bigint,
  medianGas: bigint,
): TestResult {
  return {
    name,
    status: TestStatus.Success,
    decodedLogs: [],
    durationNs: 0n,
    kind: {
      runs,
      meanGas,
      medianGas,
    },
    stackTrace: () => null,
    callTraces: () => [],
  };
}

function createInvariantTestResult(
  name: string,
  runs: bigint,
  calls: bigint,
): TestResult {
  return {
    name,
    status: TestStatus.Success,
    decodedLogs: [],
    durationNs: 0n,
    kind: {
      runs,
      calls,
      reverts: 0n,
      metrics: {},
      failedCorpusReplays: 0n,
    },
    stackTrace: () => null,
    callTraces: () => [],
  };
}

function createSuiteResult(
  contractNameOrFqn: string,
  testResults: TestResult[],
): SuiteResult {
  const { sourceName, contractName } = parseName(contractNameOrFqn);
  return {
    id: {
      name: contractName,
      source: sourceName ?? `${contractName}.sol`,
      solcVersion: "0.8.0",
    },
    durationNs: 0n,
    warnings: [],
    testResults,
  };
}
