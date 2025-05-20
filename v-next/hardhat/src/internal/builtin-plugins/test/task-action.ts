import type { HookManager } from "../../../types/hooks.js";
import type { NewTaskActionFunction, Task } from "../../../types/tasks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../coverage/helpers.js";

interface TestActionArguments {
  testFiles: string[];
  noCompile: boolean;
}

const runAllTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, noCompile },
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
    const hreImplementation =
      unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);
    hreImplementation._coverage.disableReport();
  }

  for (const subtask of thisTask.subtasks.values()) {
    const files = getTestFilesForSubtask(subtask, testFiles, subtasksToFiles);

    if (files === undefined) {
      // This scenario occurs when `testFiles` are provided,
      // but none are assigned to the current subtask, so it should be skipped
      continue;
    }

    if (subtask.options.has("noCompile")) {
      await subtask.run({ testFiles: files, noCompile: true });
    } else {
      await subtask.run({ testFiles: files });
    }
  }

  if (hre.globalOptions.coverage === true) {
    const hreImplementation =
      unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);
    const ids = Array.from(thisTask.subtasks.keys());
    hreImplementation._coverage.enableReport();
    await hreImplementation._coverage.report(...ids);
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
