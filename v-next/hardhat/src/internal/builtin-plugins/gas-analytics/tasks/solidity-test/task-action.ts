import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { FunctionGasSnapshot } from "../../gas-snapshots.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import { FileNotFoundError } from "@nomicfoundation/hardhat-utils/fs";

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
  const rootPath = hre.config.paths.root;

  if (testsPassed) {
    if (args.snapshot) {
      const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
      await writeGasFunctionSnapshots(rootPath, functionGasSnapshots);
    } else if (args.snapshotCheck) {
      const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
      let previousFunctionGasSnapshots: FunctionGasSnapshot[];
      try {
        previousFunctionGasSnapshots = await readFunctionGasSnapshots(rootPath);

        console.log({ functionGasSnapshots, previousFunctionGasSnapshots });
      } catch (error) {
        if (error instanceof FileNotFoundError) {
          await writeGasFunctionSnapshots(rootPath, functionGasSnapshots);
        } else {
          throw error;
        }
      }
    }
  }

  return {
    ...taskResult,
    suiteResults,
  };
};

export default runSolidityTests;
