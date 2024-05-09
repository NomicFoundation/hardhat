import {
  Artifacts,
  CompilationJobCreationError,
  BuildConfig,
} from "./types/index.js";
import { Artifacts as ArtifactsImpl } from "./utils/artifacts.js";
import {
  TasksOverrides,
  taskCompileRemoveObsoleteArtifacts,
  taskCompileSolidity,
  taskCompileSolidityGetCompilationJobsFailureReasons,
  taskCompileSolidityGetDependencyGraph,
  taskCompileSolidityGetSourceNames,
  taskCompileSolidityGetSourcePaths,
  taskCompileSolidityReadFile,
} from "./tasks.js";

export interface BuildRequest {
  // TODO: should build profiles be defined in the hh-config and have a default value? Then it can be overridden when calling 'build'?
  // TODO: files are by default the ones in the folder 'contracts'? But can be overridden when calling 'build'?
  profile?: string;
  type?: string;
  files?: string[];
  //
  // config: BuildConfig;
  artifacts?: Artifacts;
  force?: boolean;
  quiet?: boolean;
  concurrency?: number;
  tasksOverrides?: TasksOverrides;
}

interface BuildResult {
  result?: any; // TODO
}

export class BuildSystem {
  private _config: BuildConfig;

  constructor(config: BuildConfig) {
    this._config = config; // TODO: can be optional? E.g.: it's not needed for method 'solidityReadFile'
    // TODO: clone the config?
  }

  public async build(buildRequest?: BuildRequest): Promise<BuildResult> {
    // TODO: how to handle artifacts? Should they be passed as a parameter or should they be created here? Or both?
    const artifacts =
      buildRequest?.artifacts ??
      new ArtifactsImpl(this._config.paths.artifacts);

    await taskCompileSolidity(
      this._config, // TODO: should it be passed as a parameter and override default values?
      artifacts,
      buildRequest?.force ?? false,
      buildRequest?.quiet ?? false,
      buildRequest?.concurrency ?? 1, // TODO: default value?
      buildRequest?.tasksOverrides ?? undefined,
    );

    await taskCompileRemoveObsoleteArtifacts(artifacts);

    return {};
  }

  // TODO: TASK_COMPILE_SOLIDITY_READ_FILE - naming? Do we want to keep it?
  public async solidityReadFile(absolutePath: string): Promise<string> {
    return taskCompileSolidityReadFile(absolutePath);
  }

  // TODO: TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS - naming? Do we want to keep it?
  public async solidityGetCompilationJobsFailureReasons(
    errors: CompilationJobCreationError[],
  ) {
    return taskCompileSolidityGetCompilationJobsFailureReasons(errors);
  }

  // TODO: the following methods are used to make the hh-core tests for the FLATTEN task pass
  // TODO: TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH
  public async solidityGetDependencyGraph(
    sourceNames: string[],
    config: BuildConfig,
  ) {
    return taskCompileSolidityGetDependencyGraph(sourceNames, config);
  }

  // TODO: TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS
  public async solidityGetSourcePaths(
    sourcePath: string | undefined,
  ): Promise<string[]> {
    return taskCompileSolidityGetSourcePaths(this._config, sourcePath);
  }

  // TODO: TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES
  public async solidityGetSourceNames(
    sourcePaths: string[],
    rootPath?: string | undefined,
  ): Promise<string[]> {
    return taskCompileSolidityGetSourceNames(
      this._config,
      sourcePaths,
      rootPath,
    );
  }
}
