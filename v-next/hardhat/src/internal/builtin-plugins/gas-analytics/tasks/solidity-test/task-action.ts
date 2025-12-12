import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { SuiteResult } from "@nomicfoundation/edr";

interface GasAnalyticsTestActionArguments {
  snapshot: boolean;
}

const runSolidityTests: TaskOverrideActionFunction<
  GasAnalyticsTestActionArguments
> = async (args, _hre, runSuper) => {
  const suiteResults: SuiteResult[] = await runSuper(args);

  if (args.snapshot) {
    const gasSnapshots = [];
    for (const { id: suiteId, testResults } of suiteResults) {
      for (const testResult of testResults) {
        if ("calls" in testResult.kind) {
          continue;
        }

        gasSnapshots.push({
          contractName: suiteId.name,
          testName: testResult.name,
          gas: testResult.kind,
        });
      }
    }
  }

  return suiteResults;
};

export default runSolidityTests;
