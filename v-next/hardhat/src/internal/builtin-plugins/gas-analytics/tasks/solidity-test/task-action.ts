import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import { handleSnapshot, handleSnapshotCheck } from "../../gas-snapshots.js";

interface GasAnalyticsTestActionArguments {
  snapshot: boolean;
  snapshotCheck: boolean;
}

const runSolidityTests: TaskOverrideActionFunction<
  GasAnalyticsTestActionArguments
> = async (args, hre, runSuper) => {
  const taskResult = await runSuper(args);
  const suiteResults: SuiteResult[] = taskResult.suiteResults;
  const testsPassed = process.exitCode !== 1;
  const rootPath = hre.config.paths.root;

  if (testsPassed) {
    if (args.snapshot) {
      await handleSnapshot(rootPath, suiteResults);
    } else if (args.snapshotCheck) {
      await handleSnapshotCheck(rootPath, suiteResults);
    }
  }

  return {
    ...taskResult,
    suiteResults,
  };
};

export default runSolidityTests;
