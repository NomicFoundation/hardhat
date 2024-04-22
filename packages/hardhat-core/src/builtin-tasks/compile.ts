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
 * Main task for compiling the solidity files in the project.
 *
 * The main responsibility of this task is to orchestrate and connect most of
 * the subtasks related to compiling solidity.
 */
//
// KEEP THIS TASK
//
subtask(TASK_COMPILE_SOLIDITY)
  .addParam("force", undefined, undefined, types.boolean)
  .addParam("quiet", undefined, undefined, types.boolean)
  .addParam("concurrency", undefined, DEFAULT_CONCURRENCY_LEVEL, types.int)
  .setAction(
    async (
      {
        force,
        quiet,
        concurrency,
        tasksOverrides,
      }: {
        force: boolean;
        quiet: boolean;
        concurrency: number;
        tasksOverrides: TasksOverrides;
      },
      { artifacts, config }
    ) => {
      const rootPath = config.paths.root;

      const sourcePaths: string[] = await taskCompileSolidityGetSourcePaths(
        config,
        config.paths.sources
      );

      const sourceNames: string[] = await taskCompileSolidityGetSourceNames(
        config,
        sourcePaths,
        rootPath
      );

      const solidityFilesCachePath = getSolidityFilesCachePath(config.paths);
      let solidityFilesCache = await SolidityFilesCache.readFromFile(
        solidityFilesCachePath
      );

      const dependencyGraph: taskTypes.DependencyGraph =
        await taskCompileSolidityGetDependencyGraph(
          sourceNames,
          config,
          tasksOverrides,
          rootPath,
          solidityFilesCache
        );

      solidityFilesCache = await invalidateCacheMissingArtifacts(
        solidityFilesCache,
        artifacts,
        dependencyGraph.getResolvedFiles()
      );

      const compilationJobsCreationResult: CompilationJobsCreationResult =
        await taskCompileSolidityGetCompilationJobs(
          config,
          dependencyGraph,
          solidityFilesCache
        );

      await taskCompileSolidityHandleCompilationJobsFailures(
        compilationJobsCreationResult.errors
      );

      const compilationJobs = compilationJobsCreationResult.jobs;

      const filteredCompilationJobs: CompilationJob[] =
        await taskCompileSolidityFilterCompilationJobs(
          compilationJobs,
          force,
          solidityFilesCache
        );

      const mergedCompilationJobs: CompilationJob[] =
        await taskCompileSolidityMergeCompilationJobs(filteredCompilationJobs);

      const {
        artifactsEmittedPerJob,
      }: { artifactsEmittedPerJob: ArtifactsEmittedPerJob } =
        await taskCompileSolidityCompileJobs(
          mergedCompilationJobs,
          artifacts,
          quiet,
          concurrency
        );

      // update cache using the information about the emitted artifacts
      for (const {
        compilationJob: compilationJob,
        artifactsEmittedPerFile: artifactsEmittedPerFile,
      } of artifactsEmittedPerJob) {
        for (const { file, artifactsEmitted } of artifactsEmittedPerFile) {
          solidityFilesCache.addFile(file.absolutePath, {
            lastModificationDate: file.lastModificationDate.valueOf(),
            contentHash: file.contentHash,
            sourceName: file.sourceName,
            solcConfig: compilationJob.getSolcConfig(),
            imports: file.content.imports,
            versionPragmas: file.content.versionPragmas,
            artifacts: artifactsEmitted,
          });
        }
      }

      const allArtifactsEmittedPerFile = solidityFilesCache.getEntries();

      // We know this is the actual implementation, so we use some
      // non-public methods here.
      const artifactsImpl = artifacts as ArtifactsImpl;
      artifactsImpl.addValidArtifacts(allArtifactsEmittedPerFile);

      await solidityFilesCache.writeToFile(solidityFilesCachePath);

      if (
        tasksOverrides?.taskCompileSolidityLogCompilationResult !== undefined
      ) {
        await tasksOverrides.taskCompileSolidityLogCompilationResult(
          mergedCompilationJobs,
          quiet
        );
      } else {
        await taskCompileSolidityLogCompilationResult(
          mergedCompilationJobs,
          quiet
        );
      }
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
  .setAction(async (compilationArgs: any, { artifacts, run }) => {
    const compilationTasks: string[] = await run(
      TASK_COMPILE_GET_COMPILATION_TASKS
    );

    for (const compilationTask of compilationTasks) {
      await run(compilationTask, compilationArgs);
    }

    await taskCompileRemoveObsoleteArtifacts(artifacts);
  });

/**
 * If a file is present in the cache, but some of its artifacts are missing on
 * disk, we remove it from the cache to force it to be recompiled.
 */
async function invalidateCacheMissingArtifacts(
  solidityFilesCache: SolidityFilesCache,
  artifacts: Artifacts,
  resolvedFiles: ResolvedFile[]
): Promise<SolidityFilesCache> {
  const paths = new Set(await artifacts.getArtifactPaths());

  for (const file of resolvedFiles) {
    const cacheEntry = solidityFilesCache.getEntry(file.absolutePath);

    if (cacheEntry === undefined) {
      continue;
    }

    const { artifacts: emittedArtifacts } = cacheEntry;
    for (const emittedArtifact of emittedArtifacts) {
      const fqn = getFullyQualifiedName(file.sourceName, emittedArtifact);
      const path = artifacts.formArtifactPathFromFullyQualifiedName(fqn);

      if (!paths.has(path)) {
        log(
          `Invalidate cache for '${file.absolutePath}' because artifact '${fqn}' doesn't exist`
        );

        solidityFilesCache.removeEntry(file.absolutePath);
        break;
      }
    }
  }

  artifacts.clearCache?.();

  return solidityFilesCache;
}
