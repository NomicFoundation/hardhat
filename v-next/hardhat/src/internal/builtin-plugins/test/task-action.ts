import type { HookManager } from "../../../types/hooks.js";
import type {
  NewTaskActionFunction,
  Task,
  TaskArguments,
} from "../../../types/tasks.js";
import type { TestSummary } from "../../../types/test.js";
import type { Result } from "../../../types/utils.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import chalk, { type ChalkInstance } from "chalk";

import {
  errorResult,
  isResult,
  successfulResult,
} from "../../../utils/result.js";
import { getCoverageManager } from "../coverage/helpers.js";
import { getGasAnalyticsManager } from "../gas-analytics/helpers.js";

interface TestActionArguments {
  testFiles: string[];
  chainType: string;
  grep: string | undefined;
  noCompile: boolean;
  verbosity: number;
}

// Old plugins may only return { failed, passed } without skipped/todo,
// so we accept a partial shape and fill defaults in the coordinator.
interface PartialTestSummary extends Omit<TestSummary, "skipped" | "todo"> {
  skipped?: number;
  todo?: number;
}

function isTestSummary(value: unknown): value is PartialTestSummary {
  return (
    isObject(value) &&
    typeof value.failed === "number" &&
    typeof value.passed === "number" &&
    (value.skipped === undefined || typeof value.skipped === "number") &&
    (value.todo === undefined || typeof value.todo === "number")
  );
}

function isTestRunResult(
  value: unknown,
): value is { summary: PartialTestSummary } {
  return isObject(value) && "summary" in value && isTestSummary(value.summary);
}

const runAllTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, chainType, grep, noCompile, verbosity, ...otherArgs },
  hre,
): Promise<Result<void, void>> => {
  // If this code is executed, it means the user has not specified a test runner.
  // If file paths are specified, we need to determine which test runner applies to each test file.
  // If no file paths are specified, each test runner will execute all tests located under its configured path in the Hardhat configuration.
  const subtasksToFiles =
    testFiles.length !== 0
      ? await registerTestRunnersForFiles(testFiles, hre.hooks)
      : {};

  const thisTask = hre.tasks.getTask("test");

  if (!noCompile) {
    await hre.tasks.getTask("build").run({
      noTests: true,
    });
  }

  if (hre.globalOptions.coverage === true) {
    getCoverageManager(hre).disableReport();
  }

  if (
    hre.globalOptions.gasStats === true ||
    hre.globalOptions.gasStatsJson !== undefined
  ) {
    getGasAnalyticsManager(hre).disableReport();
  }

  const testSummaries: Record<string, TestSummary> = {};
  const ranSubtaskIds: string[] = [];

  let failureIndex = 1;
  let hasFailures = false;
  for (const [subtaskKey, subtask] of thisTask.subtasks.entries()) {
    const files = getTestFilesForSubtask(subtask, testFiles, subtasksToFiles);

    if (files === undefined) {
      // This scenario occurs when `testFiles` are provided,
      // but none are assigned to the current subtask, so it should be skipped
      continue;
    }

    ranSubtaskIds.push(subtaskKey);

    const args: TaskArguments = {
      testFiles: files,
      grep,
      noCompile: subtask.options.has("noCompile"),
    };

    if (subtask.options.has("chainType")) {
      args.chainType = chainType;
    }

    if (subtask.options.has("verbosity")) {
      args.verbosity = verbosity;
    }

    for (const [key, value] of Object.entries(otherArgs)) {
      if (subtask.options.has(key)) {
        args[key] = value;
      }
    }

    if (subtask.options.has("testSummaryIndex")) {
      args.testSummaryIndex = failureIndex;
    }

    const subtaskResult = await subtask.run(args);

    let summary: PartialTestSummary | undefined;
    let subtaskFailed = false;

    if (isResult(subtaskResult, isTestRunResult, isTestRunResult)) {
      const testRunResult = subtaskResult.success
        ? subtaskResult.value
        : subtaskResult.error;
      summary = testRunResult.summary;
      subtaskFailed = !subtaskResult.success;
    } else if (isResult(subtaskResult, isTestSummary, isTestSummary)) {
      // Support plugins that return Result<TestSummary, TestSummary>
      summary = subtaskResult.success
        ? subtaskResult.value
        : subtaskResult.error;
      subtaskFailed = !subtaskResult.success;
    } else if (isTestSummary(subtaskResult)) {
      // Support plugins that return TestSummary directly
      summary = subtaskResult;
      subtaskFailed = process.exitCode !== undefined && process.exitCode !== 0;
    } else {
      // Fallback for plugins that don't return a summary at all
      subtaskFailed = process.exitCode !== undefined && process.exitCode !== 0;
    }

    if (summary !== undefined) {
      const summaryId = subtask.id[subtask.id.length - 1];
      testSummaries[summaryId] = {
        skipped: 0,
        todo: 0,
        ...summary,
      };

      if (subtask.options.has("testSummaryIndex")) {
        failureIndex += summary.failed;
      }
    }

    if (subtaskFailed) {
      hasFailures = true;
    }
  }

  const passed: Array<[string, number]> = [];
  const failed: Array<[string, number]> = [];
  const skipped: Array<[string, number]> = [];
  const todo: Array<[string, number]> = [];
  const outputLines: string[] = [];

  for (const [subtaskName, results] of Object.entries(testSummaries)) {
    if (results.passed > 0) {
      passed.push([subtaskName, results.passed]);
    }

    if (results.failed > 0) {
      failed.push([subtaskName, results.failed]);
    }

    if (results.skipped > 0) {
      skipped.push([subtaskName, results.skipped]);
    }

    if (results.todo > 0) {
      todo.push([subtaskName, results.todo]);
    }

    if (results.failureOutput !== undefined && results.failureOutput !== "") {
      const output = results.failureOutput;

      if (subtaskName.includes("node")) {
        outputLines.push(`\n${output}\n`);
      } else {
        outputLines.push(output);
      }
    }
  }

  if (passed.length > 0) {
    logSummaryLine("passing", passed, chalk.green);
  }

  if (failed.length > 0) {
    logSummaryLine("failing", failed, chalk.red);
  }

  if (skipped.length > 0) {
    logSummaryLine("skipped", skipped, chalk.cyan);
  }

  if (todo.length > 0) {
    logSummaryLine("todo", todo, chalk.blue);
  }

  if (outputLines.length > 0) {
    console.log(
      outputLines
        .map((o) => {
          const nl = o.match(/\n+$/gm);
          if (nl !== null) {
            return o.replace(new RegExp(`${nl[0]}$`), "\n");
          }
          return o;
        })
        .join("\n"),
    );
  }

  console.log();

  if (hre.globalOptions.coverage === true) {
    const coverage = getCoverageManager(hre);
    coverage.enableReport();
    await coverage.report(...ranSubtaskIds);
    console.log();
  }

  if (
    hre.globalOptions.gasStats === true ||
    hre.globalOptions.gasStatsJson !== undefined
  ) {
    const gasAnalytics = getGasAnalyticsManager(hre);
    gasAnalytics.enableReport();

    if (hre.globalOptions.gasStats === true) {
      await gasAnalytics.reportGasStats(...ranSubtaskIds);
      console.log();
    }

    if (hre.globalOptions.gasStatsJson !== undefined) {
      await gasAnalytics.writeGasStatsJson(
        hre.globalOptions.gasStatsJson,
        ...ranSubtaskIds,
      );
    }
  }

  if (hasFailures) {
    console.error("Test run failed");
  }

  return hasFailures ? errorResult() : successfulResult();
};

function logSummaryLine(
  label: string,
  items: Array<[string, number]>,
  color: ChalkInstance = chalk.white,
): void {
  let total = 0;
  const str = items
    .map(([name, count]) => {
      total += count;
      return `${count} ${name}`;
    })
    .join(", ");

  console.log(`${color(`${total} ${label}`)} (${str})`);
}

async function registerTestRunnersForFiles(
  testFiles: string[],
  hooks: HookManager,
): Promise<Record<string, string[]>> {
  const subtasksToFiles: Record<string, string[]> = {};

  const notFound: string[] = [];

  for (const file of testFiles) {
    const subtaskName = await hooks.runHandlerChain(
      "test",
      "registerFileForTestRunner",
      [file],
      async (_file) => undefined,
    );

    if (subtaskName === undefined) {
      notFound.push(file);
      continue;
    }

    if (subtasksToFiles[subtaskName] === undefined) {
      subtasksToFiles[subtaskName] = [];
    }

    subtasksToFiles[subtaskName].push(file);
  }

  if (notFound.length !== 0) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.TEST_PLUGIN.CANNOT_DETERMINE_TEST_RUNNER,
      {
        files: notFound.join(", "),
      },
    );
  }

  return subtasksToFiles;
}

function getTestFilesForSubtask(
  subtask: Task,
  testFiles: string[],
  subtaskToFiles: Record<string, string[]>,
): string[] | undefined {
  if (testFiles.length === 0) {
    return [];
  }

  // subtask.id is an array like ['test', '<pluginName>', …];
  // index 1 holds the specific plugin’s subtask name (e.g. 'node')
  const pluginName = subtask.id[1];
  return subtaskToFiles[pluginName];
}

export default runAllTests;
