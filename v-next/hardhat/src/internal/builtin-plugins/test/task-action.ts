import type { HookManager } from "../../../types/hooks.js";
import type {
  NewTaskActionFunction,
  Task,
  TaskArguments,
} from "../../../types/tasks.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import chalk, { type ChalkInstance } from "chalk";

import { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";

interface TestActionArguments {
  testFiles: string[];
  chainType: string;
  grep: string | undefined;
  noCompile: boolean;
  verbosity: number;
}

const runAllTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, chainType, grep, noCompile, verbosity },
  hre,
) => {
  // If this code is executed, it means the user has not specified a test runner.
  // If file paths are specified, we need to determine which test runner applies to each test file.
  // If no file paths are specified, each test runner will execute all tests located under its configured path in the Hardhat configuration.
  const subtasksToFiles =
    testFiles.length !== 0
      ? await registerTestRunnersForFiles(testFiles, hre.hooks)
      : {};

  const thisTask = hre.tasks.getTask("test");

  if (!noCompile) {
    await hre.tasks.getTask("compile").run({});
    console.log();
  }

  if (hre.globalOptions.coverage === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    hre._coverage.disableReport();
  }

  const testSummaries: Record<
    string,
    {
      failed: number;
      passed: number;
      skipped: number;
      todo: number;
      failureOutput: string;
    }
  > = {};

  for (const subtask of thisTask.subtasks.values()) {
    const files = getTestFilesForSubtask(subtask, testFiles, subtasksToFiles);

    if (files === undefined) {
      // This scenario occurs when `testFiles` are provided,
      // but none are assigned to the current subtask, so it should be skipped
      continue;
    }

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

    if (subtask.options.has("testSummaryIndex")) {
      // todo: this should be updated to support cross-runner indices in the future
      args.testSummaryIndex = 1;
    }

    testSummaries[subtask.id.join("-")] = await subtask.run(args);
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

    if (results.failureOutput !== "") {
      outputLines.push(results.failureOutput);
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
    console.log(outputLines.join("\n"));
    console.log();
  }

  console.log();

  if (hre.globalOptions.coverage === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    const ids = Array.from(thisTask.subtasks.keys());
    hre._coverage.enableReport();
    await hre._coverage.report(...ids);
    console.log();
  }

  if (process.exitCode !== undefined && process.exitCode !== 0) {
    console.error("Test run failed");
  }
};

function logSummaryLine(
  label: string,
  items: Array<[string, number]>,
  color: ChalkInstance = chalk.white,
): void {
  let total = 0;
  const todoStr = items
    .map(([name, count]) => {
      total += count;
      return `${count} ${name}`;
    })
    .join(", ");

  console.log(`${color(`${total} ${label}`)} (${todoStr})`);
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
