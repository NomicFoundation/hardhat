import os from "os";
import { subtask, task, types } from "../internal/core/config/config-env";
import { CompilationJobCreationError } from "../types/builtin-tasks";
import {
  BuildSystem,
  taskCompileSolidityGetCompilationJobsFailureReasons,
  taskCompileSolidityReadFile,
} from "../../../hardhat-build-system/src/index"; // TODO: tmp to check that hh-core tests work with the new package

import {
  // TODO: THE FOLLOWING TASKS ARE CURRENTLY KEEP ACTIVE
  TASK_COMPILE,
  TASK_COMPILE_SOLIDITY,
  TASK_COMPILE_GET_COMPILATION_TASKS,
  TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
  TASK_COMPILE_SOLIDITY_READ_FILE,
} from "./task-names";

const DEFAULT_CONCURRENCY_LEVEL = Math.max(os.cpus().length - 1, 1);

subtask(TASK_COMPILE_SOLIDITY_READ_FILE)
  .addParam("absolutePath", undefined, undefined, types.string)
  .setAction(
    async ({ absolutePath }: { absolutePath: string }): Promise<string> => {
      return taskCompileSolidityReadFile(absolutePath);
    }
  );

/**
 * Receives a list of CompilationJobsFailure and returns an error message
 * that describes the failure.
 */
// NEEDS OVERWRITING
subtask(TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS)
  .addParam("compilationJobsCreationErrors", undefined, undefined, types.any)
  .setAction(
    async ({
      compilationJobsCreationErrors: errors,
    }: {
      compilationJobsCreationErrors: CompilationJobCreationError[];
    }): Promise<string> => {
      return taskCompileSolidityGetCompilationJobsFailureReasons(errors);
    }
  );

/**
 * Returns a list of compilation tasks.
 *
 * This is the task to override to add support for other languages.
 */
subtask(TASK_COMPILE_GET_COMPILATION_TASKS, async (): Promise<string[]> => {
  return [TASK_COMPILE_SOLIDITY];
});

/**
 * Main compile task.
 *
 * This is a meta-task that just gets all the compilation tasks and runs them.
 * Right now there's only a "compile solidity" task.
 */
//
// KEEP THIS TASK
//
task(TASK_COMPILE, "Compiles the entire project, building all artifacts")
  .addFlag("force", "Force compilation ignoring cache")
  .addFlag("quiet", "Makes the compilation process less verbose")
  .addParam(
    "concurrency",
    "Number of compilation jobs executed in parallel. Defaults to the number of CPU cores - 1",
    DEFAULT_CONCURRENCY_LEVEL,
    types.int
  )
  .setAction(async (compilationArgs: any, { artifacts, config }) => {
    // TODO: use the new build system

    const buildSystem = new BuildSystem(config);

    await buildSystem.build({
      profile: "development",
      type: "all",
      files: [],
      artifacts,
      force: compilationArgs.force,
      quiet: compilationArgs.quiet,
      concurrency: compilationArgs.concurrency,
      tasksOverrides: compilationArgs.tasksOverrides,
    });
  });
