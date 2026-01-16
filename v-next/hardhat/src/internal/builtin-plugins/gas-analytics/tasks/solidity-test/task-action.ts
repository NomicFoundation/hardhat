import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { FunctionGasSnapshotCheckResult } from "../../function-gas-snapshots.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import chalk from "chalk";

import {
  checkFunctionGasSnapshots,
  extractFunctionGasSnapshots,
  logFunctionGasSnapshotsSection,
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
  functionGasSnapshotsCheck: FunctionGasSnapshotCheckResult;
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
    const snapshotCheckResult = await handleSnapshotCheck(
      rootPath,
      suiteResults,
    );
    logSnapshotCheckResult(snapshotCheckResult);
    snapshotCheckPassed = snapshotCheckResult.functionGasSnapshotsCheck.passed;
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
  const functionGasSnapshotsCheck = await checkFunctionGasSnapshots(
    basePath,
    suiteResults,
  );

  return {
    functionGasSnapshotsCheck,
  };
}

export function logSnapshotCheckResult(
  { functionGasSnapshotsCheck }: SnapshotCheckResult,
  logger: typeof console.log = console.log,
): void {
  logger();

  logger(
    functionGasSnapshotsCheck.passed
      ? chalk.green("Snapshot check passed")
      : chalk.red("Snapshot check failed"),
  );

  logFunctionGasSnapshotsSection(functionGasSnapshotsCheck, logger);

  if (!functionGasSnapshotsCheck.passed) {
    logger(chalk.yellow("To update snapshots, run your tests with --snapshot"));
    logger();
  }
}

export default runSolidityTests;
