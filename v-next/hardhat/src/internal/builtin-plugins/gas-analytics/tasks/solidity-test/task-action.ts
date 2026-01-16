import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { FunctionGasSnapshotComparison } from "../../function-gas-snapshots.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
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
import {
  extractSnapshotCheatcodes,
  writeSnapshotCheatcodes,
} from "../../snapshot-cheatcodes.js";

interface GasAnalyticsTestActionArguments {
  snapshot: boolean;
  snapshotCheck: boolean;
}

export interface SnapshotResult {
  functionGasSnapshotsWritten: boolean;
}

export interface SnapshotCheckResult {
  passed: boolean;
  comparison: FunctionGasSnapshotComparison;
  functionGasSnapshotsWritten: boolean;
}

const runSolidityTests: TaskOverrideActionFunction<
  GasAnalyticsTestActionArguments
> = async (args, hre, runSuper) => {
  const taskResult = await runSuper(args);
  const suiteResults: SuiteResult[] = taskResult.suiteResults;
  const testsPassed = process.exitCode !== 1;
  const rootPath = hre.config.paths.root;

  if (args.snapshot && args.snapshotCheck) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.MUTUALLY_EXCLUSIVE_SNAPSHOT_FLAGS,
    );
  }

  let snapshotCheckPassed = true;
  if (args.snapshot) {
    const snapshotResult = await handleSnapshot(
      rootPath,
      suiteResults,
      testsPassed,
    );
    logSnapshotResult(snapshotResult);
  } else if (testsPassed && args.snapshotCheck) {
    const checkResult = await handleSnapshotCheck(rootPath, suiteResults);
    logSnapshotCheckResult(checkResult);
    snapshotCheckPassed = checkResult.passed;
  }

  process.exitCode = testsPassed && snapshotCheckPassed ? 0 : 1;

  return {
    ...taskResult,
    suiteResults,
  };
};

export async function handleSnapshot(
  basePath: string,
  suiteResults: SuiteResult[],
  testsPassed: boolean,
): Promise<SnapshotResult> {
  if (testsPassed) {
    const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);
    await writeFunctionGasSnapshots(basePath, functionGasSnapshots);
  }

  const snapshotCheatcodes = extractSnapshotCheatcodes(suiteResults);
  await writeSnapshotCheatcodes(basePath, snapshotCheatcodes);

  return {
    functionGasSnapshotsWritten: testsPassed,
  };
}

export function logSnapshotResult(
  result: SnapshotResult,
  logger: typeof console.log = console.log,
): void {
  if (result.functionGasSnapshotsWritten) {
    logger();
    logger(chalk.green("Function gas snapshots written successfully"));
    logger();
  }
}

export async function handleSnapshotCheck(
  basePath: string,
  suiteResults: SuiteResult[],
): Promise<SnapshotCheckResult> {
  const functionGasSnapshots = extractFunctionGasSnapshots(suiteResults);

  let previousFunctionGasSnapshots;
  try {
    previousFunctionGasSnapshots = await readFunctionGasSnapshots(basePath);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      await writeFunctionGasSnapshots(basePath, functionGasSnapshots);

      return {
        passed: true,
        comparison: {
          added: [],
          removed: [],
          changed: [],
        },
        functionGasSnapshotsWritten: true,
      };
    }

    throw error;
  }

  const comparison = compareFunctionGasSnapshots(
    previousFunctionGasSnapshots,
    functionGasSnapshots,
  );

  // Update snapshots when functions are added or removed (but not changed)
  const hasAddedOrRemoved =
    comparison.added.length > 0 || comparison.removed.length > 0;
  if (comparison.changed.length === 0 && hasAddedOrRemoved) {
    await writeFunctionGasSnapshots(basePath, functionGasSnapshots);
  }

  return {
    passed: comparison.changed.length === 0,
    comparison,
    functionGasSnapshotsWritten: hasAddedOrRemoved,
  };
}

export function logSnapshotCheckResult(
  result: SnapshotCheckResult,
  logger: typeof console.log = console.log,
): void {
  logger();

  logger(
    result.passed
      ? chalk.green("Snapshot check passed")
      : chalk.red("Snapshot check failed"),
  );

  logFunctionGasSnapshotsSection(result, logger);

  if (!result.passed) {
    logger(chalk.yellow("To update snapshots, run your tests with --snapshot"));
    logger();
  }
}

export function logFunctionGasSnapshotsSection(
  result: SnapshotCheckResult,
  logger: typeof console.log = console.log,
): void {
  const { comparison, functionGasSnapshotsWritten } = result;
  const hasChanges = comparison.changed.length > 0;
  const hasAdded = comparison.added.length > 0;
  const hasRemoved = comparison.removed.length > 0;
  const hasAnyDifferences = hasChanges || hasAdded || hasRemoved;
  const isFirstTimeWrite = functionGasSnapshotsWritten && !hasAnyDifferences;

  // Nothing to report
  if (!isFirstTimeWrite && !hasAnyDifferences) {
    return;
  }

  logger();
  logger(formatSectionHeader("Function gas snapshots", comparison));

  if (isFirstTimeWrite) {
    logger();
    logger(
      chalk.green(
        "  No existing snapshots found. Function gas snapshots written successfully",
      ),
    );
    logger();
    return;
  }

  if (hasChanges) {
    logger();
    printFunctionGasSnapshotChanges(comparison.changed, logger);
  }

  if (hasAdded) {
    logger();
    logger(chalk.grey(`  Added ${comparison.added.length} function(s):`));
    const addedLines = stringifyFunctionGasSnapshots(comparison.added).split(
      "\n",
    );
    for (const line of addedLines) {
      logger(chalk.green(`    + ${line}`));
    }
  }

  if (hasRemoved) {
    logger();
    logger(chalk.grey(`  Removed ${comparison.removed.length} function(s):`));
    const removedLines = stringifyFunctionGasSnapshots(
      comparison.removed,
    ).split("\n");
    for (const line of removedLines) {
      logger(chalk.red(`    - ${line}`));
    }
  }

  logger();
}

function formatSectionHeader(
  sectionName: string,
  { changed, added, removed }: FunctionGasSnapshotComparison,
): string {
  const parts: string[] = [];

  if (changed.length > 0) {
    parts.push(`${changed.length} changed`);
  }
  if (added.length > 0) {
    parts.push(`${added.length} added`);
  }
  if (removed.length > 0) {
    parts.push(`${removed.length} removed`);
  }

  return `${sectionName}: ${parts.join(", ")}`;
}

export default runSolidityTests;
