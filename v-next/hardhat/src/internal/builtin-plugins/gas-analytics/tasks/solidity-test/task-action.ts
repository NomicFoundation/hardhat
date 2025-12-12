import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { SuiteResult } from "@nomicfoundation/edr";

interface GasAnalyticsTestActionArguments {
  snapshot: boolean;
}

const runSolidityTests: TaskOverrideActionFunction<
  GasAnalyticsTestActionArguments
> = async (args, _hre, runSuper) => {
  const taskResult = await runSuper(args);
  const suiteResults: SuiteResult[] = taskResult.suiteResults;

  if (args.snapshot && process.exitCode !== 1) {
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

    console.log(gasSnapshots);
  }

  return {
    ...taskResult,
    suiteResults,
  };
};

export default runSolidityTests;
