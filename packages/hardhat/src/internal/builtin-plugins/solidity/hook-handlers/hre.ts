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
  RunCompilationJobResult,
  SolidityBuildSystem,
  BuildScope,
} from "../../../../types/solidity/build-system.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type {
  CompilerOutput,
  CompilerOutputError,
} from "../../../../types/solidity/compiler-io.js";
import type { SolidityBuildInfo } from "../../../../types/solidity.js";
import type {
  SolidityBuildSystemOptions,
  SolidityBuildSystemImplementation as SolidityBuildSystemImplementationT,
} from "../build-system/build-system.js";
import type { RustSolidityBuildSystem as RustSolidityBuildSystemT } from "@nomicfoundation/hardhat-solidity-build-system";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";

const log = createDebug("hardhat:core:solidity:build-system");

let SolidityBuildSystemImplementation:
  typeof SolidityBuildSystemImplementationT | undefined;

let RustSolidityBuildSystem: typeof RustSolidityBuildSystemT | undefined;

class LazySolidityBuildSystem implements SolidityBuildSystem {
  readonly #hooks: HookManager;
  readonly #options: SolidityBuildSystemOptions;
  readonly #rust: RustBuildSystemContext;

  #buildSystem: SolidityBuildSystem | undefined;
  #useRust: boolean | undefined;

  constructor(
    hooks: HookManager,
    options: SolidityBuildSystemOptions,
    rust: RustBuildSystemContext,
  ) {
    this.#hooks = hooks;
    this.#options = options;
    this.#rust = rust;
  }

  public async getRootFilePaths(
    options: { scope?: BuildScope } = {},
  ): Promise<string[]> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.getRootFilePaths(options);
  }

  public async getScope(fsPath: string): Promise<BuildScope> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.getScope(fsPath);
  }

  public isSuccessfulBuildResult(
    buildResult: CompilationJobCreationError | Map<string, FileBuildResult>,
  ): buildResult is Map<string, FileBuildResult> {
    // Note: This duplicates the logic of the actual implementation because it's
    // a synchronous method, so we can't import the implementation.
    return buildResult instanceof Map;
  }

  public async build(
    rootFiles: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.build(rootFiles, options);
  }

  public async getCompilationJobs(
    rootFiles: string[],
    options?: GetCompilationJobsOptions,
  ): Promise<CompilationJobCreationError | GetCompilationJobsResult> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.getCompilationJobs(rootFiles, options);
  }

  public async runCompilationJob(
    compilationJob: CompilationJob,
    options?: RunCompilationJobOptions,
  ): Promise<RunCompilationJobResult> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.runCompilationJob(compilationJob, options);
  }

  public async remapCompilerError(
    compilationJob: CompilationJob,
    error: CompilerOutputError,
    shouldShortenPaths?: boolean,
  ): Promise<CompilerOutputError> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.remapCompilerError(
      compilationJob,
      error,
      shouldShortenPaths,
    );
  }

  public async emitArtifacts(
    compilationJob: CompilationJob,
    compilerOutput: CompilerOutput,
    options: { scope?: BuildScope } = {},
  ): Promise<EmitArtifactsResult> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.emitArtifacts(
      compilationJob,
      compilerOutput,
      options,
    );
  }

  public async cleanupArtifacts(
    rootFilePaths: string[],
    options: { scope?: BuildScope } = {},
  ): Promise<string[]> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.cleanupArtifacts(rootFilePaths, options);
  }

  public async compileBuildInfo(
    buildInfo: SolidityBuildInfo,
    options?: CompileBuildInfoOptions,
  ): Promise<CompilerOutput> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.compileBuildInfo(buildInfo, options);
  }

  public async getArtifactsDirectory(scope: BuildScope): Promise<string> {
    const buildSystem = await this.#getBuildSystem();
    return await buildSystem.getArtifactsDirectory(scope);
  }

  async #getBuildSystem(): Promise<SolidityBuildSystem> {
    const useRust = (this.#useRust ??= await this.#decideUseRust());

    // NOTE: Every await has to happen before the instance is looked at, so that
    // two callers racing here can't each construct one.
    if (useRust) {
      if (RustSolidityBuildSystem === undefined) {
        const portModule =
          await import("@nomicfoundation/hardhat-solidity-build-system");
        RustSolidityBuildSystem = portModule.RustSolidityBuildSystem;
      }
    } else if (SolidityBuildSystemImplementation === undefined) {
      const buildSystemModule = await import("../build-system/build-system.js");
      SolidityBuildSystemImplementation =
        buildSystemModule.SolidityBuildSystemImplementation;
    }

    const integration = useRust ? await this.#rustIntegration() : undefined;

    if (this.#buildSystem === undefined) {
      if (useRust) {
        assertHardhatInvariant(
          RustSolidityBuildSystem !== undefined && integration !== undefined,
          "The Rust build system and its integration were just resolved",
        );

        this.#buildSystem = new RustSolidityBuildSystem(
          { ...this.#options, hardhatVersion: this.#rust.hardhatVersion },
          integration,
        );
      } else {
        assertHardhatInvariant(
          SolidityBuildSystemImplementation !== undefined,
          "The TypeScript build system was just resolved",
        );

        this.#buildSystem = new SolidityBuildSystemImplementation(
          this.#hooks,
          this.#options,
        );
      }
    }

    return this.#buildSystem;
  }

  async #rustIntegration() {
    const { rustIntegrationFor } =
      await import("../build-system/rust-integration.js");

    return rustIntegrationFor(this.#hooks, this.#options);
  }

  /**
   * Whether this build runs on the Rust port.
   *
   * Answered at first use and retained for this runtime. Querying the hook
   * manager includes remappings handlers registered dynamically before that
   * first use. Later registrations do not switch an existing build system.
   */
  async #decideUseRust(): Promise<boolean> {
    const { decideBuildSystemImplementation } =
      await import("@nomicfoundation/hardhat-solidity-build-system");
    const decision = decideBuildSystemImplementation({
      flagEnabled: this.#rust.flagEnabled,
      coverage: this.#options.coverage,
      solidityConfig: this.#options.solidityConfig,
      hasNpmPackageRemappingsHandler:
        this.#rust.flagEnabled &&
        (await this.#hooks.hasHandlers("solidity", "readNpmPackageRemappings")),
    });

    if (!decision.useRustPort) {
      log(`Using the TypeScript build system: ${decision.reason}`);
    } else {
      log("Using the Rust build system");
    }

    return decision.useRustPort;
  }
}

/**
 * What deciding between the two implementations needs, which is read off the
 * environment when it's created rather than later: a build system is
 * constructed from a hook handler, and the environment is what has the global
 * options and the plugin list.
 */
interface RustBuildSystemContext {
  flagEnabled: boolean;

  /**
   * Hardhat's version, which a profile that records the tool versions puts in
   * every Build Info. It isn't part of `SolidityBuildSystemOptions` because
   * the TypeScript implementation reads it from its own package, and the port
   * isn't Hardhat.
   */
  hardhatVersion: string;
}

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  return {
    created: async (context, hre) => {
      hre.solidity = new LazySolidityBuildSystem(
        hre.hooks,
        {
          solidityConfig: hre.config.solidity,
          projectRoot: hre.config.paths.root,
          soliditySourcesPaths: hre.config.paths.sources.solidity,
          artifactsPath: hre.config.paths.artifacts,
          cachePath: hre.config.paths.cache,
          solidityTestsPath: hre.config.paths.tests.solidity,
          coverage: context.globalOptions.coverage,
        },
        {
          flagEnabled: context.globalOptions.rustBuildSystem,
          hardhatVersion: hre.versions.hardhat,
        },
      );
    },
  };
};
