import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import {
  extractFunctionGasSnapshots,
  stringifyFunctionGasSnapshots,
  saveGasFunctionSnapshots,
} from "../../gas-snapshots.js";

interface GasAnalyticsTestActionArguments {
  snapshot: boolean;
}

const runSolidityTests: TaskOverrideActionFunction<
  GasAnalyticsTestActionArguments
> = async (args, hre, runSuper) => {
  const suiteResults: SuiteResult[] = await runSuper(args);

  if (args.snapshot && process.exitCode !== 1) {
    const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
    const stringifiedFunctionGasSnapshots =
      stringifyFunctionGasSnapshots(functionGasSnapshots);
    await saveGasFunctionSnapshots(
      hre.config.paths.root,
      stringifiedFunctionGasSnapshots,
    );
  }

  return suiteResults;
};

export default runSolidityTests;
