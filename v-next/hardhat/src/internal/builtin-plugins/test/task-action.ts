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
    await hre.tasks.getTask("build").run({
      noTests: true,
    });
  }

  if (hre.globalOptions.coverage === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    hre._coverage.disableReport();
  }

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

    await subtask.run(args);
  }

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
