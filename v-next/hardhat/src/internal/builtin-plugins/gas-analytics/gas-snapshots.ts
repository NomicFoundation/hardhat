import type {
  FuzzTestKind,
  StandardTestKind,
  SuiteResult,
} from "@nomicfoundation/edr";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { readUtf8File, writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";
import { findDuplicates } from "@nomicfoundation/hardhat-utils/lang";

import { getFullyQualifiedName } from "../../../utils/contract-names.js";

const FUNCTION_GAS_SNAPSHOTS_FILE = ".gas-snapshot";

export interface FunctionGasSnapshot {
  contractNameOrFqn: string;
  functionName: string;
  gasUsage: StandardTestKind | FuzzTestKind;
}

export function extractFunctionGasSnapshots(
  suiteResults: SuiteResult[],
): FunctionGasSnapshot[] {
  const duplicateContractNames = findDuplicates(
    suiteResults.map(({ id }) => id.name),
  );

  const gasSnapshots: FunctionGasSnapshot[] = [];
  for (const { id: suiteId, testResults } of suiteResults) {
    for (const testResult of testResults) {
      if ("calls" in testResult.kind) {
        continue;
      }

      const contractNameOrFqn = duplicateContractNames.has(suiteId.name)
        ? getFullyQualifiedName(suiteId.source, suiteId.name)
        : suiteId.name;

      gasSnapshots.push({
        contractNameOrFqn,
        functionName: testResult.name,
        gasUsage: testResult.kind,
      });
    }
  }
  return gasSnapshots;
}

export async function writeGasFunctionSnapshots(
  basePath: string,
  gasSnapshots: FunctionGasSnapshot[],
): Promise<void> {
  const snapshotPath = path.join(basePath, FUNCTION_GAS_SNAPSHOTS_FILE);
  await writeUtf8File(
    snapshotPath,
    stringifyFunctionGasSnapshots(gasSnapshots),
  );
}

export async function readFunctionGasSnapshots(
  basePath: string,
): Promise<FunctionGasSnapshot[]> {
  const snapshotPath = path.join(basePath, FUNCTION_GAS_SNAPSHOTS_FILE);
  const stringifiedSnapshots = await readUtf8File(snapshotPath);
  return parseFunctionGasSnapshots(stringifiedSnapshots);
}

export function stringifyFunctionGasSnapshots(
  gasSnapshots: FunctionGasSnapshot[],
): string {
  const lines: string[] = [];
  for (const { contractNameOrFqn, functionName, gasUsage } of gasSnapshots) {
    const gasDetails =
      "consumedGas" in gasUsage
        ? `gas: ${gasUsage.consumedGas}`
        : `runs: ${gasUsage.runs}, μ: ${gasUsage.meanGas}, ~: ${gasUsage.medianGas}`;

    lines.push(`${contractNameOrFqn}:${functionName} (${gasDetails})`);
  }

  return lines.sort((a, b) => a.localeCompare(b)).join("\n");
}

export function parseFunctionGasSnapshots(
  stringifiedSnapshots: string,
): FunctionGasSnapshot[] {
  if (stringifiedSnapshots.trim() === "") {
    return [];
  }

  const lines = stringifiedSnapshots.split("\n");
  const gasSnapshots: FunctionGasSnapshot[] = [];

  const standardTestRegex = /^(.+):([^:]+) \(gas: (\d+)\)$/;
  const fuzzTestRegex = /^(.+):([^:]+) \(runs: (\d+), μ: (\d+), ~: (\d+)\)$/;

  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }

    const standardMatch = standardTestRegex.exec(line);
    if (standardMatch !== null) {
      const [, contractNameOrFqn, functionName, gasValue] = standardMatch;
      gasSnapshots.push({
        contractNameOrFqn,
        functionName,
        gasUsage: { consumedGas: BigInt(gasValue) },
      });
      continue;
    }

    const fuzzMatch = fuzzTestRegex.exec(line);
    if (fuzzMatch !== null) {
      const [, contractNameOrFqn, functionName, runs, meanGas, medianGas] =
        fuzzMatch;
      gasSnapshots.push({
        contractNameOrFqn,
        functionName,
        gasUsage: {
          runs: BigInt(runs),
          meanGas: BigInt(meanGas),
          medianGas: BigInt(medianGas),
        },
      });
      continue;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_GAS_SNAPSHOT_FORMAT,
      { line },
    );
  }

  return gasSnapshots;
}
