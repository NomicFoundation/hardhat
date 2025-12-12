import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import {
  extractFunctionGasSnapshots,
  stringifyFunctionGasSnapshots,
} from "../../gas-snapshots.js";

interface GasAnalyticsTestActionArguments {
  snapshot: boolean;
}

const runSolidityTests: TaskOverrideActionFunction<
  GasAnalyticsTestActionArguments
> = async (args, _hre, runSuper) => {
  const taskResult = await runSuper(args);
  const suiteResults: SuiteResult[] = taskResult.suiteResults;

  if (args.snapshot && process.exitCode !== 1) {
    const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
    const stringifiedFunctionGasSnapshots =
      stringifyFunctionGasSnapshots(functionGasSnapshots);

    console.log(stringifiedFunctionGasSnapshots);
  }

  return {
    ...taskResult,
    suiteResults,
  };
};

export default runSolidityTests;
