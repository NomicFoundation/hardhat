import type {
  SuiteResult,
  TestResult,
  ValueSnapshotGroup,
} from "@nomicfoundation/edr";

import { TestStatus } from "@nomicfoundation/edr";

import { parseName } from "../../../../src/utils/contract-names.js";

export function createStandardTestResult(
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

export function createFuzzTestResult(
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

export function createInvariantTestResult(
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

export function createTestResultWithSnapshots(
  valueSnapshotGroups?: ValueSnapshotGroup[],
): TestResult {
  return {
    name: "testWithSnapshotCheatcodes",
    status: TestStatus.Success,
    decodedLogs: [],
    durationNs: 0n,
    // Use invariant test kind since it's not tracked by function gas snapshots,
    // so this helper won't interfere if used alongside standard test results.
    kind: {
      runs: 1n,
      calls: 1n,
      reverts: 0n,
      metrics: {},
      failedCorpusReplays: 0n,
    },
    stackTrace: () => null,
    callTraces: () => [],
    valueSnapshotGroups,
  };
}

export function createSuiteResult(
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
