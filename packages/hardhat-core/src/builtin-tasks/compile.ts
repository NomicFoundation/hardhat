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
  taskCompileRemoveObsoleteArtifacts,
  taskCompileSolidityCompileJobs,
  taskCompileSolidityFilterCompilationJobs,
  taskCompileSolidityGetCompilationJobs,
  taskCompileSolidityGetDependencyGraph,
  taskCompileSolidityGetSourceNames,
  taskCompileSolidityGetSourcePaths,
  taskCompileSolidityHandleCompilationJobsFailures,
  taskCompileSolidityLogCompilationResult,
  taskCompileSolidityMergeCompilationJobs,
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
      try {
        return await fsExtra.readFile(absolutePath, {
          encoding: "utf8",
        });
      } catch (e) {
        if (fsExtra.lstatSync(absolutePath).isDirectory()) {
          throw new HardhatError(ERRORS.GENERAL.INVALID_READ_OF_DIRECTORY, {
            absolutePath,
          });
        }

        // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
        throw e;
      }
    }
  );

/**
 * DEPRECATED: This subtask is deprecated and will be removed in the future.
 *
 * This task transform the string literal in an import directive.
 * By default it does nothing, but it can be overriden by plugins.
 */
subtask(TASK_COMPILE_TRANSFORM_IMPORT_NAME)
  .addParam("importName", undefined, undefined, types.string)
  .setAction(
    async ({ importName }: { importName: string }): Promise<string> => {
      return importName;
    }
  );

/**
 * This task returns a Record<string, string> representing remappings to be used
 * by the resolver.
 */
subtask(TASK_COMPILE_GET_REMAPPINGS).setAction(
  async (): Promise<Record<string, string>> => {
    return {};
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
      const noCompatibleSolc: CompilationJobCreationError[] = [];
      const incompatibleOverridenSolc: CompilationJobCreationError[] = [];
      const directlyImportsIncompatibleFile: CompilationJobCreationError[] = [];
      const indirectlyImportsIncompatibleFile: CompilationJobCreationError[] =
        [];
      const other: CompilationJobCreationError[] = [];

      for (const error of errors) {
        if (
          error.reason ===
          CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND
        ) {
          noCompatibleSolc.push(error);
        } else if (
          error.reason ===
          CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION
        ) {
          incompatibleOverridenSolc.push(error);
        } else if (
          error.reason ===
          CompilationJobCreationErrorReason.DIRECTLY_IMPORTS_INCOMPATIBLE_FILE
        ) {
          directlyImportsIncompatibleFile.push(error);
        } else if (
          error.reason ===
          CompilationJobCreationErrorReason.INDIRECTLY_IMPORTS_INCOMPATIBLE_FILE
        ) {
          indirectlyImportsIncompatibleFile.push(error);
        } else if (
          error.reason === CompilationJobCreationErrorReason.OTHER_ERROR
        ) {
          other.push(error);
        } else {
          // add unrecognized errors to `other`
          other.push(error);
        }
      }

      let errorMessage = "";
      if (incompatibleOverridenSolc.length > 0) {
        errorMessage += `The compiler version for the following files is fixed through an override in your config file to a version that is incompatible with their Solidity version pragmas.

`;

        for (const error of incompatibleOverridenSolc) {
          const { sourceName } = error.file;
          const { versionPragmas } = error.file.content;
          const versionsRange = versionPragmas.join(" ");

          log(`File ${sourceName} has an incompatible overriden compiler`);

          errorMessage += `  * ${sourceName} (${versionsRange})\n`;
        }

        errorMessage += "\n";
      }

      if (noCompatibleSolc.length > 0) {
        errorMessage += `The Solidity version pragma statement in these files doesn't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

`;

        for (const error of noCompatibleSolc) {
          const { sourceName } = error.file;
          const { versionPragmas } = error.file.content;
          const versionsRange = versionPragmas.join(" ");

          log(
            `File ${sourceName} doesn't match any of the configured compilers`
          );

          errorMessage += `  * ${sourceName} (${versionsRange})\n`;
        }

        errorMessage += "\n";
      }

      if (directlyImportsIncompatibleFile.length > 0) {
        errorMessage += `These files import other files that use a different and incompatible version of Solidity:

`;

        for (const error of directlyImportsIncompatibleFile) {
          const { sourceName } = error.file;
          const { versionPragmas } = error.file.content;
          const versionsRange = versionPragmas.join(" ");

          const incompatibleDirectImportsFiles: ResolvedFile[] =
            error.extra?.incompatibleDirectImports ?? [];

          const incompatibleDirectImports = incompatibleDirectImportsFiles.map(
            (x: ResolvedFile) =>
              `${x.sourceName} (${x.content.versionPragmas.join(" ")})`
          );

          log(
            `File ${sourceName} imports files ${incompatibleDirectImportsFiles
              .map((x) => x.sourceName)
              .join(", ")} that use an incompatible version of Solidity`
          );

          let directImportsText = "";
          if (incompatibleDirectImports.length === 1) {
            directImportsText = ` imports ${incompatibleDirectImports[0]}`;
          } else if (incompatibleDirectImports.length === 2) {
            directImportsText = ` imports ${incompatibleDirectImports[0]} and ${incompatibleDirectImports[1]}`;
          } else if (incompatibleDirectImports.length > 2) {
            const otherImportsCount = incompatibleDirectImports.length - 2;
            directImportsText = ` imports ${incompatibleDirectImports[0]}, ${
              incompatibleDirectImports[1]
            } and ${otherImportsCount} other ${pluralize(
              otherImportsCount,
              "file"
            )}. Use --verbose to see the full list.`;
          }

          errorMessage += `  * ${sourceName} (${versionsRange})${directImportsText}\n`;
        }

        errorMessage += "\n";
      }

      if (indirectlyImportsIncompatibleFile.length > 0) {
        errorMessage += `These files depend on other files that use a different and incompatible version of Solidity:

`;

        for (const error of indirectlyImportsIncompatibleFile) {
          const { sourceName } = error.file;
          const { versionPragmas } = error.file.content;
          const versionsRange = versionPragmas.join(" ");

          const incompatibleIndirectImports: taskTypes.TransitiveDependency[] =
            error.extra?.incompatibleIndirectImports ?? [];

          const incompatibleImports = incompatibleIndirectImports.map(
            ({ dependency }) =>
              `${
                dependency.sourceName
              } (${dependency.content.versionPragmas.join(" ")})`
          );

          for (const {
            dependency,
            path: dependencyPath,
          } of incompatibleIndirectImports) {
            const dependencyPathText = [
              sourceName,
              ...dependencyPath.map((x) => x.sourceName),
              dependency.sourceName,
            ].join(" -> ");

            log(
              `File ${sourceName} depends on file ${dependency.sourceName} that uses an incompatible version of Solidity
The dependency path is ${dependencyPathText}
`
            );
          }

          let indirectImportsText = "";
          if (incompatibleImports.length === 1) {
            indirectImportsText = ` depends on ${incompatibleImports[0]}`;
          } else if (incompatibleImports.length === 2) {
            indirectImportsText = ` depends on ${incompatibleImports[0]} and ${incompatibleImports[1]}`;
          } else if (incompatibleImports.length > 2) {
            const otherImportsCount = incompatibleImports.length - 2;
            indirectImportsText = ` depends on ${incompatibleImports[0]}, ${
              incompatibleImports[1]
            } and ${otherImportsCount} other ${pluralize(
              otherImportsCount,
              "file"
            )}. Use --verbose to see the full list.`;
          }

          errorMessage += `  * ${sourceName} (${versionsRange})${indirectImportsText}\n`;
        }

        errorMessage += "\n";
      }

      if (other.length > 0) {
        errorMessage += `These files and its dependencies cannot be compiled with your config. This can happen because they have incompatible Solidity pragmas, or don't match any of your configured Solidity compilers.

${other.map((x) => `  * ${x.file.sourceName}`).join("\n")}

`;
      }

      errorMessage += `To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`;

      return errorMessage;
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
      }: { force: boolean; quiet: boolean; concurrency: number },
      { artifacts, config, run }
    ) => {
      // console.log(
      //   `-------------------------------------------- ${config.paths.root}`
      // );

      const rootPath = config.paths.root;

      // TESTED
      const sourcePaths: string[] = await taskCompileSolidityGetSourcePaths(
        config,
        config.paths.sources
      );

      // TESTED
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
          run,
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

      await taskCompileSolidityLogCompilationResult(
        mergedCompilationJobs,
        quiet
      );
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
