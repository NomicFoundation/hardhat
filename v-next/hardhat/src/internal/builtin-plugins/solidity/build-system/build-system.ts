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
  RunCompilationJobResult,
  BuildScope,
} from "../../../../types/solidity/build-system.js";
import type {
  CompilationJob,
  Compiler,
  CompilerOutput,
  CompilerOutputError,
  SolidityBuildInfo,
} from "../../../../types/solidity.js";

import os from "node:os";
import path from "node:path";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  exists,
  ensureDir,
  getAllDirectoriesMatching,
  getAllFilesMatching,
  move,
  readJsonFile,
  remove,
  writeJsonFile,
  writeJsonFileAsStream,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { shortenPath } from "@nomicfoundation/hardhat-utils/path";
import { createSpinner } from "@nomicfoundation/hardhat-utils/spinner";
import { pluralize } from "@nomicfoundation/hardhat-utils/string";
import chalk from "chalk";
import debug from "debug";
import pMap from "p-map";

import { FileBuildResultType } from "../../../../types/solidity/build-system.js";
import { DEFAULT_BUILD_PROFILE } from "../build-profiles.js";

import {
  getArtifactsDeclarationFile,
  getBuildInfo,
  getBuildInfoOutput,
  getContractArtifact,
  getDuplicatedContractNamesDeclarationFile,
} from "./artifacts.js";
import { loadCache, saveCache } from "./cache.js";
import { CompilationJobImplementation } from "./compilation-job.js";
import { downloadSolcCompilers, getCompiler } from "./compiler/index.js";
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

// Compiler warnings to suppress from build output.
// Each rule specifies a warning message and the source file it applies to.
// This allows suppressing known warnings from internal files (e.g., console.sol)
// while still showing the same warning type from user code.
export const SUPPRESSED_WARNINGS: Array<{
  message: string;
  sourceFile: string;
}> = [
  {
    message:
      "Natspec memory-safe-assembly special comment for inline assembly is deprecated and scheduled for removal. Use the memory-safe block annotation instead.",
    sourceFile: path.normalize("hardhat/console.sol"),
  },
];

interface CompilationResult {
  compilationJob: CompilationJob;
  compilerOutput: CompilerOutput;
  cached: boolean;
  compiler: Compiler;
}

export interface SolidityBuildSystemOptions {
  readonly solidityConfig: SolidityConfig;
  readonly projectRoot: string;
  readonly soliditySourcesPaths: string[];
  readonly artifactsPath: string;
  readonly cachePath: string;
  readonly solidityTestsPath: string;
}

export class SolidityBuildSystemImplementation implements SolidityBuildSystem {
  readonly #hooks: HookManager;
  readonly #options: SolidityBuildSystemOptions;
  #compileCache: CompileCache = {};
  #configuredCompilersDownloaded = false;

  constructor(hooks: HookManager, options: SolidityBuildSystemOptions) {
    this.#hooks = hooks;
    this.#options = options;
  }

  public async getScope(fsPath: string): Promise<BuildScope> {
    if (
      fsPath.startsWith(this.#options.solidityTestsPath) &&
      fsPath.endsWith(".sol")
    ) {
      return "tests";
    }

    for (const sourcesPath of this.#options.soliditySourcesPaths) {
      if (fsPath.startsWith(sourcesPath) && fsPath.endsWith(".t.sol")) {
        return "tests";
      }
    }

    return "contracts";
  }

  public async getRootFilePaths(
    options: { scope?: BuildScope } = {},
  ): Promise<string[]> {
    const scope = options.scope ?? "contracts";

    switch (scope) {
      case "contracts":
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

        const npmFilesToBuild =
          this.#options.solidityConfig.npmFilesToBuild.map(
            npmModuleToNpmRootPath,
          );

        return [...localFilesToCompile, ...npmFilesToBuild];
      case "tests":
        let rootFilePaths = (
          await Promise.all([
            getAllFilesMatching(this.#options.solidityTestsPath, (f) =>
              f.endsWith(".sol"),
            ),
            ...this.#options.soliditySourcesPaths.map(async (dir) => {
              return getAllFilesMatching(dir, (f) => f.endsWith(".t.sol"));
            }),
          ])
        ).flat(1);

        // NOTE: We remove duplicates in case there is an intersection between
        // the tests.solidity paths and the sources paths
        rootFilePaths = Array.from(new Set(rootFilePaths));
        return rootFilePaths;
    }
  }

  public async build(
    rootFilePaths: string[],
    _options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>> {
    return this.#hooks.runHandlerChain(
      "solidity",
      "build",
      [rootFilePaths, _options],
      async (_context, nextRootFilePaths, nextOptions) =>
        this.#build(nextRootFilePaths, nextOptions),
    );
  }

  async #build(
    rootFilePaths: string[],
    _options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>> {
    const options: Required<BuildOptions> = {
      buildProfile: DEFAULT_BUILD_PROFILE,
      concurrency: Math.max(os.cpus().length - 1, 1),
      force: false,
      isolated: false,
      quiet: false,
      scope: "contracts",
      ..._options,
    };

    await this.#downloadConfiguredCompilers(options.quiet);

    const { buildProfile } = this.#getBuildProfile(options.buildProfile);

    const compilationJobsResult = await this.getCompilationJobs(
      rootFilePaths,
      options,
    );

    if ("reason" in compilationJobsResult) {
      return compilationJobsResult;
    }

    const spinner = createSpinner({
      text: `Compiling your Solidity ${options.scope}...`,
      enabled: true,
    });
    spinner.start();

    try {
      const { compilationJobsPerFile, indexedIndividualJobs } =
        compilationJobsResult;

      const runnableCompilationJobs = [
        ...new Set(compilationJobsPerFile.values()),
      ];

      // NOTE: We precompute the build ids in parallel here, which are cached
      // internally in each compilation job
      await Promise.all(
        runnableCompilationJobs.map(async (runnableCompilationJob) =>
          runnableCompilationJob.getBuildId(),
        ),
      );

      const results: CompilationResult[] = await pMap(
        runnableCompilationJobs,
        async (runnableCompilationJob) => {
          const { output, compiler } = await this.runCompilationJob(
            runnableCompilationJob,
            options,
          );

          return {
            compilationJob: runnableCompilationJob,
            compilerOutput: output,
            cached: false,
            compiler,
          };
        },
        {
          concurrency: options.concurrency,
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
              options,
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
              buildProfile.isolated,
              options.scope,
            );
          }),
        );

        await saveCache(this.#options.cachePath, this.#compileCache);
      }

      spinner.stop();

      const resultsMap: Map<string, FileBuildResult> = new Map();

      for (const result of results) {
        const contractArtifactsGenerated = isSuccessfulBuild
          ? contractArtifactsGeneratedByCompilationJob.get(
              result.compilationJob,
            )
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

        for (const [
          userSourceName,
          root,
        ] of result.compilationJob.dependencyGraph.getRoots().entries()) {
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

      if (!options.quiet) {
        if (isSuccessfulBuild) {
          await this.#printCompilationResult(runnableCompilationJobs, {
            scope: options.scope,
          });
        }
      }

      return resultsMap;
    } finally {
      spinner.stop();
    }
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

    const { buildProfileName, buildProfile } = this.#getBuildProfile(
      options?.buildProfile,
    );

    log(`Using build profile ${buildProfileName}`);

    const solcConfigSelector = new SolcConfigSelector(
      buildProfileName,
      buildProfile,
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

    // get longVersion and isWasm from the compiler for each version
    const solcVersionToLongVersion = new Map<string, string>();
    const versionIsWasm = new Map<string, boolean>();
    for (const [solcConfig] of subgraphsWithConfig) {
      let solcLongVersion = solcVersionToLongVersion.get(solcConfig.version);

      if (solcLongVersion === undefined) {
        const compiler = await getCompiler(solcConfig.version, {
          preferWasm: buildProfile.preferWasm,
          compilerPath: solcConfig.path,
        });
        solcLongVersion = compiler.longVersion;
        solcVersionToLongVersion.set(solcConfig.version, solcLongVersion);
        versionIsWasm.set(solcConfig.version, compiler.isSolcJs);
      }
    }

    // build job for each root file. At this point subgraphsWithConfig are 1 root file each
    const indexedIndividualJobs: Map<string, CompilationJob> = new Map();
    const sharedContentHashes = new Map<string, string>();
    await Promise.all(
      subgraphsWithConfig.map(async ([config, subgraph]) => {
        const solcLongVersion = solcVersionToLongVersion.get(config.version);

        assertHardhatInvariant(
          solcLongVersion !== undefined,
          "solcLongVersion should not be undefined",
        );

        const individualJob = new CompilationJobImplementation(
          subgraph,
          config,
          solcLongVersion,
          this.#hooks,
          sharedContentHashes,
        );

        await individualJob.getBuildId(); // precompute

        assertHardhatInvariant(
          subgraph.getRoots().size === 1,
          "individual subgraph doesn't have exactly 1 root file",
        );

        const rootFilePath = Array.from(subgraph.getRoots().keys())[0];

        indexedIndividualJobs.set(rootFilePath, individualJob);
      }),
    );

    // Load the cache
    this.#compileCache = await loadCache(this.#options.cachePath);

    // Select which files to compile
    const rootFilesToCompile: Set<string> = new Set();

    const isolated = buildProfile.isolated;

    for (const [rootFile, compilationJob] of indexedIndividualJobs.entries()) {
      const jobHash = await compilationJob.getBuildId();
      const cacheResult = this.#compileCache[rootFile];
      const isWasm = versionIsWasm.get(compilationJob.solcConfig.version);

      assertHardhatInvariant(
        isWasm !== undefined,
        `Version ${compilationJob.solcConfig.version} not present in isWasm map`,
      );

      // If there's no cache for the root file, or the compilation job changed, or using force flag, or isolated mode changed, compile it
      if (
        options?.force === true ||
        cacheResult === undefined ||
        cacheResult.jobHash !== jobHash ||
        cacheResult.isolated !== isolated ||
        cacheResult.wasm !== isWasm
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
        // Type declaration file can be undefined (e.g. for solidity tests)
        if (outputFilePath === undefined) {
          continue;
        }

        if (!(await exists(outputFilePath))) {
          rootFilesToCompile.add(rootFile);
          break;
        }
      }
    }

    if (!isolated) {
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

      const runnableCompilationJob = new CompilationJobImplementation(
        subgraph,
        solcConfig,
        solcLongVersion,
        this.#hooks,
        sharedContentHashes,
      );

      for (const [userSourceName, root] of subgraph.getRoots().entries()) {
        compilationJobsPerFile.set(
          formatRootPath(userSourceName, root),
          runnableCompilationJob,
        );
      }
    }

    return { compilationJobsPerFile, indexedIndividualJobs };
  }

  #getBuildProfile(buildProfileName: string = DEFAULT_BUILD_PROFILE) {
    const buildProfile =
      this.#options.solidityConfig.profiles[buildProfileName];

    if (buildProfile === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY.BUILD_PROFILE_NOT_FOUND,
        {
          buildProfileName,
        },
      );
    }

    return { buildProfileName, buildProfile };
  }

  public async runCompilationJob(
    runnableCompilationJob: CompilationJob,
    options?: RunCompilationJobOptions,
  ): Promise<RunCompilationJobResult> {
    await this.#downloadConfiguredCompilers(options?.quiet);

    let numberOfFiles = 0;
    for (const _ of runnableCompilationJob.dependencyGraph.getAllFiles()) {
      numberOfFiles++;
    }

    const numberOfRootFiles =
      runnableCompilationJob.dependencyGraph.getRoots().size;

    const { buildProfile } = this.#getBuildProfile(options?.buildProfile);

    const compiler = await getCompiler(
      runnableCompilationJob.solcConfig.version,
      {
        preferWasm: buildProfile.preferWasm,
        compilerPath: runnableCompilationJob.solcConfig.path,
      },
    );

    log(
      `Compiling ${numberOfRootFiles} root files and ${numberOfFiles - numberOfRootFiles} dependency files with solc ${runnableCompilationJob.solcConfig.version} using ${compiler.compilerPath}`,
    );

    assertHardhatInvariant(
      runnableCompilationJob.solcLongVersion === compiler.longVersion,
      "The long version of the compiler should match the long version of the compilation job",
    );

    const input = await runnableCompilationJob.getSolcInput();

    const output = await this.#hooks.runHandlerChain(
      "solidity",
      "invokeSolc",
      [compiler, input, runnableCompilationJob.solcConfig],
      async (_context, nextCompiler, nextSolcInput) => {
        return nextCompiler.compile(nextSolcInput);
      },
    );

    return { output, compiler };
  }

  public async remapCompilerError(
    runnableCompilationJob: CompilationJob,
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
            runnableCompilationJob.dependencyGraph.getFileByInputSourceName(
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
    runnableCompilationJob: CompilationJob,
    compilerOutput: CompilerOutput,
    options: { scope?: BuildScope } = {},
  ): Promise<EmitArtifactsResult> {
    const scope = options.scope ?? "contracts";

    const artifactsPerFile = new Map<string, string[]>();
    const typeFilePaths = new Map<string, string>();
    const buildId = await runnableCompilationJob.getBuildId();

    const artifactsDirectory = await this.getArtifactsDirectory(scope);

    // We emit the artifacts for each root file, first emitting one artifact
    // for each contract, and then one declaration file for the entire file,
    // which defines their types and augments the ArtifactMap type.
    for (const [userSourceName, root] of runnableCompilationJob.dependencyGraph
      .getRoots()
      .entries()) {
      const fileFolder = path.join(artifactsDirectory, userSourceName);

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

      // Write the type declaration file, only for contracts
      if (scope === "contracts") {
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
    }

    // Once we have emitted all the contract artifacts and its declaration
    // file, we emit the build info file and its output file.
    const buildInfoId = buildId;

    const buildInfoCacheDirPath = path.join(
      this.#options.cachePath,
      `build-info`,
    );

    await ensureDir(buildInfoCacheDirPath);

    const buildInfoCachePath = path.join(
      buildInfoCacheDirPath,
      `${buildInfoId}.json`,
    );

    const buildInfoOutputCachePath = path.join(
      buildInfoCacheDirPath,
      `${buildInfoId}.output.json`,
    );

    // BuildInfo and BuildInfoOutput files are large, so we write them
    // concurrently, and keep their lifetimes separated and small.
    // NOTE: First, we write the build info file and its output to the cache
    // directory. Once both are successfully written, we move them to the
    // artifacts directory sequentially, ensuring the build info file is moved
    // last. This approach minimizes the risk of having corrupted build info
    // files in the artifacts directory and ensures other processes, like
    // `hardhat node`, can safely monitor the build info file as an indicator
    // for build completion.
    await Promise.all([
      (async () => {
        const buildInfo = await getBuildInfo(runnableCompilationJob);

        // TODO: Maybe formatting the build info is slow, but it's mostly
        // strings, so it probably shouldn't be a problem.
        await writeJsonFile(buildInfoCachePath, buildInfo);
      })(),
      (async () => {
        const buildInfoOutput = await getBuildInfoOutput(
          runnableCompilationJob,
          compilerOutput,
        );

        // NOTE: We use writeJsonFileAsStream here because the build info output might exceed
        // the maximum string length.
        // TODO: Earlier in the build process, very similar files are created on disk by the
        // Compiler.  Instead of creating them again, we should consider copying/moving them.
        // This would require changing the format of the build info output file.
        await writeJsonFileAsStream(buildInfoOutputCachePath, buildInfoOutput);
      })(),
    ]);

    const buildInfoDirPath = path.join(artifactsDirectory, `build-info`);

    await ensureDir(buildInfoDirPath);

    const buildInfoPath = path.join(buildInfoDirPath, `${buildInfoId}.json`);

    const buildInfoOutputPath = path.join(
      buildInfoDirPath,
      `${buildInfoId}.output.json`,
    );

    await move(buildInfoOutputCachePath, buildInfoOutputPath);
    await move(buildInfoCachePath, buildInfoPath);

    return {
      artifactsPerFile,
      buildInfoPath,
      buildInfoOutputPath,
      typeFilePaths,
    };
  }

  public async getArtifactsDirectory(scope: BuildScope): Promise<string> {
    return scope === "contracts"
      ? this.#options.artifactsPath
      : path.join(this.#options.cachePath, "test-artifacts");
  }

  public async cleanupArtifacts(
    rootFilePaths: string[],
    options: { scope?: BuildScope } = {},
  ): Promise<void> {
    log(`Cleaning up artifacts`);

    const scope = options.scope ?? "contracts";
    const artifactsDirectory = await this.getArtifactsDirectory(scope);

    const userSourceNames = rootFilePaths.map((rootFilePath) => {
      const parsed = parseRootPath(rootFilePath);
      return isNpmParsedRootPath(parsed)
        ? parsed.npmPath
        : toForwardSlash(
            path.relative(this.#options.projectRoot, parsed.fsPath),
          );
    });

    const userSourceNamesSet = new Set(userSourceNames);

    for (const file of await getAllDirectoriesMatching(
      artifactsDirectory,
      (d) => d.endsWith(".sol"),
    )) {
      const relativePath = toForwardSlash(
        path.relative(artifactsDirectory, file),
      );

      if (!userSourceNamesSet.has(relativePath)) {
        await remove(file);
      }
    }

    const buildInfosDir = path.join(artifactsDirectory, `build-info`);

    // TODO: This logic is duplicated with respect to the artifacts manager
    const artifactPaths = await getAllFilesMatching(
      artifactsDirectory,
      (p) =>
        p.endsWith(".json") && // Only consider json files
        // Ignore top level json files
        p.indexOf(path.sep, artifactsDirectory.length + path.sep.length) !== -1,
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

    // These steps only apply when compiling contracts
    if (scope === "contracts") {
      // Get duplicated contract names and write a top-level artifacts.d.ts file
      const artifactNameCounts = new Map<string, number>();
      for (const artifactPath of artifactPaths) {
        const basename = path.basename(artifactPath);
        const name = basename.substring(0, basename.indexOf("."));

        const count = artifactNameCounts.get(name) ?? 0;

        artifactNameCounts.set(name, count + 1);
      }

      const duplicatedNames = [...artifactNameCounts.entries()]
        .filter(([_, count]) => count > 1)
        .map(([name, _]) => name);

      const duplicatedContractNamesDeclarationFilePath = path.join(
        artifactsDirectory,
        "artifacts.d.ts",
      );

      await writeUtf8File(
        duplicatedContractNamesDeclarationFilePath,
        getDuplicatedContractNamesDeclarationFile(duplicatedNames),
      );

      // Run the onCleanUpArtifacts hook
      await this.#hooks.runHandlerChain(
        "solidity",
        "onCleanUpArtifacts",
        [artifactPaths],
        async () => {},
      );
    }
  }

  public async compileBuildInfo(
    buildInfo: SolidityBuildInfo,
    options?: CompileBuildInfoOptions,
  ): Promise<CompilerOutput> {
    const quiet = options?.quiet ?? false;

    // We download the compiler for the build info as it may not be configured
    // in the HH config, hence not downloaded with the other compilers
    await downloadSolcCompilers(new Set([buildInfo.solcVersion]), quiet);

    const compiler = await getCompiler(buildInfo.solcVersion, {
      preferWasm: false,
    });

    return compiler.compile(buildInfo.input);
  }

  async #downloadConfiguredCompilers(quiet = false): Promise<void> {
    // We always print that we are downloading the compilers
    quiet = false;
    if (this.#configuredCompilersDownloaded) {
      return;
    }

    await downloadSolcCompilers(this.#getAllCompilerVersions(), quiet);
    this.#configuredCompilersDownloaded = true;
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
    isolated: boolean,
    scope: BuildScope,
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

      // Type declaration file is not generated for solidity tests
      assertHardhatInvariant(
        scope === "tests" || typeFilePath !== undefined,
        `No type file found on map for contract ${rootFilePath}`,
      );

      const jobHash = await individualJob.getBuildId();

      this.#compileCache[rootFilePath] = {
        jobHash,
        isolated,
        artifactPaths,
        buildInfoPath: emitArtifactsResult.buildInfoPath,
        buildInfoOutputPath: emitArtifactsResult.buildInfoOutputPath,
        typeFilePath,
        wasm: result.compiler.isSolcJs,
      };
    }
  }

  #printSolcErrorsAndWarnings(errors?: CompilerOutputError[]): void {
    if (errors === undefined) {
      return;
    }

    // Filter out specific warnings that should be suppressed
    const filteredErrors = errors.filter(
      (error) => !this.#shouldSuppressWarning(error),
    );

    console.log();

    for (const error of filteredErrors) {
      if (error.severity === "error") {
        const errorMessage: string =
          this.#getFormattedInternalCompilerErrorMessage(error) ??
          error.formattedMessage ??
          error.message;

        console.error(
          errorMessage.replace(/^\w+:/, (t) => chalk.red.bold(t)).trimEnd() +
            "\n",
        );
      } else {
        console.warn(
          (error.formattedMessage ?? error.message)
            .replace(/^\w+:/, (t) => chalk.yellow.bold(t))
            .trimEnd() + "\n",
        );
      }
    }

    const hasConsoleErrors: boolean = filteredErrors.some((e) =>
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

  #shouldSuppressWarning(error: CompilerOutputError): boolean {
    const msg = error.formattedMessage ?? error.message;

    return SUPPRESSED_WARNINGS.some(
      (rule) => msg.includes(rule.message) && msg.includes(rule.sourceFile),
    );
  }

  async #printCompilationResult(
    runnableCompilationJobs: CompilationJob[],
    options: { scope: BuildScope },
  ) {
    const jobsPerVersionAndEvmVersion = new Map<
      string,
      Map<string, CompilationJob[]>
    >();

    if (runnableCompilationJobs.length === 0) {
      if (options.scope === "contracts") {
        console.log("No contracts to compile");
      } else {
        console.log("No Solidity tests to compile");
      }

      return;
    }

    for (const job of runnableCompilationJobs) {
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
          chalk.bold(
            `Compiled ${rootFiles} Solidity ${pluralize(
              options.scope === "contracts" ? "file" : "test file",
              rootFiles,
            )} with solc ${solcVersion}`,
          ),
          `(evm target: ${evmVersion})`,
        );
      }
    }
  }
}

function toForwardSlash(str: string): string {
  return str.split(/[\\\/]/).join(path.posix.sep);
}
