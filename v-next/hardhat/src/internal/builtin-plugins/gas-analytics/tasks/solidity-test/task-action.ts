import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { FunctionGasSnapshot } from "../../gas-snapshots.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import { FileNotFoundError } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import {
  compareFunctionGasSnapshots,
  extractFunctionGasSnapshots,
  printFunctionGasSnapshotChanges,
  readFunctionGasSnapshots,
  stringifyFunctionGasSnapshots,
  writeFunctionGasSnapshots,
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
      await writeFunctionGasSnapshots(rootPath, functionGasSnapshots);
      console.log();
      console.log(chalk.green("Gas snapshots written successfully"));
      console.log();
    } else if (args.snapshotCheck) {
      const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
      let previousFunctionGasSnapshots: FunctionGasSnapshot[];
      try {
        previousFunctionGasSnapshots = await readFunctionGasSnapshots(rootPath);

        const { added, removed, changed } = compareFunctionGasSnapshots(
          previousFunctionGasSnapshots,
          functionGasSnapshots,
        );

        if (changed.length > 0) {
          console.log();
          console.log(
            `${chalk.red("Gas snapshot check failed:")} ${chalk.grey(`${changed.length} function(s) changed`)}`,
          );
          console.log();

          printFunctionGasSnapshotChanges(changed);

          console.log(
            chalk.yellow("To update snapshots, run your tests with --snapshot"),
          );
          console.log();

          process.exitCode = 1;
        } else if (added.length > 0 || removed.length > 0) {
          // If there are no changed functions, but there are added/removed ones,
          // we update the snapshots
          await writeFunctionGasSnapshots(rootPath, functionGasSnapshots);

          console.log();
          console.log(chalk.green("Gas snapshot check passed"));
          console.log();

          if (added.length > 0) {
            console.log(chalk.grey(`Added ${added.length} function(s):`));
            const addedLines = stringifyFunctionGasSnapshots(added).split("\n");
            for (const line of addedLines) {
              console.log(chalk.green(`  + ${line}`));
            }
            console.log();
          }

          if (removed.length > 0) {
            console.log(chalk.grey(`Removed ${removed.length} function(s):`));
            const removedLines =
              stringifyFunctionGasSnapshots(removed).split("\n");
            for (const line of removedLines) {
              console.log(chalk.red(`  - ${line}`));
            }
            console.log();
          }
        } else {
          console.log();
          console.log(chalk.green("Gas snapshot check passed"));
          console.log();
        }
      } catch (error) {
        if (error instanceof FileNotFoundError) {
          await writeFunctionGasSnapshots(rootPath, functionGasSnapshots);
          console.log();
          console.log(chalk.green("Gas snapshots written successfully"));
          console.log();
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
