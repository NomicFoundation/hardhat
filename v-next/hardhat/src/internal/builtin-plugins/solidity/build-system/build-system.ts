import type { CompileCache } from "./cache.js";
import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Artifact } from "../../../../types/artifacts.js";
import type { SolcConfig, SolidityConfig } from "../../../../types/config.js";
import type { HookManager } from "../../../../types/hooks.js";
import type {
  SolidityBuildSystem,
  BuildOptions,
  CompilationJobCreationError,
  FileBuildResult,
  GetCompilationJobsOptions,
  CompileBuildInfoOptions,
  RunCompilationJobOptions,
  GetCompilationJobsResult,
  EmitArtifactsResult,
} from "../../../../types/solidity/build-system.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type {
  CompilerOutput,
  CompilerOutputError,
} from "../../../../types/solidity/compiler-io.js";
import type { SolidityBuildInfo } from "../../../../types/solidity.js";

import os from "node:os";
import path from "node:path";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  exists,
  getAllDirectoriesMatching,
  getAllFilesMatching,
  readJsonFile,
  remove,
  writeJsonFile,
  writeJsonFileAsStream,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { shortenPath } from "@nomicfoundation/hardhat-utils/path";
import { pluralize } from "@nomicfoundation/hardhat-utils/string";
import chalk from "chalk";
import debug from "debug";
import pMap from "p-map";

import { FileBuildResultType } from "../../../../types/solidity/build-system.js";
import {
  DEFAULT_BUILD_PROFILE,
  shouldMergeCompilationJobs,
} from "../build-profiles.js";

import {
  getArtifactsDeclarationFile,
  getBuildInfo,
  getBuildInfoOutput,
  getContractArtifact,
  getDuplicatedContractNamesDeclarationFile,
} from "./artifacts.js";
import { loadCache, saveCache } from "./cache.js";
import { CompilationJobImplementation } from "./compilation-job.js";
import { downloadConfiguredCompilers, getCompiler } from "./compiler/index.js";
import { buildDependencyGraph } from "./dependency-graph-building.js";
import { readSourceFileFactory } from "./read-source-file.js";
import {
  formatRootPath,
  isNpmParsedRootPath,
  npmModuleToNpmRootPath,
  parseRootPath,
} from "./root-paths-utils.js";
import { SolcConfigSelector } from "./solc-config-selection.js";

const log = debug("hardhat:core:solidity:build-system");

interface CompilationResult {
  compilationJob: CompilationJob;
  compilerOutput: CompilerOutput;
  cached: boolean;
}

export interface SolidityBuildSystemOptions {
  readonly solidityConfig: SolidityConfig;
  readonly projectRoot: string;
  readonly soliditySourcesPaths: string[];
  readonly artifactsPath: string;
  readonly cachePath: string;
}

export class SolidityBuildSystemImplementation implements SolidityBuildSystem {
  readonly #hooks: HookManager;
  readonly #options: SolidityBuildSystemOptions;
  #compileCache: CompileCache = {};
  readonly #defaultConcurrency = Math.max(os.cpus().length - 1, 1);
  #downloadedCompilers = false;

  constructor(hooks: HookManager, options: SolidityBuildSystemOptions) {
    this.#hooks = hooks;
    this.#options = options;
  }

  public async getRootFilePaths(): Promise<string[]> {
    const localFilesToCompile = (
      await Promise.all(
        this.#options.soliditySourcesPaths.map((dir) =>
          getAllFilesMatching(
            dir,
            (f) => f.endsWith(".sol") && !f.endsWith(".t.sol"),
          ),
        ),
      )
    ).flat(1);

    const npmFilesToBuild = this.#options.solidityConfig.npmFilesToBuild.map(
      npmModuleToNpmRootPath,
    );

    return [...localFilesToCompile, ...npmFilesToBuild];
  }

  public async build(
    rootFilePaths: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>> {
    if (options?.quiet !== true) {
      console.log("Compiling your Solidity contracts");
    }

    await this.#downloadConfiguredCompilers(options?.quiet);

    const compilationJobsResult = await this.getCompilationJobs(
      rootFilePaths,
      options,
    );

    if ("reason" in compilationJobsResult) {
      return compilationJobsResult;
    }

    const { compilationJobsPerFile, indexedIndividualJobs } =
      compilationJobsResult;

    const compilationJobs = [...new Set(compilationJobsPerFile.values())];

    // NOTE: We precompute the build ids in parallel here, which are cached
    // internally in each compilation job
    await Promise.all(
      compilationJobs.map(async (compilationJob) =>
        compilationJob.getBuildId(),
      ),
    );

    const runCompilationJobOptions: RunCompilationJobOptions = {
      quiet: options?.quiet,
    };
    const results: CompilationResult[] = await pMap(
      compilationJobs,
      async (compilationJob) => {
        const compilerOutput = await this.runCompilationJob(
          compilationJob,
          runCompilationJobOptions,
        );

        return {
          compilationJob,
          compilerOutput,
          cached: false,
        };
      },
      {
        concurrency: options?.concurrency ?? this.#defaultConcurrency,
        // An error when running the compiler is not a compilation failure, but
        // a fatal failure trying to run it, so we just throw on the first error
        stopOnError: true,
      },
    );

    const uncachedResults = results.filter((result) => !result.cached);
    const uncachedSuccessfulResults = uncachedResults.filter(
      (result) => !this.#hasCompilationErrors(result.compilerOutput),
    );

    const isSuccessfulBuild =
      uncachedResults.length === uncachedSuccessfulResults.length;

    const contractArtifactsGeneratedByCompilationJob: Map<
      CompilationJob,
      ReadonlyMap<string, string[]>
    > = new Map();

    if (isSuccessfulBuild) {
      log("Emitting artifacts of successful build");
      await Promise.all(
        results.map(async (compilationResult) => {
          const emitArtifactsResult = await this.emitArtifacts(
            compilationResult.compilationJob,
            compilationResult.compilerOutput,
          );

          const { artifactsPerFile } = emitArtifactsResult;

          contractArtifactsGeneratedByCompilationJob.set(
            compilationResult.compilationJob,
            artifactsPerFile,
          );

          // Cache the results
          await this.#cacheCompilationResult(
            indexedIndividualJobs,
            compilationResult,
            emitArtifactsResult,
          );
        }),
      );

      await saveCache(this.#options.cachePath, this.#compileCache);
    }

    const resultsMap: Map<string, FileBuildResult> = new Map();

    for (const result of results) {
      const contractArtifactsGenerated = isSuccessfulBuild
        ? contractArtifactsGeneratedByCompilationJob.get(result.compilationJob)
        : new Map();

      assertHardhatInvariant(
        contractArtifactsGenerated !== undefined,
        "We emitted contract artifacts for all the jobs if the build was successful",
      );

      const errors = await Promise.all(
        (result.compilerOutput.errors ?? []).map((error) =>
          this.remapCompilerError(result.compilationJob, error, true),
        ),
      );

      this.#printSolcErrorsAndWarnings(errors);

      const successfulResult = !this.#hasCompilationErrors(
        result.compilerOutput,
      );

      for (const [userSourceName, root] of result.compilationJob.dependencyGraph
        .getRoots()
        .entries()) {
        if (!successfulResult) {
          resultsMap.set(formatRootPath(userSourceName, root), {
            type: FileBuildResultType.BUILD_FAILURE,
            compilationJob: result.compilationJob,
            errors,
          });

          continue;
        }

        if (result.cached) {
          resultsMap.set(formatRootPath(userSourceName, root), {
            type: FileBuildResultType.CACHE_HIT,
            compilationJob: result.compilationJob,
            contractArtifactsGenerated:
              contractArtifactsGenerated.get(userSourceName) ?? [],
            warnings: errors,
          });

          continue;
        }

        resultsMap.set(formatRootPath(userSourceName, root), {
          type: FileBuildResultType.BUILD_SUCCESS,
          compilationJob: result.compilationJob,
          contractArtifactsGenerated:
            contractArtifactsGenerated.get(userSourceName) ?? [],
          warnings: errors,
        });
      }
    }

    if (options?.quiet !== true) {
      if (isSuccessfulBuild) {
        await this.#printCompilationResult(compilationJobs);
      }
    }

    return resultsMap;
  }

  public async getCompilationJobs(
    rootFilePaths: string[],
    options?: GetCompilationJobsOptions,
  ): Promise<CompilationJobCreationError | GetCompilationJobsResult> {
    await this.#downloadConfiguredCompilers(options?.quiet);

    const dependencyGraph = await buildDependencyGraph(
      rootFilePaths.toSorted(), // We sort them to have a deterministic order
      this.#options.projectRoot,
      readSourceFileFactory(this.#hooks),
    );

    const buildProfileName = options?.buildProfile ?? DEFAULT_BUILD_PROFILE;

    if (this.#options.solidityConfig.profiles[buildProfileName] === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY.BUILD_PROFILE_NOT_FOUND,
        {
          buildProfileName,
        },
      );
    }

    log(`Using build profile ${buildProfileName}`);

    const solcConfigSelector = new SolcConfigSelector(
      buildProfileName,
      this.#options.solidityConfig.profiles[buildProfileName],
      dependencyGraph,
    );

    let subgraphsWithConfig: Array<
      [SolcConfig, DependencyGraphImplementation]
    > = [];
    for (const [rootFile, resolvedFile] of dependencyGraph.getRoots()) {
      log(
        `Building compilation job for root file ${rootFile} with input source name ${resolvedFile.inputSourceName} and user source name ${rootFile}`,
      );

      const subgraph = dependencyGraph.getSubgraph(rootFile);

      const configOrError =
        solcConfigSelector.selectBestSolcConfigForSingleRootGraph(subgraph);

      if ("reason" in configOrError) {
        return configOrError;
      }

      subgraphsWithConfig.push([configOrError, subgraph]);
    }

    // build version => longVersion map
    const solcVersionToLongVersion = new Map<string, string>();
    for (const [solcConfig] of subgraphsWithConfig) {
      let solcLongVersion = solcVersionToLongVersion.get(solcConfig.version);

      if (solcLongVersion === undefined) {
        const compiler = await getCompiler(solcConfig.version);
        solcLongVersion = compiler.longVersion;
        solcVersionToLongVersion.set(solcConfig.version, solcLongVersion);
      }
    }

    // build job for each root file. At this point subgraphsWithConfig are 1 root file each
    const indexedIndividualJobs: Map<string, CompilationJob> = new Map();
    const contentHashes = new Map<string, string>();
    await Promise.all(
      subgraphsWithConfig.map(async ([config, subgraph]) => {
        const solcLongVersion = solcVersionToLongVersion.get(config.version);

        assertHardhatInvariant(
          solcLongVersion !== undefined,
          "solcLongVersion should not be undefined",
        );

        const compilationJob = new CompilationJobImplementation(
          subgraph,
          config,
          solcLongVersion,
          this.#hooks,
          contentHashes,
        );

        await compilationJob.getBuildId(); // precompute

        assertHardhatInvariant(
          subgraph.getRoots().size === 1,
          "individual subgraph doesnt have exactly 1 root file",
        );

        const rootFilePath = Array.from(subgraph.getRoots().keys())[0];

        indexedIndividualJobs.set(rootFilePath, compilationJob);
      }),
    );

    // Load the cache
    this.#compileCache = await loadCache(this.#options.cachePath);

    // Select which files to compile
    const rootFilesToCompile: Set<string> = new Set();

    for (const [rootFile, compilationJob] of indexedIndividualJobs.entries()) {
      const jobHash = await compilationJob.getBuildId();
      const cacheResult = this.#compileCache[rootFile];

      // If there's no cache for the root file, or the compilation job changed, or using force flag, compile it
      if (
        (options?.force ?? false) ||
        cacheResult === undefined ||
        cacheResult.jobHash !== jobHash
      ) {
        rootFilesToCompile.add(rootFile);
        continue;
      }

      // If any of the emitted files are not present anymore, compile it
      const {
        artifactPaths,
        buildInfoPath,
        buildInfoOutputPath,
        typeFilePath,
      } = cacheResult;

      for (const outputFilePath of [
        ...artifactPaths,
        buildInfoPath,
        buildInfoOutputPath,
        typeFilePath,
      ]) {
        if (!(await exists(outputFilePath))) {
          rootFilesToCompile.add(rootFile);
          break;
        }
      }
    }

    if (
      options?.isolated !== true &&
      shouldMergeCompilationJobs(buildProfileName)
    ) {
      // non-isolated mode
      log(`Merging compilation jobs`);

      const mergedSubgraphsByConfig: Map<
        SolcConfig,
        DependencyGraphImplementation
      > = new Map();

      // Note: This groups the subgraphs by solc config. It compares the configs
      // based on reference, and not by deep equality. It misses some merging
      // opportunities, but this is Hardhat v2's behavior and works well enough.
      for (const [config, subgraph] of subgraphsWithConfig) {
        assertHardhatInvariant(
          subgraph.getRoots().size === 1,
          "there should be only 1 root file on subgraph",
        );

        const rootFile = Array.from(subgraph.getRoots().keys())[0];

        // Skip root files with cache hit (should not recompile)
        if (!rootFilesToCompile.has(rootFile)) {
          continue;
        }

        const mergedSubgraph = mergedSubgraphsByConfig.get(config);

        if (mergedSubgraph === undefined) {
          mergedSubgraphsByConfig.set(config, subgraph);
        } else {
          mergedSubgraphsByConfig.set(config, mergedSubgraph.merge(subgraph));
        }
      }

      subgraphsWithConfig = [...mergedSubgraphsByConfig.entries()];
    } else {
      // isolated mode
      subgraphsWithConfig = subgraphsWithConfig.filter(
        ([_config, subgraph]) => {
          assertHardhatInvariant(
            subgraph.getRoots().size === 1,
            "there should be only 1 root file on subgraph",
          );

          const rootFile = Array.from(subgraph.getRoots().keys())[0];

          return rootFilesToCompile.has(rootFile);
        },
      );
    }

    const compilationJobsPerFile = new Map<string, CompilationJob>();
    for (const [solcConfig, subgraph] of subgraphsWithConfig) {
      const solcLongVersion = solcVersionToLongVersion.get(solcConfig.version);

      assertHardhatInvariant(
        solcLongVersion !== undefined,
        "solcLongVersion should not be undefined",
      );

      const compilationJob = new CompilationJobImplementation(
        subgraph,
        solcConfig,
        solcLongVersion,
        this.#hooks,
        contentHashes,
      );

      for (const [userSourceName, root] of subgraph.getRoots().entries()) {
        compilationJobsPerFile.set(
          formatRootPath(userSourceName, root),
          compilationJob,
        );
      }
    }

    return { compilationJobsPerFile, indexedIndividualJobs };
  }

  public async runCompilationJob(
    compilationJob: CompilationJob,
    options?: RunCompilationJobOptions,
  ): Promise<CompilerOutput> {
    await this.#downloadConfiguredCompilers(options?.quiet);

    let numberOfFiles = 0;
    for (const _ of compilationJob.dependencyGraph.getAllFiles()) {
      numberOfFiles++;
    }

    const numberOfRootFiles = compilationJob.dependencyGraph.getRoots().size;

    const compiler = await getCompiler(compilationJob.solcConfig.version);

    log(
      `Compiling ${numberOfRootFiles} root files and ${numberOfFiles - numberOfRootFiles} dependency files with solc ${compilationJob.solcConfig.version} using ${compiler.compilerPath}`,
    );

    assertHardhatInvariant(
      compilationJob.solcLongVersion === compiler.longVersion,
      "The long version of the compiler should match the long version of the compilation job",
    );

    return compiler.compile(await compilationJob.getSolcInput());
  }

  public async remapCompilerError(
    compilationJob: CompilationJob,
    error: CompilerOutputError,
    shouldShortenPaths: boolean = false,
  ): Promise<CompilerOutputError> {
    return {
      type: error.type,
      component: error.component,
      message: error.message,
      severity: error.severity,
      errorCode: error.errorCode,
      formattedMessage: error.formattedMessage?.replace(
        /(-->\s+)([^\s:\n]+)/g,
        (_match, prefix, inputSourceName) => {
          const file =
            compilationJob.dependencyGraph.getFileByInputSourceName(
              inputSourceName,
            );

          if (file === undefined) {
            return `${prefix}${inputSourceName}`;
          }

          const replacement = shouldShortenPaths
            ? shortenPath(file.fsPath)
            : file.fsPath;

          return `${prefix}${replacement}`;
        },
      ),
    };
  }

  public async emitArtifacts(
    compilationJob: CompilationJob,
    compilerOutput: CompilerOutput,
  ): Promise<EmitArtifactsResult> {
    const artifactsPerFile = new Map<string, string[]>();
    const typeFilePaths = new Map<string, string>();
    const buildId = await compilationJob.getBuildId();

    // We emit the artifacts for each root file, first emitting one artifact
    // for each contract, and then one declaration file for the entire file,
    // which defines their types and augments the ArtifactMap type.
    for (const [userSourceName, root] of compilationJob.dependencyGraph
      .getRoots()
      .entries()) {
      const fileFolder = path.join(this.#options.artifactsPath, userSourceName);

      // If the folder exists, we remove it first, as we don't want to leave
      // any old artifacts there.
      await remove(fileFolder);

      const contracts = compilerOutput.contracts?.[root.inputSourceName];
      const paths: string[] = [];
      const artifacts: Artifact[] = [];

      // This can be undefined if no contract is present in the source file
      if (contracts !== undefined) {
        for (const [contractName, contract] of Object.entries(contracts)) {
          const contractArtifactPath = path.join(
            fileFolder,
            `${contractName}.json`,
          );

          const artifact = getContractArtifact(
            buildId,
            userSourceName,
            root.inputSourceName,
            contractName,
            contract,
          );

          await writeUtf8File(
            contractArtifactPath,
            JSON.stringify(artifact, undefined, 2),
          );

          paths.push(contractArtifactPath);
          artifacts.push(artifact);
        }
      }

      artifactsPerFile.set(userSourceName, paths);

      const artifactsDeclarationFilePath = path.join(
        fileFolder,
        "artifacts.d.ts",
      );
      typeFilePaths.set(userSourceName, artifactsDeclarationFilePath);

      const artifactsDeclarationFile = getArtifactsDeclarationFile(artifacts);

      await writeUtf8File(
        artifactsDeclarationFilePath,
        artifactsDeclarationFile,
      );
    }

    // Once we have emitted all the contract artifacts and its declaration
    // file, we emit the build info file and its output file.
    const buildInfoId = buildId;

    const buildInfoPath = path.join(
      this.#options.artifactsPath,
      `build-info`,
      `${buildInfoId}.json`,
    );

    const buildInfoOutputPath = path.join(
      this.#options.artifactsPath,
      `build-info`,
      `${buildInfoId}.output.json`,
    );

    // BuildInfo and BuildInfoOutput files are large, so we write them
    // concurrently, and keep their lifetimes separated and small.
    await Promise.all([
      (async () => {
        const buildInfo = await getBuildInfo(compilationJob);

        // TODO: Maybe formatting the build info is slow, but it's mostly
        // strings, so it probably shouldn't be a problem.
        await writeJsonFile(buildInfoPath, buildInfo);
      })(),
      (async () => {
        const buildInfoOutput = await getBuildInfoOutput(
          compilationJob,
          compilerOutput,
        );

        // NOTE: We use writeJsonFileAsStream here because the build info output might exceed
        // the maximum string length.
        // TODO: Earlier in the build process, very similar files are created on disk by the
        // Compiler.  Instead of creating them again, we should consider copying/moving them.
        // This would require changing the format of the build info output file.
        await writeJsonFileAsStream(buildInfoOutputPath, buildInfoOutput);
      })(),
    ]);

    return {
      artifactsPerFile,
      buildInfoPath,
      buildInfoOutputPath,
      typeFilePaths,
    };
  }

  public async cleanupArtifacts(rootFilePaths: string[]): Promise<void> {
    log(`Cleaning up artifacts`);

    const userSourceNames = rootFilePaths.map((rootFilePath) => {
      const parsed = parseRootPath(rootFilePath);
      return isNpmParsedRootPath(parsed)
        ? parsed.npmPath
        : path.relative(this.#options.projectRoot, parsed.fsPath);
    });

    const userSourceNamesSet = new Set(userSourceNames);

    for (const file of await getAllDirectoriesMatching(
      this.#options.artifactsPath,
      (d) => d.endsWith(".sol"),
    )) {
      const relativePath = path.relative(this.#options.artifactsPath, file);

      if (!userSourceNamesSet.has(relativePath)) {
        await remove(file);
      }
    }

    const buildInfosDir = path.join(this.#options.artifactsPath, `build-info`);

    // TODO: This logic is duplicated with respect to the artifacts manager
    const artifactPaths = await getAllFilesMatching(
      this.#options.artifactsPath,
      (p) =>
        p.endsWith(".json") && // Only consider json files
        // Ignore top level json files
        p.indexOf(
          path.sep,
          this.#options.artifactsPath.length + path.sep.length,
        ) !== -1,
      (dir) => dir !== buildInfosDir,
    );

    const reachableBuildInfoIds = await Promise.all(
      artifactPaths.map(async (artifactPath) => {
        const artifact: Artifact = await readJsonFile(artifactPath);
        return artifact.buildInfoId;
      }),
    );

    const reachableBuildInfoIdsSet = new Set(
      reachableBuildInfoIds.filter((id) => id !== undefined),
    );

    // Get all the reachable build info files
    const buildInfoFiles = await getAllFilesMatching(buildInfosDir, (f) =>
      f.startsWith(buildInfosDir),
    );

    for (const buildInfoFile of buildInfoFiles) {
      const basename = path.basename(buildInfoFile);

      const id = basename.substring(0, basename.indexOf("."));

      if (!reachableBuildInfoIdsSet.has(id)) {
        await remove(buildInfoFile);
      }
    }

    // Get duplicated contract names
    const artifactNameCounts = new Map<string, number>();
    for (const artifactPath of artifactPaths) {
      const basename = path.basename(artifactPath);
      const name = basename.substring(0, basename.indexOf("."));

      let count = artifactNameCounts.get(name);
      if (count === undefined) {
        count = 0;
      }

      artifactNameCounts.set(name, count + 1);
    }

    const duplicatedNames = [...artifactNameCounts.entries()]
      .filter(([_, count]) => count > 1)
      .map(([name, _]) => name);

    const duplicatedContractNamesDeclarationFilePath = path.join(
      this.#options.artifactsPath,
      "artifacts.d.ts",
    );

    await writeUtf8File(
      duplicatedContractNamesDeclarationFilePath,
      getDuplicatedContractNamesDeclarationFile(duplicatedNames),
    );

    await this.#hooks.runHandlerChain(
      "solidity",
      "onCleanUpArtifacts",
      [artifactPaths],
      async () => {},
    );
  }

  public async compileBuildInfo(
    _buildInfo: SolidityBuildInfo,
    _options?: CompileBuildInfoOptions,
  ): Promise<CompilerOutput> {
    // TODO: Download the buildinfo compiler version
    assertHardhatInvariant(false, "Method not implemented.");
  }

  async #downloadConfiguredCompilers(quiet = false): Promise<void> {
    // TODO: For the alpha release, we always print this message
    quiet = false;
    if (this.#downloadedCompilers) {
      return;
    }

    await downloadConfiguredCompilers(this.#getAllCompilerVersions(), quiet);
    this.#downloadedCompilers = true;
  }

  #getAllCompilerVersions(): Set<string> {
    return new Set(
      Object.values(this.#options.solidityConfig.profiles)
        .map((profile) => [
          ...profile.compilers.map((compiler) => compiler.version),
          ...Object.values(profile.overrides).map(
            (override) => override.version,
          ),
        ])
        .flat(1),
    );
  }

  #isConsoleLogError(error: CompilerOutputError): boolean {
    const message = error.message;

    return (
      error.type === "TypeError" &&
      typeof message === "string" &&
      message.includes("log") &&
      message.includes("type(library console)")
    );
  }

  #hasCompilationErrors(output: CompilerOutput): boolean {
    return output.errors?.some((x: any) => x.severity === "error") ?? false;
  }

  /**
   * This function returns a properly formatted Internal Compiler Error message.
   *
   * This is present due to a bug in Solidity. See: https://github.com/ethereum/solidity/issues/9926
   *
   * If the error is not an ICE, or if it's properly formatted, this function returns undefined.
   */
  #getFormattedInternalCompilerErrorMessage(
    error: CompilerOutputError,
  ): string | undefined {
    if (error.formattedMessage?.trim() !== "InternalCompilerError:") {
      return;
    }

    // We trim any final `:`, as we found some at the end of the error messages,
    // and then trim just in case a blank space was left
    return `${error.type}: ${error.message}`.replace(/[:\s]*$/g, "").trim();
  }

  async #cacheCompilationResult(
    indexedIndividualJobs: Map<string, CompilationJob>,
    result: CompilationResult,
    emitArtifactsResult: EmitArtifactsResult,
  ): Promise<void> {
    const rootFilePaths = result.compilationJob.dependencyGraph
      .getRoots()
      .keys();

    for (const rootFilePath of rootFilePaths) {
      const individualJob = indexedIndividualJobs.get(rootFilePath);

      assertHardhatInvariant(
        individualJob !== undefined,
        "Failed to get individual job from compiled job",
      );

      const artifactPaths =
        emitArtifactsResult.artifactsPerFile.get(rootFilePath);

      assertHardhatInvariant(
        artifactPaths !== undefined,
        `No artifacts found on map for ${rootFilePath}`,
      );

      const typeFilePath = emitArtifactsResult.typeFilePaths.get(rootFilePath);

      assertHardhatInvariant(
        typeFilePath !== undefined,
        `No type file found on map for ${rootFilePath}`,
      );

      const jobHash = await individualJob.getBuildId();

      this.#compileCache[rootFilePath] = {
        jobHash,
        artifactPaths,
        buildInfoPath: emitArtifactsResult.buildInfoPath,
        buildInfoOutputPath: emitArtifactsResult.buildInfoOutputPath,
        typeFilePath,
      };
    }
  }

  #printSolcErrorsAndWarnings(errors?: CompilerOutputError[]): void {
    if (errors === undefined) {
      return;
    }

    for (const error of errors) {
      if (error.severity === "error") {
        const errorMessage: string =
          this.#getFormattedInternalCompilerErrorMessage(error) ??
          error.formattedMessage ??
          error.message;

        console.error(errorMessage.replace(/^\w+:/, (t) => chalk.red.bold(t)));
      } else {
        console.warn(
          (error.formattedMessage ?? error.message).replace(/^\w+:/, (t) =>
            chalk.yellow.bold(t),
          ),
        );
      }
    }

    const hasConsoleErrors: boolean = errors.some((e) =>
      this.#isConsoleLogError(e),
    );

    if (hasConsoleErrors) {
      console.error(
        chalk.red(
          `The console.log call you made isn't supported. See https://hardhat.org/console-log for the list of supported methods.`,
        ),
      );
      console.log();
    }
  }

  async #printCompilationResult(compilationJobs: CompilationJob[]) {
    const jobsPerVersionAndEvmVersion = new Map<
      string,
      Map<string, CompilationJob[]>
    >();

    for (const job of compilationJobs) {
      const solcVersion = job.solcConfig.version;
      const solcInput = await job.getSolcInput();
      const evmVersion =
        solcInput.settings.evmVersion ??
        `Check solc ${solcVersion}'s doc for its default evm version`;

      let jobsPerVersion = jobsPerVersionAndEvmVersion.get(solcVersion);
      if (jobsPerVersion === undefined) {
        jobsPerVersion = new Map();
        jobsPerVersionAndEvmVersion.set(solcVersion, jobsPerVersion);
      }

      let jobsPerEvmVersion = jobsPerVersion.get(evmVersion);
      if (jobsPerEvmVersion === undefined) {
        jobsPerEvmVersion = [];
        jobsPerVersion.set(evmVersion, jobsPerEvmVersion);
      }

      jobsPerEvmVersion.push(job);
    }

    for (const solcVersion of [...jobsPerVersionAndEvmVersion.keys()].sort()) {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion --
      This is a valid key, just sorted */
      const jobsPerEvmVersion = jobsPerVersionAndEvmVersion.get(solcVersion)!;

      for (const evmVersion of [...jobsPerEvmVersion.keys()].sort()) {
        /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion --
        This is a valid key, just sorted */
        const jobs = jobsPerEvmVersion.get(evmVersion)!;

        const rootFiles = jobs.reduce(
          (count, job) => count + job.dependencyGraph.getRoots().size,
          0,
        );

        console.log(
          `Compiled ${rootFiles} Solidity ${pluralize(
            "file",
            rootFiles,
          )} with solc ${solcVersion} (evm target: ${evmVersion})`,
        );
      }
    }
  }
}
