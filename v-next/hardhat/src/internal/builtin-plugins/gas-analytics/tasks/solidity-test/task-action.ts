import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { FunctionGasSnapshotCheckResult } from "../../function-gas-snapshots.js";
import type { SnapshotCheatcodesCheckResult } from "../../snapshot-cheatcodes.js";
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
  checkSnapshotCheatcodes,
  extractSnapshotCheatcodes,
  logSnapshotCheatcodesSection,
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
  snapshotCheatcodesCheck: SnapshotCheatcodesCheckResult;
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
    snapshotCheckPassed =
      snapshotCheckResult.functionGasSnapshotsCheck.passed &&
      snapshotCheckResult.snapshotCheatcodesCheck.passed;
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
  const snapshotCheatcodesCheck = await checkSnapshotCheatcodes(
    basePath,
    suiteResults,
  );

  return {
    functionGasSnapshotsCheck,
    snapshotCheatcodesCheck,
  };
}

export function logSnapshotCheckResult(
  { functionGasSnapshotsCheck, snapshotCheatcodesCheck }: SnapshotCheckResult,
  logger: typeof console.log = console.log,
): void {
  logger();

  logger(
    functionGasSnapshotsCheck.passed && snapshotCheatcodesCheck.passed
      ? chalk.green("Snapshot check passed")
      : chalk.red("Snapshot check failed"),
  );

  const functionGasHasOutput =
    functionGasSnapshotsCheck.written ||
    functionGasSnapshotsCheck.comparison.changed.length > 0 ||
    functionGasSnapshotsCheck.comparison.added.length > 0 ||
    functionGasSnapshotsCheck.comparison.removed.length > 0;
  const snapshotCheatcodesHasOutput =
    snapshotCheatcodesCheck.written ||
    snapshotCheatcodesCheck.comparison.changed.length > 0 ||
    snapshotCheatcodesCheck.comparison.added.length > 0 ||
    snapshotCheatcodesCheck.comparison.removed.length > 0;

  // Add an extra newline if function gas snapshots have output
  if (functionGasHasOutput) {
    logger();
  }

  logFunctionGasSnapshotsSection(functionGasSnapshotsCheck, logger);

  // Add an extra newline if only snapshot cheatcodes have output
  // (logFunctionGasSnapshotsSection adds one if it has output)
  if (!functionGasHasOutput && snapshotCheatcodesHasOutput) {
    logger();
  }

  logSnapshotCheatcodesSection(snapshotCheatcodesCheck, logger);

  if (!functionGasSnapshotsCheck.passed || !snapshotCheatcodesCheck.passed) {
    logger(chalk.yellow("To update snapshots, run your tests with --snapshot"));
    logger();
  }
}

export default runSolidityTests;
