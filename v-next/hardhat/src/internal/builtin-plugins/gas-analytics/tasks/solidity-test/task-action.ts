import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import {
  extractFunctionGasSnapshots,
  readFunctionGasSnapshots,
  writeGasFunctionSnapshots,
} from "../../gas-snapshots.js";

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

  if (testsPassed) {
    if (args.snapshot) {
      const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
      await writeGasFunctionSnapshots(
        hre.config.paths.root,
        functionGasSnapshots,
      );
    } else if (args.snapshotCheck) {
      const previousFunctionGasSnapshots = await readFunctionGasSnapshots(
        hre.config.paths.root,
      );

      console.log(previousFunctionGasSnapshots);
    }
  }

  return {
    ...taskResult,
    suiteResults,
  };
};

export default runSolidityTests;
