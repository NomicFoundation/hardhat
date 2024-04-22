import os from "os";
import debug from "debug";
import fsExtra from "fs-extra";

import { Artifacts as ArtifactsImpl } from "../internal/artifacts";
import { subtask, task, types } from "../internal/core/config/config-env";
import { HardhatError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";

import { ResolvedFile } from "../internal/solidity/resolver";
import { pluralize } from "../internal/util/strings";
import { Artifacts } from "../types";
import * as taskTypes from "../types/builtin-tasks";
import {
  CompilationJob,
  CompilationJobCreationError,
  CompilationJobCreationErrorReason,
  CompilationJobsCreationResult,
} from "../types/builtin-tasks";
import { getFullyQualifiedName } from "../utils/contract-names";

import {
  TasksOverrides,
  taskCompileRemoveObsoleteArtifacts,
  taskCompileSolidity,
  taskCompileSolidityCompileJobs,
  taskCompileSolidityFilterCompilationJobs,
  taskCompileSolidityGetCompilationJobs,
  taskCompileSolidityGetCompilationJobsFailureReasons,
  taskCompileSolidityGetDependencyGraph,
  taskCompileSolidityGetSourceNames,
  taskCompileSolidityGetSourcePaths,
  taskCompileSolidityHandleCompilationJobsFailures,
  taskCompileSolidityLogCompilationResult,
  taskCompileSolidityMergeCompilationJobs,
  taskCompileSolidityReadFile,
} from "../build-system/build-system";
import {
  // TO KEEP
  TASK_COMPILE,
  TASK_COMPILE_SOLIDITY,
  TASK_COMPILE_GET_COMPILATION_TASKS,
  // NEEDS OVERWRITING - check implementation with tests
  TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
  TASK_COMPILE_SOLIDITY_READ_FILE,
  TASK_COMPILE_TRANSFORM_IMPORT_NAME, // DEPRECATED
  TASK_COMPILE_GET_REMAPPINGS,
} from "./task-names";
import {
  getSolidityFilesCachePath,
  SolidityFilesCache,
} from "./utils/solidity-files-cache";

type ArtifactsEmittedPerJob = Array<{
  compilationJob: CompilationJob;
  artifactsEmittedPerFile: taskTypes.ArtifactsEmittedPerFile;
}>;

const log = debug("hardhat:core:tasks:compile");

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
//
// KEEP THIS TASK
//
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
  .setAction(async (compilationArgs: any, { artifacts, run, config }) => {
    // TODO
    // const compilationTasks: string[] = await run(
    //   TASK_COMPILE_GET_COMPILATION_TASKS
    // );

    // for (const compilationTask of compilationTasks) {
    //   await run(compilationTask, compilationArgs);
    // }

    // TODO
    await taskCompileSolidity(
      config,
      artifacts,
      compilationArgs.force,
      compilationArgs.quit,
      compilationArgs.concurrency,
      compilationArgs.tasksOverrides
    );

    await taskCompileRemoveObsoleteArtifacts(artifacts);
  });
