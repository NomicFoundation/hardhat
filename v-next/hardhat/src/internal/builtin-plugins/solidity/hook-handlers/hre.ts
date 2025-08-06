import type {
  HardhatRuntimeEnvironmentHooks,
  HookManager,
} from "../../../../types/hooks.js";
import type {
  BuildOptions,
  CompilationJobCreationError,
  CompileBuildInfoOptions,
  EmitArtifactsResult,
  FileBuildResult,
  GetCompilationJobsOptions,
  GetCompilationJobsResult,
  RunCompilationJobOptions,
  SolidityBuildSystem,
} from "../../../../types/solidity/build-system.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type {
  CompilerOutput,
  CompilerOutputError,
} from "../../../../types/solidity/compiler-io.js";
import type { SolidityBuildInfo } from "../../../../types/solidity.js";
import type { SolidityBuildSystemOptions } from "../build-system/build-system.js";

class LazySolidityBuildSystem implements SolidityBuildSystem {
  readonly #hooks: HookManager;
  readonly #options: SolidityBuildSystemOptions;

  #buildSystem: SolidityBuildSystem | undefined;

  constructor(hooks: HookManager, options: SolidityBuildSystemOptions) {
    this.#hooks = hooks;
    this.#options = options;
  }

  public async getRootFilePaths(): Promise<string[]> {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.getRootFilePaths();
  }

  public async build(
    rootFiles: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>> {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.build(rootFiles, options);
  }

  public async getCompilationJobs(
    rootFiles: string[],
    options?: GetCompilationJobsOptions,
  ): Promise<CompilationJobCreationError | GetCompilationJobsResult> {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.getCompilationJobs(rootFiles, options);
  }

  public async runCompilationJob(
    compilationJob: CompilationJob,
    options?: RunCompilationJobOptions,
  ): Promise<CompilerOutput> {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.runCompilationJob(compilationJob, options);
  }

  public async remapCompilerError(
    compilationJob: CompilationJob,
    error: CompilerOutputError,
    shouldShortenPaths?: boolean,
  ): Promise<CompilerOutputError> {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.remapCompilerError(
      compilationJob,
      error,
      shouldShortenPaths,
    );
  }

  public async emitArtifacts(
    compilationJob: CompilationJob,
    compilerOutput: CompilerOutput,
  ): Promise<EmitArtifactsResult> {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.emitArtifacts(compilationJob, compilerOutput);
  }

  public async cleanupArtifacts(rootFilePaths: string[]): Promise<void> {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.cleanupArtifacts(rootFilePaths);
  }

  public async compileBuildInfo(
    buildInfo: SolidityBuildInfo,
    options?: CompileBuildInfoOptions,
  ): Promise<CompilerOutput> {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.compileBuildInfo(buildInfo, options);
  }

  async #getBuildSystem(): Promise<SolidityBuildSystem> {
    const { SolidityBuildSystemImplementation } = await import(
      "../build-system/build-system.js"
    );

    if (this.#buildSystem === undefined) {
      this.#buildSystem = new SolidityBuildSystemImplementation(
        this.#hooks,
        this.#options,
      );
    }

    return this.#buildSystem;
  }
}

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  return {
    created: async (_context, hre) => {
      hre.solidity = new LazySolidityBuildSystem(hre.hooks, {
        solidityConfig: hre.config.solidity,
        projectRoot: hre.config.paths.root,
        soliditySourcesPaths: hre.config.paths.sources.solidity,
        artifactsPath: hre.config.paths.artifacts,
        cachePath: hre.config.paths.cache,
        solidityTestsPath: hre.config.paths.tests.solidity,
      });
    },
  };
};
