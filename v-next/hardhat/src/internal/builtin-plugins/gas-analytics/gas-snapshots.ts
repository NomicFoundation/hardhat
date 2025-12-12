import type {
  FuzzTestKind,
  StandardTestKind,
  SuiteResult,
} from "@nomicfoundation/edr";

interface TestFunctionGasSnapshot {
  contractName: string;
  functionName: string;
  gasUsage: StandardTestKind | FuzzTestKind;
}

export function extractFunctionGasSnapshots(
  suiteResults: SuiteResult[],
): TestFunctionGasSnapshot[] {
  const gasSnapshots: TestFunctionGasSnapshot[] = [];
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
  gasSnapshots: TestFunctionGasSnapshot[],
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
