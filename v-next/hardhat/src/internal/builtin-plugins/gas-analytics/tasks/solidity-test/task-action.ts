import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import {
  extractFunctionGasSnapshots,
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

  if (args.snapshot && process.exitCode !== 1) {
    const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
    await writeGasFunctionSnapshots(
      hre.config.paths.root,
      functionGasSnapshots,
    );
  }

  return {
    ...taskResult,
    suiteResults,
  };
};

export default runSolidityTests;
