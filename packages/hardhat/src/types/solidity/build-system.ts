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
   * Whether to compile contracts or tests. Defaults to contracts.
   *
   * When `solidity.splitTestsCompilation` is `false` (the default), only
   * `"contracts"` is accepted.
   *
   * When `solidity.splitTestsCompilation` is `true`, both scopes are valid
   * and produce separate compilation passes.
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
   * If `true`, this option forces the build system to recompile the build info,
   * even if its output is cached.
   */
  force?: boolean;

  /**
   * If `true`, the compilation process doesn't print any output.
   */
  quiet?: boolean;
}

export enum CompilationJobCreationErrorReason {
  /**
   * The root file's own pragmas are incompatible with all configured compilers.
   */
  NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT = "NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT",

  /**
   * A dependency's own pragmas are incompatible with all configured compilers.
   */
  NO_COMPATIBLE_SOLC_VERSION_WITH_DEPENDENCY = "NO_COMPATIBLE_SOLC_VERSION_WITH_DEPENDENCY",

  /**
   * Root and a transitive import path have contradictory pragmas (invalid range / empty intersection).
   */
  IMPORT_OF_INCOMPATIBLE_FILE = "IMPORT_OF_INCOMPATIBLE_FILE",

  /**
   * Root and a transitive import path have a valid range but no configured compiler satisfies it.
   */
  NO_COMPATIBLE_SOLC_VERSION_FOR_TRANSITIVE_IMPORT_PATH = "NO_COMPATIBLE_SOLC_VERSION_FOR_TRANSITIVE_IMPORT_PATH",

  /**
   * The override version doesn't satisfy the root file's own pragmas.
   */
  INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION = "INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION",

  /**
   * A dependency's pragmas are incompatible with the override version.
   */
  OVERRIDDEN_SOLC_VERSION_INCOMPATIBLE_WITH_DEPENDENCY = "OVERRIDDEN_SOLC_VERSION_INCOMPATIBLE_WITH_DEPENDENCY",

  /**
   * Generic fallback — no single compiler works for root + all dependencies.
   */
  NO_COMPATIBLE_SOLC_VERSION_FOUND = "NO_COMPATIBLE_SOLC_VERSION_FOUND",
}

export interface BaseCompilationJobCreationError {
  success: false;
  buildProfile: string;
  rootFilePath: string;
  formattedReason: string;
}

export interface CompilationJobCreationErrorNoCompatibleSolcVersionWithRoot
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT;
}

export interface CompilationJobCreationErrorNoCompatibleSolcVersionWithDependency
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_DEPENDENCY;
  incompatibleImportPath: string[];
}

export interface CompilationJobCreationErrorImportOfIncompatibleFile
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.IMPORT_OF_INCOMPATIBLE_FILE;
  incompatibleImportPath: string[];
}

export interface CompilationJobCreationErrorNoCompatibleSolcVersionForTransitiveImportPath
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOR_TRANSITIVE_IMPORT_PATH;
  incompatibleImportPath: string[];
}

export interface CompilationJobCreationErrorIncompatibleOverriddenSolcVersion
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION;
}

export interface CompilationJobCreationErrorOverriddenSolcVersionIncompatibleWithDependency
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.OVERRIDDEN_SOLC_VERSION_INCOMPATIBLE_WITH_DEPENDENCY;
  incompatibleImportPath: string[];
}

export interface CompilationJobCreationErrorNoCompatibleSolcVersionFound
  extends BaseCompilationJobCreationError {
  reason: CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND;
}

export type CompilationJobCreationError =
  | CompilationJobCreationErrorNoCompatibleSolcVersionWithRoot
  | CompilationJobCreationErrorNoCompatibleSolcVersionWithDependency
  | CompilationJobCreationErrorImportOfIncompatibleFile
  | CompilationJobCreationErrorNoCompatibleSolcVersionForTransitiveImportPath
  | CompilationJobCreationErrorIncompatibleOverriddenSolcVersion
  | CompilationJobCreationErrorOverriddenSolcVersionIncompatibleWithDependency
  | CompilationJobCreationErrorNoCompatibleSolcVersionFound;

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
  buildId: string;
  contractArtifactsGenerated: string[];
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

export interface CacheHitInfo {
  buildId: string;
  artifactPaths: string[];
}

/**
 * The result of calling `getCompilationJobs`.
 *
 * The keys in the maps of this interface are Root File Paths, which means either absolute paths or `npm:<package>/<file>` URIs.
 */
export interface GetCompilationJobsResult {
  /**
   * A flag to distinguish between a successful and a failed result.
   */
  success: true;

  /**
   * Map from root file path to compilation job for files that need compilation.
   */
  compilationJobsPerFile: Map<string, CompilationJob>;
  /**
   * Map from root file path to individual (non-merged) compilation job.
   */
  indexedIndividualJobs: Map<string, CompilationJob>;
  /**
   * Map from root file path to cache hit info for files that don't need recompilation.
   */
  cacheHits: Map<string, CacheHitInfo>;
}

/**
 * The result of emitting artifacts for a compilation job.
 */
export interface EmitArtifactsResult {
  /**
   * Map from root file path to artifact file paths.
   */
  artifactsPerFile: ReadonlyMap<string, string[]>;
  buildInfoPath: string;
  /**
   * Map from root file path to type declaration file path.
   */
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
   * When `solidity.splitTestsCompilation` is `false`, contracts and tests are
   * compiled together and `scope: "contracts"` returns every build root:
   * contract roots, test roots, and `npmFilesToBuild` roots.
   *
   * Calling this method with `scope: "tests"` in this mode is a logic error and
   * throws a `HardhatError`.
   *
   * When `solidity.splitTestsCompilation` is `true`, `scope: "contracts"`
   * returns only contract roots and `scope: "tests"` returns only test roots.
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
   * When `solidity.splitTestsCompilation` is `false`, this method rejects
   * `scope: "tests"` as a logic error and throws a `HardhatError`
   *
   * In this mode, callers must use `scope: "contracts"` and contracts and tests
   * are built together, emitting their artifacts into the same directory.
   *
   * When `solidity.splitTestsCompilation` is `true`, both scopes are valid
   * and are built into separate artifact directories.
   *
   * @param rootFilePaths The files to build, which can be either absolute paths
   * or `npm:<package-name>/<file-path>` URIs.
   * @param options The options to use when building the files.
   * @returns An `Map` of the files to their build results, or an error if
   * there was a problem when trying to create the necessary compilation jobs.
   * @see `isSuccessfulBuildResult` to check if the build result is successful.
   */
  build(
    rootFilePaths: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>>;

  /**
   * Returns true if the given build result is successful.
   *
   * @param buildResult Result of the `build` method.
   * @returns True if the build result is successful.
   */
  isSuccessfulBuildResult(
    buildResult: CompilationJobCreationError | Map<string, FileBuildResult>,
  ): buildResult is Map<string, FileBuildResult>;

  /**
   * Returns the CompilationJobs that would be used to build the provided files.
   *
   * Note that if `options.mergeCompilationJobs` is true, the same instance of
   * can be returned for multiple files, so you should deduplicate the results
   * before using them.
   *
   * When `solidity.splitTestsCompilation` is `false`, this method rejects
   * `scope: "tests"` as a logic error and throws a `HardhatError`.
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
   * When `solidity.splitTestsCompilation` is `false`, this method rejects
   * `scope: "tests"` as a logic error and throws a `HardhatError`
   *
   * Artifacts for both contracts and tests are emitted under the main artifacts
   * directory when built with `scope: "contracts"` and `splitTestsCompilation`
   * `false`.
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
   *
   * When `solidity.splitTestsCompilation` is `false`, this method rejects
   * `scope: "tests"` as a logic error and throws a `HardhatError`. Cleanup in
   * this mode operates on the main artifacts directory using `scope:
   * "contracts"`.
   *
   * What is considered a complete build changes according to
   * `splitTestsCompilation`:
   *  - When it's `true`
   *    - A full "contracts" build is run when `--no-contracts` isn't used, and
   *      no explicit contract `files` are provided (i.e. you can still provide
   *      explicit test `files`).
   *    - A full "tests" build is run when `--no-tests` isn't used, and no
   *      explicit test files `files` are provided (i.e. you can still provide
   *      explicit contract `files`)
   *  - When it's `false`
   *    - A full build is when `files`, `--no-contracts`, nor `--no-tests` are
   *      used.
   *
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
   * Gets the artifacts directory for a given target (contracts/tests).
   *
   * When `solidity.splitTestsCompilation` is `false`, both scopes return the
   * main artifacts directory, because contracts and tests share it.
   *
   * Unlike the other scope-aware methods, this one does not throw on that mode,
   * as it's a read-only method that can be helpful for plugins.
   *
   * When `solidity.splitTestsCompilation` is `true`, `scope: "contracts"`
   * returns the main artifacts directory and `scope: "tests"` returns a
   * separate test-artifacts directory under the cache path.
   */
  getArtifactsDirectory(scope: BuildScope): Promise<string>;
}

export type BuildScope = "contracts" | "tests";
