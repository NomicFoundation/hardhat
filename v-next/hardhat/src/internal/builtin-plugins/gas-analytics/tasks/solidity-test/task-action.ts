import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { FunctionGasSnapshot } from "../../function-gas-snapshots.js";
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
} from "../../function-gas-snapshots.js";

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

export async function handleSnapshot(
  basePath: string,
  suiteResults: SuiteResult[],
): Promise<void> {
  const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
  await writeFunctionGasSnapshots(basePath, functionGasSnapshots);

  console.log();
  console.log(chalk.green("Gas snapshots written successfully"));
  console.log();
}

export async function handleSnapshotCheck(
  basePath: string,
  suiteResults: SuiteResult[],
): Promise<void> {
  const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);

  let previousFunctionGasSnapshots: FunctionGasSnapshot[];
  try {
    previousFunctionGasSnapshots = await readFunctionGasSnapshots(basePath);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return handleSnapshot(basePath, suiteResults);
    }

    throw error;
  }

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
    process.exitCode = 1;

    console.log(
      chalk.yellow("To update snapshots, run your tests with --snapshot"),
    );
    console.log();
  } else if (added.length > 0 || removed.length > 0) {
    // Update snapshots when functions are added or removed (but not changed)
    await writeFunctionGasSnapshots(basePath, functionGasSnapshots);

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
      const removedLines = stringifyFunctionGasSnapshots(removed).split("\n");
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
}

export default runSolidityTests;
