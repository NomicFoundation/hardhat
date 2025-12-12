import type {
  FuzzTestKind,
  StandardTestKind,
  SuiteResult,
} from "@nomicfoundation/edr";

import path from "node:path";

import { writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";

const FUNCTION_GAS_SNAPSHOTS_FILE = ".gas-snapshot";

interface FunctionGasSnapshot {
  contractName: string;
  functionName: string;
  gasUsage: StandardTestKind | FuzzTestKind;
}

export function extractFunctionGasSnapshots(
  suiteResults: SuiteResult[],
): FunctionGasSnapshot[] {
  const gasSnapshots: FunctionGasSnapshot[] = [];
  for (const { id: suiteId, testResults } of suiteResults) {
    for (const testResult of testResults) {
      if ("calls" in testResult.kind) {
        continue;
      }

      gasSnapshots.push({
        contractName: suiteId.name,
        functionName: testResult.name,
        gasUsage: testResult.kind,
      });
    }
  }
  return gasSnapshots;
}

export function stringifyFunctionGasSnapshots(
  gasSnapshots: FunctionGasSnapshot[],
): string {
  const lines: string[] = [];
  for (const { contractName, functionName, gasUsage } of gasSnapshots) {
    const gasDetails =
      "consumedGas" in gasUsage
        ? `gas: ${gasUsage.consumedGas}`
        : `runs: ${gasUsage.runs}, μ: ${gasUsage.meanGas}, ~: ${gasUsage.medianGas}`;

    lines.push(`${contractName}:${functionName} (${gasDetails})`);
  }
  return lines.join("\n");
}

export async function saveGasFunctionSnapshots(
  basePath: string,
  stringifiedFunctionGasSnapshots: string,
): Promise<void> {
  const snapshotPath = path.join(basePath, FUNCTION_GAS_SNAPSHOTS_FILE);
  await writeUtf8File(snapshotPath, stringifiedFunctionGasSnapshots);
}
