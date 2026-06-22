import type { TaskOverrideActionFunction } from "../../../../../types/tasks.js";
import type { Result } from "../../../../../types/utils.js";
import type { SolidityTestRunResult } from "../../../solidity-test/task-action.js";
import type { FunctionGasSnapshotCheckResult } from "../../function-gas-snapshots.js";
import type {
  SnapshotCheatcodesCheckResult,
  RenamedSnapshotGroup,
} from "../../snapshot-cheatcodes.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import { styleText } from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { errorResult } from "../../../../../utils/result.js";
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
  logSnapshotRenameWarnings,
  sanitizeSnapshotCheatcodes,
  writeSnapshotCheatcodes,
} from "../../snapshot-cheatcodes.js";

interface GasAnalyticsTestActionArguments {
  snapshot: boolean;
  snapshotCheck: boolean;
  // Forwarded from the base `test solidity` task; used to detect scoped runs.
  grep?: string;
  testFiles?: string[];
}

export interface SnapshotResult {
  functionGasSnapshotsWritten: boolean;
  renamedGroups: RenamedSnapshotGroup[];
}

export interface SnapshotCheckResult {
  functionGasSnapshotsCheck: FunctionGasSnapshotCheckResult;
  snapshotCheatcodesCheck: SnapshotCheatcodesCheckResult;
}

const runSolidityTests: TaskOverrideActionFunction<
  GasAnalyticsTestActionArguments
> = async (args, hre, runSuper) => {
  const superResult: Result<SolidityTestRunResult, SolidityTestRunResult> =
    await runSuper(args);
  const testsPassed = superResult.success;
  const solidityTestRunResult = testsPassed
    ? superResult.value
    : superResult.error;
  const suiteResults = solidityTestRunResult.suiteResults;
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
    // On a scoped run, added/missing snapshots are expected, so don't report
    // them (they'd be noise from the filter, not real differences).
    const isFiltered =
      args.grep !== undefined || (args.testFiles?.length ?? 0) > 0;
    logSnapshotCheckResult(snapshotCheckResult, console.log, isFiltered);
    snapshotCheckPassed =
      snapshotCheckResult.functionGasSnapshotsCheck.passed &&
      snapshotCheckResult.snapshotCheatcodesCheck.passed;
  }

  if (!snapshotCheckPassed) {
    return errorResult(solidityTestRunResult);
  }

  return superResult;
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

  const { snapshotCheatcodes, renamedGroups } = sanitizeSnapshotCheatcodes(
    extractSnapshotCheatcodes(suiteResults),
  );
  await writeSnapshotCheatcodes(basePath, snapshotCheatcodes);

  return {
    functionGasSnapshotsWritten: testsPassed,
    renamedGroups,
  };
}

export function logSnapshotResult(
  result: SnapshotResult,
  logger: typeof console.log = console.log,
): void {
  if (result.functionGasSnapshotsWritten) {
    logger(styleText("green", "Function gas snapshots written successfully"));
    logger();
  }
  logSnapshotRenameWarnings(result.renamedGroups, logger);
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
  isFiltered = false,
): void {
  logger(
    functionGasSnapshotsCheck.passed && snapshotCheatcodesCheck.passed
      ? styleText("green", "Snapshot check passed")
      : styleText("red", "Snapshot check failed"),
  );

  // On a filtered run, added/removed aren't reported, so they don't count
  // towards a section having output (which drives the spacing below).
  const showAddedRemoved = !isFiltered;
  const functionGasHasOutput =
    functionGasSnapshotsCheck.noBaseline ||
    functionGasSnapshotsCheck.comparison.changed.length > 0 ||
    (showAddedRemoved &&
      (functionGasSnapshotsCheck.comparison.added.length > 0 ||
        functionGasSnapshotsCheck.comparison.removed.length > 0));
  const snapshotCheatcodesHasOutput =
    snapshotCheatcodesCheck.noBaseline ||
    snapshotCheatcodesCheck.comparison.changed.length > 0 ||
    (showAddedRemoved &&
      (snapshotCheatcodesCheck.comparison.added.length > 0 ||
        snapshotCheatcodesCheck.comparison.removed.length > 0));

  // Add an extra newline if function gas snapshots have output
  if (functionGasHasOutput) {
    logger();
  }

  logFunctionGasSnapshotsSection(functionGasSnapshotsCheck, logger, isFiltered);

  // Add an extra newline if only snapshot cheatcodes have output
  // (logFunctionGasSnapshotsSection adds one if it has output)
  if (!functionGasHasOutput && snapshotCheatcodesHasOutput) {
    logger();
  }

  logSnapshotCheatcodesSection(snapshotCheatcodesCheck, logger, isFiltered);

  // Add an extra newline if only the rename warnings have output
  // (logSnapshotCheatcodesSection adds one if it has output)
  if (
    !functionGasHasOutput &&
    !snapshotCheatcodesHasOutput &&
    snapshotCheatcodesCheck.renamedGroups.length > 0
  ) {
    logger();
  }

  logSnapshotRenameWarnings(snapshotCheatcodesCheck.renamedGroups, logger);

  if (!functionGasSnapshotsCheck.passed || !snapshotCheatcodesCheck.passed) {
    logger(
      styleText(
        "yellow",
        "To update snapshots, run your tests with --snapshot",
      ),
    );
    logger();
  }
}

export default runSolidityTests;
