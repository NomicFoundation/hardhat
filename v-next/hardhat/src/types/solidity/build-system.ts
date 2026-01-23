import type { CompilationJob } from "./compilation-job.js";
import type { CompilerOutput, CompilerOutputError } from "./compiler-io.js";
import type { Compiler } from "./compiler.js";
import type { SolidityBuildInfo } from "./solidity-artifacts.js";

/**
 * The options of the `build` method.
 */
export interface BuildOptions {
  /**
   * If `true`, it forces rebuilding every file, ignoring the compilation cache.
   */
  force?: boolean;

  /**
   * The build profile to use.
   *
   * Default: "default".
   */
  buildProfile?: string;

  /**
   * If `false`, this option allows the build process to merge compilation jobs
   * if they have the same compiler version and settings.
   *
   * This is an useful optimization to be used when compiling a large number of
   * files, but keep in mind that it can lead to unrelated files being compiled
   * together, block explorer verification processes trickier and/or with
   * unexpected results.
   */
  isolated?: boolean;

  /**
   * The number of concurrent compilation jobs to run.
   *
   * Default: The number of CPU cores - 1.
   */
  concurrency?: number;

  /**
   * If `true`, the build process doesn't print any output.
   */
  quiet?: boolean;

  /**
   * Whether to compile contracts or tests. Defaults to contracts
   */
  scope?: BuildScope;
}

/**
 * The options of the `getCompilationJobs` method.
 *
 * Note that this option object includes a `quiet` property, as this process
 * may require downloading compilers, and potentially printing some output.
 */
export type GetCompilationJobsOptions = Omit<
  BuildOptions,
  "removeUnusedArtifacts"
>;

/**
 * The options of the `runCompilationJob` method.
 */
export type RunCompilationJobOptions = Pick<
  BuildOptions,
  "quiet" | "buildProfile"
>;

/**
 * The options of the `compileBuildInfo` method.
 */
export interface CompileBuildInfoOptions {
  /**
   * If `true`, this option foces the build system to recompile the build info,
   * even if its output is cached.
   */
  force?: boolean;

  /**
   * If `true`, the compilation process doesn't print any output.
   */
  quiet?: boolean;
}

export enum CompilationJobCreationErrorReason {
  NO_COMPATIBLE_SOLC_VERSION_FOUND = "NO_COMPATIBLE_SOLC_VERSION_FOUND",
  NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT = "NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT",
  INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION = "INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION",
  IMPORT_OF_INCOMPATIBLE_FILE = "IMPORT_OF_INCOMPATIBLE_FILE",
}

export interface BaseCompilationJobCreationError {
  buildProfile: string;
  rootFilePath: string;
  formattedReason: string;
}

export interface CompilationJobCreationErrorNoCompatibleSolcVersionFound
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT;
}

export interface CompilationJobCreationErrorIncompatibleOverriddenSolcVersion
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION;
}

export interface CompilationJobCreationErrorIncompatibleOverriddenSolcVersion
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION;
}

export interface CompilationJobCreationErrorIportOfIncompatibleFile
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.IMPORT_OF_INCOMPATIBLE_FILE;
  // The path of absolute files imported, starting from the root, that take you
  // to the first file with an incompatible version pragma.
  incompatibleImportPath: string[];
}

export interface NoCompatibleSolcVersionFound
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND;
}

export type CompilationJobCreationError =
  | CompilationJobCreationErrorNoCompatibleSolcVersionFound
  | CompilationJobCreationErrorIportOfIncompatibleFile
  | CompilationJobCreationErrorIncompatibleOverriddenSolcVersion
  | NoCompatibleSolcVersionFound;

/**
 * The restult of building a file.
 */
export enum FileBuildResultType {
  CACHE_HIT = "CACHE_HIT",
  BUILD_SUCCESS = "BUILD_SUCCESS",
  BUILD_FAILURE = "BUILD_FAILURE",
}

export type FileBuildResult =
  | CacheHitFileBuildResult
  | SuccessfulFileBuildResult
  | FailedFileBuildResult;

export interface CacheHitFileBuildResult {
  type: FileBuildResultType.CACHE_HIT;
  compilationJob: CompilationJob;
  contractArtifactsGenerated: string[];
  warnings: CompilerOutputError[];
}

export interface SuccessfulFileBuildResult {
  type: FileBuildResultType.BUILD_SUCCESS;
  compilationJob: CompilationJob;
  contractArtifactsGenerated: string[];
  warnings: CompilerOutputError[];
}

export interface FailedFileBuildResult {
  type: FileBuildResultType.BUILD_FAILURE;
  compilationJob: CompilationJob;
  errors: CompilerOutputError[];
}

export interface GetCompilationJobsResult {
  compilationJobsPerFile: Map<string, CompilationJob>;
  indexedIndividualJobs: Map<string, CompilationJob>;
}

export interface EmitArtifactsResult {
  artifactsPerFile: ReadonlyMap<string, string[]>;
  buildInfoPath: string;
  typeFilePaths: ReadonlyMap<string, string>;
  buildInfoOutputPath: string;
}

/**
 * Result object for the `runCompilationJob` method
 */
export interface RunCompilationJobResult {
  output: CompilerOutput;
  compiler: Compiler;
}

/**
 * The Solidity build system.
 */
export interface SolidityBuildSystem {
  /**
   * Returns all the root files of the project.
   *
   * The root files are either absolute paths or
   * `npm:<package-name>/<file-path>` URIs.
   *
   * @returns An array of root file paths.
   */
  getRootFilePaths(options?: { scope?: BuildScope }): Promise<string[]>;

  /**
   * Given the filesystem path for a source file, returns the build scope
   */
  getScope(fsPath: string): Promise<BuildScope>;

  /**
   * Builds the provided files, generating their compilation artifacts.
   *
   * @param rootFilePaths The files to build, which can be either absolute paths
   * or `npm:<package-name>/<file-path>` URIs.
   * @param options The options to use when building the files.
   * @returns An `Map` of the files to their build results, or an error if
   * there was a problem when trying to create the necessary compilation jobs.
   */
  build(
    rootFilePaths: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>>;

  /**
   * Returns the CompilationJobs that would be used to build the provided files.
   *
   * Note that if `options.mergeCompilationJobs` is true, the same instance of
   * can be returned for multiple files, so you should deduplicate the results
   * before using them.
   *
   * @param rootFilePaths The files to analyze, which can be either absolute
   * paths or `npm:<package-name>/<file-path>` URIs.
   * @param options The options to use when analyzing the files.
   * @returns A `Map` of the files to their compilation jobs, or an error if
   * there was a problem when trying to create them.
   */
  getCompilationJobs(
    rootFilePaths: string[],
    options?: GetCompilationJobsOptions,
  ): Promise<CompilationJobCreationError | GetCompilationJobsResult>;

  /**
   * Returns the output of running the given compilation job.
   *
   * Note that this method returns the compiler output verbatim, as `solc`
   * returns it. This means that any error message or location will use input
   * source names, and not fs paths. To transform the paths to fs paths, use
   * the `remapCompilerError` method.
   *
   * @param compilationJob The compilation job to run.
   * @param options The options to use when running the compilation job.
   * @returns The output of the compilation, as returned by `solc`.
   */
  runCompilationJob(
    compilationJob: CompilationJob,
    options?: RunCompilationJobOptions,
  ): Promise<RunCompilationJobResult>;

  /**
   * Remaps the given compiler error paths from input source names to fs paths.
   *
   * @param compilationJob The compilation job where the error occurred.
   * @param error The compiler error to remap.
   * @param shouldShortenPaths If `true`, the paths will be shortened to their
   * relative path from the CWD, if that results in a shorter path.
   */
  remapCompilerError(
    compilationJob: CompilationJob,
    error: CompilerOutputError,
    shouldShortenPaths?: boolean,
  ): Promise<CompilerOutputError>;

  /**
   * Emits the artifacts of the given compilation job.
   *
   * @param compilationJob The compilation job to emit the artifacts of.
   * @param compilerOutput The result of running the compilation job.
   * @returns A map from user source name to the absolute paths of the
   * artifacts that were emitted for it.
   */
  emitArtifacts(
    compilationJob: CompilationJob,
    compilerOutput: CompilerOutput,
    options?: { scope?: BuildScope },
  ): Promise<EmitArtifactsResult>;

  /**
   * Analyzes the project and cleans up the artifacts by:
   *  - Removing any existing artifact of non-existent contracts.
   *  - Removing any unreachable build info and build info output files.
   *  - Overloading the `ArtifactMap` entries for repeated contract names so
   *    so that they map to `never`.
   *
   * This method should only be used after a complete build has succeeded, as
   * it relies on the build system to have generated all the necessary artifact
   * files.

   * @param rootFilePaths All the root files of the project.
   */
  cleanupArtifacts(
    rootFilePaths: string[],
    options?: { scope?: BuildScope },
  ): Promise<void>;

  /**
   * Compiles a build info, returning the output of the compilation, verbatim,
   * as `solc` returns it.
   *
   * This method doesn't call the hooks that the rest of the build system do.
   * It's intended to be a lower-level primitive used by plugins and advanced
   * users.
   *
   * @param buildInfo The build info to compile.
   * @param options The options to use when compiling the build info.
   * @returns The output of the compilation.
   */
  compileBuildInfo(
    buildInfo: SolidityBuildInfo,
    options?: CompileBuildInfoOptions,
  ): Promise<CompilerOutput>;

  /**
   * Gets the artifacts directory for a given target (contracts/tests)
   */
  getArtifactsDirectory(scope: BuildScope): Promise<string>;
}

export type BuildScope = "contracts" | "tests";
