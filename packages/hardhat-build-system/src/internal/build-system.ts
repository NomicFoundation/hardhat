import {
  Artifacts,
  CompilationJobCreationError,
  BuildConfig,
} from "./types/index";
import { Artifacts as ArtifactsImpl } from "./utils/artifacts";
import {
  TasksOverrides,
  taskCompileRemoveObsoleteArtifacts,
  taskCompileSolidity,
  taskCompileSolidityGetCompilationJobsFailureReasons,
  taskCompileSolidityReadFile,
} from "./tasks";

export interface BuildRequest {
  // TODO: should profile be defined in the hh-config and have a default value? Then it can be overridden when calling 'build'?
  // TODO: files are by default the ones in the folder 'contracts', but can be overridden when calling 'build'
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
    this._config = config; // TODO: can be optional? E.g.: not needed for method 'solidityReadFile'
  }

  public async build(buildRequest?: BuildRequest): Promise<BuildResult> {
    const artifacts =
      buildRequest?.artifacts ??
      new ArtifactsImpl(this._config.paths.artifacts);

    await taskCompileSolidity(
      this._config,
      artifacts,
      buildRequest?.force ?? false,
      buildRequest?.quiet ?? false,
      buildRequest?.concurrency ?? 1,
      buildRequest?.tasksOverrides ?? undefined,
    );

    await taskCompileRemoveObsoleteArtifacts(artifacts);

    return {};
  }

  // TODO: TASK_COMPILE_SOLIDITY_READ_FILE - naming? Do we want to keep it?
  public async solidityReadFile(absolutePath: string): Promise<string> {
    return taskCompileSolidityReadFile(absolutePath);
  }

  // TODO: TASK_COMPILE_SOLIDITY_READ_FILE - naming? Do we want to keep it?
  public async solidityGetCompilationJobsFailureReasons(
    errors: CompilationJobCreationError[],
  ) {
    return taskCompileSolidityGetCompilationJobsFailureReasons(errors);
  }
}
