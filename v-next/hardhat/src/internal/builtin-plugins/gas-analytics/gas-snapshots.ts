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
