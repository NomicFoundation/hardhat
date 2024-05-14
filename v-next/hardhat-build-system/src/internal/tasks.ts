import fsExtra from "fs-extra";
import debug from "debug";
import semver from "semver";
import chalk from "chalk";
import AggregateError from "aggregate-error";
import { CompilationJobsCreationResult } from "./types/builtin-tasks/index.js";
import { DependencyGraph } from "./solidity/dependencyGraph.js";
import {
  Artifacts,
  CompilationJob,
  CompilationJobCreationError,
  CompilationJobCreationErrorReason,
  CompilerInput,
  CompilerOutput,
  BuildConfig,
  ResolvedFile,
  SolcBuild,
} from "./types/index.js";
import { getAllFilesMatching } from "./utils/fs-utils.js";
import { localPathToSourceName } from "./utils/source-names.js";
import { HardhatError, assertHardhatInvariant } from "./errors/errors.js";
import { ERRORS } from "./errors/errors-list.js";
import {
  createCompilationJobFromFile,
  createCompilationJobsFromConnectedComponent,
  mergeCompilationJobsWithoutBug,
} from "./solidity/compilation-job.js";
import * as taskTypes from "./types/builtin-tasks/index.js";
import { SolidityFilesCache } from "./builtin-tasks/utils/solidity-files-cache.js";
import { pluralize } from "./utils/string.js";
import {
  CompilerDownloader,
  CompilerPlatform,
} from "./solidity/compiler/downloader.js";
import { getCompilersDir } from "./utils/global-dir.js";
import { Compiler, NativeCompiler } from "./solidity/compiler/index.js";
import { getInputFromCompilationJob } from "./solidity/compiler/compiler-input.js";
import {
  Artifacts as ArtifactsImpl,
  getArtifactFromContractOutput,
} from "./utils/artifacts.js";
import { getEvmVersionFromSolcVersion } from "./solidity/compiler/solc-info.js";
import { Parser } from "./solidity/parse.js";
import { Resolver } from "./solidity/resolver.js";
import { getSolidityFilesCachePath } from "./utils/solidity-files-cache.js";
import { getFullyQualifiedName } from "./utils/contract-names.js";

const log = debug("hardhat:core:tasks:compile:REFACTORING");

const COMPILE_TASK_FIRST_SOLC_VERSION_SUPPORTED = "0.4.11";

type ArtifactsEmittedPerJob = Array<{
  compilationJob: CompilationJob;
  artifactsEmittedPerFile: taskTypes.ArtifactsEmittedPerFile;
}>;

export interface TasksOverrides {
  taskCompileGetRemappings?: typeof taskCompileGetRemappings;
  taskCompileSolidityLogCompilationResult?: typeof taskCompileSolidityLogCompilationResult;
}

// TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS
// TESTED
/**
 * Returns a list of absolute paths to all the solidity files in the project.
 * This list doesn't include dependencies, for example solidity files inside
 * node_modules.
 *
 * This is the right task to override to change how the solidity files of the
 * project are obtained.
 */
export async function taskCompileSolidityGetSourcePaths(
  config: BuildConfig,
  sourcePath: string | undefined,
): Promise<string[]> {
  return getAllFilesMatching(sourcePath ?? config.paths.sources, (f) =>
    f.endsWith(".sol"),
  );
}

// TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES
// TESTED
/**
 * Receives a list of absolute paths and returns a list of source names
 * corresponding to each path. For example, receives
 * ["/home/user/project/contracts/Foo.sol"] and returns
 * ["contracts/Foo.sol"]. These source names will be used when the solc input
 * is generated.
 */
export async function taskCompileSolidityGetSourceNames(
  config: BuildConfig,
  sourcePaths: string[],
  rootPath?: string,
): Promise<string[]> {
  return Promise.all(
    sourcePaths.map((p) =>
      localPathToSourceName(rootPath ?? config.paths.root, p),
    ),
  );
}

// TASK_COMPILE_GET_REMAPPINGS
// TESTED
export async function taskCompileGetRemappings(): Promise<
  Record<string, string>
> {
  return {};
}

// TASK_COMPILE_SOLIDITY_READ_FILE
// TESTED
export async function taskCompileSolidityReadFile(
  absolutePath: string,
): Promise<string> {
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

// TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE
// TESTED
/**
 * Receives a dependency graph and a file in it, and returns the compilation
 * job for that file. The compilation job should have everything that is
 * necessary to compile that file: a compiler config to be used and a list of
 * files to use as input of the compilation.
 *
 * If the file cannot be compiled, a MatchingCompilerFailure should be
 * returned instead.
 *
 * This is the right task to override to change the compiler configuration.
 * For example, if you want to change the compiler settings when targetting
 * goerli, you could do something like this:
 *
 *   const compilationJob = await runSuper();
 *   if (config.network.name === 'goerli') {
 *     compilationJob.solidityConfig.settings = newSettings;
 *   }
 *   return compilationJob;
 *
 */
export async function taskCompileSolidityGetCompilationJobForFile(
  config: BuildConfig,
  file: taskTypes.ResolvedFile,
  dependencyGraph: taskTypes.DependencyGraph,
  _solidityFilesCache?: SolidityFilesCache, // TODO: keep unused?
): Promise<CompilationJob | taskTypes.CompilationJobCreationError> {
  return createCompilationJobFromFile(dependencyGraph, file, config.solidity);
}

// TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS
// TESTED
/**
 * Receives a dependency graph and returns a tuple with two arrays. The first
 * array is a list of CompilationJobsSuccess, where each item has a list of
 * compilation jobs. The second array is a list of CompilationJobsFailure,
 * where each item has a list of files that couldn't be compiled, grouped by
 * the reason for the failure.
 */
export async function taskCompileSolidityGetCompilationJobs(
  config: BuildConfig,
  dependencyGraph: taskTypes.DependencyGraph,
  solidityFilesCache?: SolidityFilesCache,
) {
  const connectedComponents = dependencyGraph.getConnectedComponents();

  log(
    `The dependency graph was divided in '${connectedComponents.length}' connected components`,
  );

  const compilationJobsCreationResults = await Promise.all(
    connectedComponents.map((graph) =>
      createCompilationJobsFromConnectedComponent(
        graph,
        (file: taskTypes.ResolvedFile) =>
          taskCompileSolidityGetCompilationJobForFile(
            config,
            file,
            dependencyGraph,
            solidityFilesCache,
          ),
      ),
    ),
  );

  let jobs: CompilationJob[] = [];
  let errors: CompilationJobCreationError[] = [];

  for (const result of compilationJobsCreationResults) {
    jobs = jobs.concat(result.jobs);
    errors = errors.concat(result.errors);
  }

  return { jobs, errors };
}

// TASK_COMPILE_SOLIDITY_HANDLE_COMPILATION_JOBS_FAILURES
// TO TEST
/**
 * Receives a list of CompilationJobsFailure and throws an error if it's not
 * empty.
 *
 * This task could be overriden to avoid interrupting the compilation if
 * there's some part of the project that can't be compiled.
 */
export async function taskCompileSolidityHandleCompilationJobsFailures(
  compilationJobsCreationErrors: CompilationJobCreationError[],
) {
  const hasErrors = compilationJobsCreationErrors.length > 0;

  if (hasErrors) {
    log(`There were errors creating the compilation jobs, throwing`);
    const reasons: string =
      // TO TEST
      await taskCompileSolidityGetCompilationJobsFailureReasons(
        compilationJobsCreationErrors,
      );

    throw new HardhatError(
      ERRORS.BUILTIN_TASKS.COMPILATION_JOBS_CREATION_FAILURE,
      {
        reasons,
      },
    );
  }
}

// TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS
// TO TEST
/**
 * Receives a list of CompilationJobsFailure and returns an error message
 * that describes the failure.
 */
export async function taskCompileSolidityGetCompilationJobsFailureReasons(
  compilationJobsCreationErrors: CompilationJobCreationError[],
): Promise<string> {
  const noCompatibleSolc: CompilationJobCreationError[] = [];
  const incompatibleOverridenSolc: CompilationJobCreationError[] = [];
  const directlyImportsIncompatibleFile: CompilationJobCreationError[] = [];
  const indirectlyImportsIncompatibleFile: CompilationJobCreationError[] = [];
  const other: CompilationJobCreationError[] = [];

  for (const error of compilationJobsCreationErrors) {
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
    } else if (error.reason === CompilationJobCreationErrorReason.OTHER_ERROR) {
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

      log(`File ${sourceName} doesn't match any of the configured compilers`);

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
          `${x.sourceName} (${x.content.versionPragmas.join(" ")})`,
      );

      log(
        `File ${sourceName} imports files ${incompatibleDirectImportsFiles
          .map((x) => x.sourceName)
          .join(", ")} that use an incompatible version of Solidity`,
      );

      let directImportsText = "";
      assertHardhatInvariant(
        incompatibleDirectImports[0] !== undefined,
        "Incompatible direct import at index 0 is undefined",
      );
      if (incompatibleDirectImports.length === 1) {
        directImportsText = ` imports ${incompatibleDirectImports[0]}`;
      } else {
        assertHardhatInvariant(
          incompatibleDirectImports[1] !== undefined,
          "Incompatible direct import at index 1 is undefined",
        );

        if (incompatibleDirectImports.length === 2) {
          directImportsText = ` imports ${incompatibleDirectImports[0]} and ${incompatibleDirectImports[1]}`;
        } else if (incompatibleDirectImports.length > 2) {
          const otherImportsCount = incompatibleDirectImports.length - 2;
          directImportsText = ` imports ${incompatibleDirectImports[0]}, ${
            incompatibleDirectImports[1]
          } and ${otherImportsCount} other ${pluralize(
            otherImportsCount,
            "file",
          )}. Use --verbose to see the full list.`;
        }
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
          `${dependency.sourceName} (${dependency.content.versionPragmas.join(
            " ",
          )})`,
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
`,
        );
      }

      let indirectImportsText = "";
      assertHardhatInvariant(
        incompatibleImports[0] !== undefined,
        "Incompatible import at index 0 is undefined",
      );
      if (incompatibleImports.length === 1) {
        indirectImportsText = ` depends on ${incompatibleImports[0]}`;
      } else {
        assertHardhatInvariant(
          incompatibleImports[1] !== undefined,
          "Incompatible import at index 1 is undefined",
        );

        if (incompatibleImports.length === 2) {
          indirectImportsText = ` depends on ${incompatibleImports[0]} and ${incompatibleImports[1]}`;
        } else if (incompatibleImports.length > 2) {
          const otherImportsCount = incompatibleImports.length - 2;
          indirectImportsText = ` depends on ${incompatibleImports[0]}, ${
            incompatibleImports[1]
          } and ${otherImportsCount} other ${pluralize(
            otherImportsCount,
            "file",
          )}. Use --verbose to see the full list.`;
        }
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

// TASK_COMPILE_SOLIDITY_FILTER_COMPILATION_JOBS
// TESTED
/**
 * Receives a list of compilation jobs and returns a new list where some of
 * the compilation jobs might've been removed.
 *
 * This task can be overriden to change the way the cache is used, or to use
 * a different approach to filtering out compilation jobs.
 */
export async function taskCompileSolidityFilterCompilationJobs(
  compilationJobs: CompilationJob[],
  force: boolean,
  solidityFilesCache?: SolidityFilesCache,
): Promise<CompilationJob[]> {
  assertHardhatInvariant(
    solidityFilesCache !== undefined,
    "The implementation of this task needs a defined solidityFilesCache",
  );

  if (force) {
    log(`force flag enabled, not filtering`);
    return compilationJobs;
  }

  const neededCompilationJobs = compilationJobs.filter((job) =>
    needsCompilation(job, solidityFilesCache),
  );

  const jobsFilteredOutCount =
    compilationJobs.length - neededCompilationJobs.length;
  log(`'${jobsFilteredOutCount}' jobs were filtered out`);

  return neededCompilationJobs;
}

/**
 * Checks if the given compilation job needs to be done.
 */
function needsCompilation(
  job: taskTypes.CompilationJob,
  cache: SolidityFilesCache,
): boolean {
  for (const file of job.getResolvedFiles()) {
    const hasChanged = cache.hasFileChanged(
      file.absolutePath,
      file.contentHash,
      // we only check if the solcConfig is different for files that
      // emit artifacts
      job.emitsArtifacts(file) ? job.getSolcConfig() : undefined,
    );

    if (hasChanged) {
      return true;
    }
  }

  return false;
}

// TASK_COMPILE_SOLIDITY_MERGE_COMPILATION_JOBS
// TESTED
/**
 * Receives a list of compilation jobs and returns a new list where some of
 * the jobs might've been merged.
 */
export async function taskCompileSolidityMergeCompilationJobs(
  compilationJobs: CompilationJob[],
): Promise<CompilationJob[]> {
  return mergeCompilationJobsWithoutBug(compilationJobs);
}

// TASK_COMPILE_SOLIDITY_LOG_NOTHING_TO_COMPILE
// TO TEST
/**
 * Prints a message when there's nothing to compile.
 */
export async function taskCompileSolidityLogNothingToCompile(quiet: boolean) {
  if (!quiet) {
    console.log("Nothing to compile");
  }
}

// TASK_COMPILE_SOLIDITY_LOG_DOWNLOAD_COMPILER_START
// TO TEST
export async function taskCompileSolidityLogDownloadCompilerStart(
  solcVersion: string,
  isCompilerDownloaded: boolean,
  _quiet: boolean, // TODO: keep unused?
) {
  if (isCompilerDownloaded) {
    return;
  }
  console.log(`Downloading compiler ${solcVersion}`);
}

// TASK_COMPILE_SOLIDITY_LOG_DOWNLOAD_COMPILER_END
// TO TEST
export async function taskCompileSolidityLogDownloadCompilerEnd(
  _solcVersion: string, // TODO: keep unused?
  _isCompilerDownloaded: boolean, // TODO: keep unused?
  _quiet: boolean, // TODO: keep unused?
) {
  return;
}

// TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD
// DOUBLE CHECK TESTS
/**
 * Receives a solc version and returns a path to a solc binary or to a
 * downloaded solcjs module. It also returns a flag indicating if the returned
 * path corresponds to solc or solcjs.
 */
export async function taskCompileSolidityGetSolcBuild(
  solcVersion: string,
  quiet: boolean,
): Promise<SolcBuild> {
  const compilersCache = await getCompilersDir();

  const compilerPlatform = CompilerDownloader.getCompilerPlatform();
  const downloader = CompilerDownloader.getConcurrencySafeDownloader(
    compilerPlatform,
    compilersCache,
  );

  await downloader.downloadCompiler(
    solcVersion,
    // callback called before compiler download
    async (isCompilerDownloaded: boolean) => {
      await taskCompileSolidityLogDownloadCompilerStart(
        solcVersion,
        isCompilerDownloaded,
        quiet,
      );
    },
    // callback called after compiler download
    async (isCompilerDownloaded: boolean) => {
      await taskCompileSolidityLogDownloadCompilerEnd(
        solcVersion,
        isCompilerDownloaded,
        quiet,
      );
    },
  );

  const compiler = await downloader.getCompiler(solcVersion);

  if (compiler !== undefined) {
    return compiler;
  }

  log(
    "Native solc binary doesn't work, using solcjs instead. Try running npx hardhat clean --global",
  );

  const wasmDownloader = CompilerDownloader.getConcurrencySafeDownloader(
    CompilerPlatform.WASM,
    compilersCache,
  );

  await wasmDownloader.downloadCompiler(
    solcVersion,
    async (isCompilerDownloaded: boolean) => {
      // callback called before compiler download
      await taskCompileSolidityLogDownloadCompilerStart(
        solcVersion,
        isCompilerDownloaded,
        quiet,
      );
    },
    // callback called after compiler download
    async (isCompilerDownloaded: boolean) => {
      await taskCompileSolidityLogDownloadCompilerEnd(
        solcVersion,
        isCompilerDownloaded,
        quiet,
      );
    },
  );

  const wasmCompiler = await wasmDownloader.getCompiler(solcVersion);

  assertHardhatInvariant(
    wasmCompiler !== undefined,
    `WASM build of solc ${solcVersion} isn't working`,
  );

  return wasmCompiler;
}

// TASK_COMPILE_SOLIDITY_LOG_RUN_COMPILER_START
// TO TEST
/**
 * Prints a message before running soljs with some input.
 */
export async function taskCompileSolidityLogRunCompilerStart(
  _compilationJob: CompilationJob, // TODO: keep unused?
  _compilationJobs: CompilationJob[], // TODO: keep unused?
  _compilationJobIndex: number, // TODO: keep unused?
  _quiet: boolean, // TODO: keep unused?
) {
  return;
}

// TASK_COMPILE_SOLIDITY_RUN_SOLCJS
// NOT TESTED
/**
 * Receives an absolute path to a solcjs module and the input to be compiled,
 * and returns the generated output
 */
export async function taskCompileSolidityRunSolcjs(
  input: CompilerInput,
  solcJsPath: string,
): Promise<any> {
  const compiler = new Compiler(solcJsPath);

  return compiler.compile(input);
}

// TASK_COMPILE_SOLIDITY_RUN_SOLC
// TESTED
/**
 * Receives an absolute path to a solc binary and the input to be compiled,
 * and returns the generated output
 */
export async function taskCompileSolidityRunSolc(
  input: CompilerInput,
  solcPath: string,
  solcVersion?: string,
): Promise<any> {
  if (solcVersion !== undefined && semver.valid(solcVersion) === null) {
    throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
      value: solcVersion,
      name: "solcVersion",
      type: "string",
    });
  }

  const compiler = new NativeCompiler(solcPath, solcVersion);

  return compiler.compile(input);
}

/**
 * Prints a message after compiling some input
 */
// TASK_COMPILE_SOLIDITY_LOG_RUN_COMPILER_END
// TO TEST
export async function taskCompileSolidityLogRunCompilerEnd(
  _compilationJob: CompilationJob, // TODO: keep unused?
  _compilationJobs: CompilationJob[], // TODO: keep unused?
  _compilationJobIndex: number, // TODO: keep unused?
  _output: any, // TODO: keep unused?
  _quiet: boolean, // TODO: keep unused?
) {
  return;
}

// TASK_COMPILE_SOLIDITY_COMPILE_SOLC
// TESTED
/**
 * Receives a CompilerInput and a solc version, compiles the input using a native
 * solc binary or, if that's not possible, using solcjs. Returns the generated
 * output.
 *
 * This task can be overriden to change how solc is obtained or used.
 */
export async function taskCompileSolidityCompileSolc(
  input: CompilerInput,
  quiet: boolean,
  solcVersion: string,
  compilationJob: CompilationJob,
  compilationJobs: CompilationJob[],
  compilationJobIndex: number,
): Promise<{ output: CompilerOutput; solcBuild: SolcBuild }> {
  const solcBuild: SolcBuild = await taskCompileSolidityGetSolcBuild(
    solcVersion,
    quiet,
  );

  await taskCompileSolidityLogRunCompilerStart(
    compilationJob,
    compilationJobs,
    compilationJobIndex,
    quiet,
  );

  let output;
  if (solcBuild.isSolcJs) {
    output = await taskCompileSolidityRunSolcjs(input, solcBuild.compilerPath);
  } else {
    output = await taskCompileSolidityRunSolc(
      input,
      solcBuild.compilerPath,
      solcVersion,
    );
  }

  await taskCompileSolidityLogRunCompilerEnd(
    compilationJob,
    compilationJobs,
    compilationJobIndex,
    output,
    quiet,
  );

  return { output, solcBuild };
}

// TASK_COMPILE_SOLIDITY_COMPILE
// TO TEST (just a forwarding to another task)
/**
 * This task is just a proxy to the task that compiles with solc.
 *
 * Override this to use a different task to compile a job.
 */
export async function taskCompileSolidityCompile(
  input: CompilerInput,
  quiet: boolean,
  solcVersion: string,
  compilationJob: CompilationJob,
  compilationJobs: CompilationJob[],
  compilationJobIndex: number,
) {
  return taskCompileSolidityCompileSolc(
    input,
    quiet,
    solcVersion,
    compilationJob,
    compilationJobs,
    compilationJobIndex,
  );
}

// TASK_COMPILE_SOLIDITY_LOG_COMPILATION_ERRORS
// TO TEST
/**
 * Receives a compilation output and prints its errors and any other
 * information useful to the user.
 */
export async function taskCompileSolidityLogCompilationErrors(
  output: any,
  _quiet: boolean, // TODO: keep unused?
) {
  if (output?.errors === undefined) {
    return;
  }

  for (const error of output.errors) {
    if (error.severity === "error") {
      const errorMessage: string =
        getFormattedInternalCompilerErrorMessage(error) ??
        error.formattedMessage;

      console.error(errorMessage.replace(/^\w+:/, (t) => chalk.red.bold(t)));
    } else {
      console.warn(
        (error.formattedMessage as string).replace(/^\w+:/, (t) =>
          chalk.yellow.bold(t),
        ),
      );
    }
  }

  const hasConsoleErrors: boolean = output.errors.some(isConsoleLogError);
  if (hasConsoleErrors) {
    console.error(
      chalk.red(
        `The console.log call you made isn’t supported. See https://hardhat.org/console-log for the list of supported methods.`,
      ),
    );
    console.log();
  }
}

/**
 * This function returns a properly formatted Internal Compiler Error message.
 *
 * This is present due to a bug in Solidity. See: https://github.com/ethereum/solidity/issues/9926
 *
 * If the error is not an ICE, or if it's properly formatted, this function returns undefined.
 */
function getFormattedInternalCompilerErrorMessage(error: {
  formattedMessage: string;
  message: string;
  type: string;
}): string | undefined {
  if (error.formattedMessage.trim() !== "InternalCompilerError:") {
    return;
  }

  // We trim any final `:`, as we found some at the end of the error messages,
  // and then trim just in case a blank space was left
  return `${error.type}: ${error.message}`.replace(/[:\s]*$/g, "").trim();
}

function isConsoleLogError(error: any): boolean {
  const message = error.message;

  return (
    error.type === "TypeError" &&
    typeof message === "string" &&
    message.includes("log") &&
    message.includes("type(library console)")
  );
}

// TASK_COMPILE_SOLIDITY_CHECK_ERRORS
// TO TEST
/**
 * Receives a solc output and checks if there are errors. Throws if there are
 * errors.
 *
 * Override this task to avoid interrupting the compilation process if some
 * job has compilation errors.
 */
export async function taskCompileSolidityCheckErrors(
  output: any,
  quiet: boolean,
) {
  await taskCompileSolidityLogCompilationErrors(output, quiet);

  if (hasCompilationErrors(output)) {
    throw new HardhatError(ERRORS.BUILTIN_TASKS.COMPILE_FAILURE);
  }
}

function hasCompilationErrors(output: any): boolean {
  return output.errors?.some((x: any) => x.severity === "error");
}

// TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT
// TESTED
/**
 * Receives a compilation job and returns a CompilerInput.
 *
 * It's not recommended to override this task to modify the solc
 * configuration, override
 * TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE instead.
 */
export async function taskCompileSolidityGetCompilerInput(
  compilationJob: taskTypes.CompilationJob,
): Promise<CompilerInput> {
  return getInputFromCompilationJob(compilationJob);
}

// TASK_COMPILE_SOLIDITY_GET_ARTIFACT_FROM_COMPILATION_OUTPUT
// TESTED
/**
 * Generates the artifact for contract `contractName` given its compilation
 * output.
 */
export async function taskCompileSolidityGetArtifactFromCompilationOutput(
  sourceName: string,
  contractName: string,
  contractOutput: any,
): Promise<any> {
  return getArtifactFromContractOutput(
    sourceName,
    contractName,
    contractOutput,
  );
}

// TASK_COMPILE_SOLIDITY_EMIT_ARTIFACTS
// TESTED
/**
 * Saves to disk the artifacts for a compilation job. These artifacts
 * include the main artifacts, the debug files, and the build info.
 */
export async function taskCompileSolidityEmitArtifacts(
  compilationJob: CompilationJob,
  input: CompilerInput,
  output: CompilerOutput,
  solcBuild: SolcBuild,
  artifacts: Artifacts,
): Promise<{
  artifactsEmittedPerFile: taskTypes.ArtifactsEmittedPerFile;
}> {
  const pathToBuildInfo = await artifacts.saveBuildInfo(
    compilationJob.getSolcConfig().version,
    solcBuild.longVersion,
    input,
    output,
  );

  const artifactsEmittedPerFile: taskTypes.ArtifactsEmittedPerFile =
    await Promise.all(
      compilationJob
        .getResolvedFiles()
        .filter((f) => compilationJob.emitsArtifacts(f))
        .map(async (file) => {
          const artifactsEmitted = await Promise.all(
            Object.entries(output.contracts?.[file.sourceName] ?? {}).map(
              async ([contractName, contractOutput]) => {
                log(`Emitting artifact for contract '${contractName}'`);

                const artifact =
                  await taskCompileSolidityGetArtifactFromCompilationOutput(
                    file.sourceName,
                    contractName,
                    contractOutput,
                  );

                await artifacts.saveArtifactAndDebugFile(
                  artifact,
                  pathToBuildInfo,
                );

                return artifact.contractName;
              },
            ),
          );

          return {
            file,
            artifactsEmitted,
          };
        }),
    );

  return { artifactsEmittedPerFile };
}

// TASK_COMPILE_SOLIDITY_COMPILE_JOB
// TESTED
/**
 * This is an orchestrator task that uses other subtasks to compile a
 * compilation job.
 */
export async function taskCompileSolidityCompileJob(
  compilationJob: CompilationJob,
  compilationJobs: CompilationJob[],
  compilationJobIndex: number,
  quiet: boolean,
  emitsArtifacts: boolean,
  artifacts: Artifacts,
) {
  log(`Compiling job with version '${compilationJob.getSolcConfig().version}'`);
  const input: CompilerInput =
    await taskCompileSolidityGetCompilerInput(compilationJob);

  const { output, solcBuild } = await taskCompileSolidityCompile(
    input,
    quiet,
    compilationJob.getSolcConfig().version,
    compilationJob,
    compilationJobs,
    compilationJobIndex,
  );

  await taskCompileSolidityCheckErrors(output, quiet);

  let artifactsEmittedPerFile: taskTypes.ArtifactsEmittedPerFile = [];
  if (emitsArtifacts) {
    artifactsEmittedPerFile = (
      await taskCompileSolidityEmitArtifacts(
        compilationJob,
        input,
        output,
        solcBuild,
        artifacts,
      )
    ).artifactsEmittedPerFile;
  }

  return {
    artifactsEmittedPerFile,
    compilationJob,
    input,
    output,
    solcBuild,
  };
}

// TASK_COMPILE_SOLIDITY_COMPILE_JOBS
// TESTED
/**
 * Receives a list of compilation jobs and sends each one to be compiled.
 */
export async function taskCompileSolidityCompileJobs(
  compilationJobs: CompilationJob[],
  artifacts: Artifacts,
  quiet: boolean,
  concurrency: number,
): Promise<{
  artifactsEmittedPerJob: ArtifactsEmittedPerJob;
}> {
  if (compilationJobs.length === 0) {
    log(`No compilation jobs to compile`);
    await taskCompileSolidityLogNothingToCompile(quiet);
    return { artifactsEmittedPerJob: [] };
  }

  log(`Compiling ${compilationJobs.length} jobs`);

  for (const job of compilationJobs) {
    const solcVersion = job.getSolcConfig().version;

    // versions older than 0.4.11 don't work with hardhat
    // see issue https://github.com/nomiclabs/hardhat/issues/2004
    if (semver.lt(solcVersion, COMPILE_TASK_FIRST_SOLC_VERSION_SUPPORTED)) {
      throw new HardhatError(
        ERRORS.BUILTIN_TASKS.COMPILE_TASK_UNSUPPORTED_SOLC_VERSION,
        {
          version: solcVersion,
          firstSupportedVersion: COMPILE_TASK_FIRST_SOLC_VERSION_SUPPORTED,
        },
      );
    }
  }

  const { default: pMap } = await import("p-map");
  const pMapOptions = { concurrency, stopOnError: false };
  try {
    const artifactsEmittedPerJob: ArtifactsEmittedPerJob = await pMap(
      compilationJobs,
      async (compilationJob, compilationJobIndex) => {
        const result = await taskCompileSolidityCompileJob(
          compilationJob,
          compilationJobs,
          compilationJobIndex,
          quiet,
          true, // TODO: emitsArtifacts
          artifacts,
        );

        return {
          compilationJob: result.compilationJob,
          artifactsEmittedPerFile: result.artifactsEmittedPerFile,
        };
      },
      pMapOptions,
    );

    return { artifactsEmittedPerJob };
  } catch (e) {
    if (!(e instanceof AggregateError)) {
      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw e;
    }

    for (const error of e) {
      if (
        !HardhatError.isHardhatErrorType(
          error,
          ERRORS.BUILTIN_TASKS.COMPILE_FAILURE,
        )
      ) {
        // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
        throw error;
      }
    }

    // error is an aggregate error, and all errors are compilation failures
    throw new HardhatError(ERRORS.BUILTIN_TASKS.COMPILE_FAILURE);
  }
}

// TASK_COMPILE_SOLIDITY_LOG_COMPILATION_RESULT
// TESTED
export async function taskCompileSolidityLogCompilationResult(
  compilationJobs: CompilationJob[],
  _quiet?: boolean, // TODO: keep unused?
) {
  let count = 0;
  const evmVersions = new Set<string>();
  const unknownEvmVersions = new Set<string>();

  for (const job of compilationJobs) {
    count += job
      .getResolvedFiles()
      .filter((file) => job.emitsArtifacts(file)).length;

    const solcVersion = job.getSolcConfig().version;
    const evmTarget =
      job.getSolcConfig().settings?.evmVersion ??
      getEvmVersionFromSolcVersion(solcVersion);

    if (evmTarget !== undefined) {
      evmVersions.add(evmTarget);
    } else {
      unknownEvmVersions.add(
        `unknown evm version for solc version ${solcVersion}`,
      );
    }
  }

  const targetVersionsList = Array.from(evmVersions)
    // Alphabetically sort evm versions. The unknown ones are added at the end
    .sort()
    .concat(Array.from(unknownEvmVersions).sort());

  if (count > 0) {
    console.log(
      `Compiled ${count} Solidity ${pluralize(
        count,
        "file",
      )} successfully (evm ${pluralize(
        targetVersionsList.length,
        "target",
        "targets",
      )}: ${targetVersionsList.join(", ")}).`,
    );
  }
}

// TASK_COMPILE_REMOVE_OBSOLETE_ARTIFACTS
// TESTED
export async function taskCompileRemoveObsoleteArtifacts(artifacts: Artifacts) {
  // We know this is the actual implementation, so we use some
  // non-public methods here.
  const artifactsImpl = artifacts as ArtifactsImpl;
  await artifactsImpl.removeObsoleteArtifacts();
}

// TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH
// TESTED
/**
 * Receives a list of source names and returns a dependency graph. This task
 * is responsible for both resolving dependencies (like getting files from
 * node_modules) and generating the graph.
 */
export async function taskCompileSolidityGetDependencyGraph(
  sourceNames: string[],
  config: BuildConfig,
  tasksOverrides?: TasksOverrides,
  rootPath?: string,
  solidityFilesCache?: SolidityFilesCache,
): Promise<taskTypes.DependencyGraph> {
  const parser = new Parser(solidityFilesCache);

  const remappings =
    tasksOverrides?.taskCompileGetRemappings !== undefined
      ? await tasksOverrides.taskCompileGetRemappings()
      : await taskCompileGetRemappings();

  const resolver = new Resolver(
    rootPath ?? config.paths.root,
    parser,
    remappings,
    (absolutePath: string) => taskCompileSolidityReadFile(absolutePath),
    (importName: string) => taskCompileTransformImportName(importName, true),
  );

  const resolvedFiles = await Promise.all(
    sourceNames.map((sn) => resolver.resolveSourceName(sn)),
  );

  return DependencyGraph.createFromResolvedFiles(resolver, resolvedFiles);
}

// TASK_COMPILE_TRANSFORM_IMPORT_NAME
// DEPRECATED
/**
 * DEPRECATED: This subtask is deprecated and will be removed in the future.
 *
 * This task transform the string literal in an import directive.
 * By default it does nothing, but it can be overriden by plugins.
 */
export async function taskCompileTransformImportName(
  importName: string,
  _deprecationCheck: boolean, // TODO: keep unused?
): Promise<string> {
  return importName;
}

// TASK_COMPILE_SOLIDITY
// TESTED
/**
 * Main task for compiling the solidity files in the project.
 *
 * The main responsibility of this task is to orchestrate and connect most of
 * the subtasks related to compiling solidity.
 */
export async function taskCompileSolidity(
  config: BuildConfig,
  artifacts: Artifacts,
  force: boolean,
  quiet: boolean,
  concurrency: number,
  tasksOverrides: TasksOverrides | undefined,
) {
  const rootPath = config.paths.root;

  const sourcePaths: string[] = await taskCompileSolidityGetSourcePaths(
    config,
    config.paths.sources,
  );

  const sourceNames: string[] = await taskCompileSolidityGetSourceNames(
    config,
    sourcePaths,
    rootPath,
  );

  const solidityFilesCachePath = getSolidityFilesCachePath(config.paths);
  let solidityFilesCache = await SolidityFilesCache.readFromFile(
    solidityFilesCachePath,
  );

  const dependencyGraph: taskTypes.DependencyGraph =
    await taskCompileSolidityGetDependencyGraph(
      sourceNames,
      config,
      tasksOverrides,
      rootPath,
      solidityFilesCache,
    );

  solidityFilesCache = await invalidateCacheMissingArtifacts(
    solidityFilesCache,
    artifacts,
    dependencyGraph.getResolvedFiles(),
  );

  const compilationJobsCreationResult: CompilationJobsCreationResult =
    await taskCompileSolidityGetCompilationJobs(
      config,
      dependencyGraph,
      solidityFilesCache,
    );

  await taskCompileSolidityHandleCompilationJobsFailures(
    compilationJobsCreationResult.errors,
  );

  const compilationJobs = compilationJobsCreationResult.jobs;

  const filteredCompilationJobs: CompilationJob[] =
    await taskCompileSolidityFilterCompilationJobs(
      compilationJobs,
      force,
      solidityFilesCache,
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
      concurrency,
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

  if (tasksOverrides?.taskCompileSolidityLogCompilationResult !== undefined) {
    await tasksOverrides.taskCompileSolidityLogCompilationResult(
      mergedCompilationJobs,
      quiet,
    );
  } else {
    await taskCompileSolidityLogCompilationResult(mergedCompilationJobs, quiet);
  }
}

/**
 * If a file is present in the cache, but some of its artifacts are missing on
 * disk, we remove it from the cache to force it to be recompiled.
 */
async function invalidateCacheMissingArtifacts(
  solidityFilesCache: SolidityFilesCache,
  artifacts: Artifacts,
  resolvedFiles: ResolvedFile[],
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
          `Invalidate cache for '${file.absolutePath}' because artifact '${fqn}' doesn't exist`,
        );

        solidityFilesCache.removeEntry(file.absolutePath);
        break;
      }
    }
  }

  artifacts.clearCache?.();

  return solidityFilesCache;
}
