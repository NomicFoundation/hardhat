import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Artifact } from "../../../../types/artifacts.js";
import type { SolcConfig, SolidityConfig } from "../../../../types/config.js";
import type {
  SolidityBuildSystem,
  BuildOptions,
  CompilationJobCreationError,
  FileBuildResult,
  GetCompilationJobsOptions,
  CompileBuildInfoOptions,
  RunCompilationJobOptions,
  EmitArtifactsOptions,
} from "../../../../types/solidity/build-system.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type {
  CompilerOutput,
  CompilerOutputError,
} from "../../../../types/solidity/compiler-io.js";
import type { SolidityBuildInfo } from "../../../../types/solidity.js";

import os from "node:os";
import path from "node:path";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import {
  getAllDirectoriesMatching,
  getAllFilesMatching,
  isDirectory,
  readJsonFile,
  remove,
  writeUtf8File,
} from "@ignored/hardhat-vnext-utils/fs";
import { shortenPath } from "@ignored/hardhat-vnext-utils/path";
import { pluralize } from "@ignored/hardhat-vnext-utils/string";
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
import { Cache } from "./cache.js";
import { CompilationJobImplementation } from "./compilation-job.js";
import { downloadConfiguredCompilers, getCompiler } from "./compiler/index.js";
import { buildDependencyGraph } from "./dependency-graph-building.js";
import {
  formatRootPath,
  isNpmParsedRootPath,
  npmModuleToNpmRootPath,
  parseRootPath,
} from "./root-paths-utils.js";
import { SolcConfigSelector } from "./solc-config-selection.js";

const log = debug("hardhat:core:solidity:build-system");

export interface SolidityBuildSystemOptions {
  readonly solidityConfig: SolidityConfig;
  readonly projectRoot: string;
  readonly soliditySourcesPaths: string[];
  readonly artifactsPath: string;
  readonly cachePath: string;
}

export class SolidityBuildSystemImplementation implements SolidityBuildSystem {
  readonly #options: SolidityBuildSystemOptions;
  readonly #compilerOutputCache: Cache;
  readonly #artifactsCache: Cache;
  readonly #defaultConcurrency = Math.max(os.cpus().length - 1, 1);
  #downloadedCompilers = false;

  constructor(options: SolidityBuildSystemOptions) {
    this.#options = options;
    this.#compilerOutputCache = new Cache(
      options.cachePath,
      "hardhat.core.solidity.build-system.compiler-output",
    );
    this.#artifactsCache = new Cache(
      options.cachePath,
      "hardhat.core.solidity.build-system.artifacts",
    );
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

    const dependenciesToCompile =
      this.#options.solidityConfig.dependenciesToCompile.map(
        npmModuleToNpmRootPath,
      );

    return [...localFilesToCompile, ...dependenciesToCompile];
  }

  public async build(
    rootFilePaths: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>> {
    if (options?.quiet !== true) {
      console.log("Compiling your Solidity contracts");
    }

    await this.#downloadConfiguredCompilers(options?.quiet);

    const compilationJobsPerFile = await this.getCompilationJobs(
      rootFilePaths,
      options,
    );

    if (!(compilationJobsPerFile instanceof Map)) {
      return compilationJobsPerFile;
    }

    const compilationJobs = [...new Set(compilationJobsPerFile.values())];

    const runCompilationJobOptions: RunCompilationJobOptions = {
      force: options?.force,
      quiet: options?.quiet,
    };
    const results: Array<CompilerOutput | undefined> = await pMap(
      compilationJobs,
      async (compilationJob) =>
        (await this.#artifactsCache.has(compilationJob.getBuildId()))
          ? undefined
          : this.runCompilationJob(compilationJob, runCompilationJobOptions),
      {
        concurrency: options?.concurrency ?? this.#defaultConcurrency,
        // An error when running the compiler is not a compilation failure, but
        // a fatal failure trying to run it, so we just throw on the first error
        stopOnError: true,
      },
    );

    const isSuccessfulBuild = results.every(
      (result) => result === undefined || !this.#hasCompilationErrors(result),
    );

    const contractArtifactsGeneratedByCompilationJob: Map<
      CompilationJob,
      ReadonlyMap<string, string[]>
    > = new Map();

    if (isSuccessfulBuild) {
      log("Emitting artifacts of successful build");
      const emitArtifactsOptions: EmitArtifactsOptions = {
        force: options?.force,
        quiet: options?.quiet,
      };
      await Promise.all(
        compilationJobs.map(async (compilationJob, i) => {
          const result = results[i];
          let artifactsPerFile;
          if (result === undefined) {
            const cachedFiles = await this.#artifactsCache.getFiles(
              compilationJob.getBuildId(),
              this.#options.artifactsPath,
            );

            assertHardhatInvariant(
              cachedFiles !== undefined,
              "We checked if the compilation job was cached before",
            );

            artifactsPerFile =
              await this.#groupEmitArtifactsResults(cachedFiles);
          } else {
            artifactsPerFile = await this.emitArtifacts(
              compilationJob,
              result,
              emitArtifactsOptions,
            );
          }

          contractArtifactsGeneratedByCompilationJob.set(
            compilationJob,
            artifactsPerFile,
          );
        }),
      );
    }

    const resultsMap: Map<string, FileBuildResult> = new Map();

    for (let i = 0; i < compilationJobs.length; i++) {
      const compilationJob = compilationJobs[i];
      const result = results[i];

      const contractArtifactsGenerated = isSuccessfulBuild
        ? contractArtifactsGeneratedByCompilationJob.get(compilationJob)
        : new Map();

      assertHardhatInvariant(
        contractArtifactsGenerated !== undefined,
        "We emitted contract artifacts for all the jobs if the build was successful",
      );

      const buildId = compilationJob.getBuildId();

      const errors =
        result !== undefined
          ? await Promise.all(
              (result.errors ?? []).map((error) =>
                this.remapCompilerError(compilationJob, error, true),
              ),
            )
          : [];

      this.#printSolcErrorsAndWarnings(errors);

      const successfulResult =
        result === undefined || !this.#hasCompilationErrors(result);

      for (const [publicSourceName, root] of compilationJob.dependencyGraph
        .getRoots()
        .entries()) {
        if (!successfulResult) {
          resultsMap.set(formatRootPath(publicSourceName, root), {
            type: FileBuildResultType.BUILD_FAILURE,
            buildId,
            errors,
          });

          continue;
        }

        if (result === undefined) {
          resultsMap.set(formatRootPath(publicSourceName, root), {
            type: FileBuildResultType.CACHE_HIT,
            buildId,
            contractArtifactsGenerated:
              contractArtifactsGenerated.get(publicSourceName) ?? [],
          });

          continue;
        }

        resultsMap.set(formatRootPath(publicSourceName, root), {
          type: FileBuildResultType.BUILD_SUCCESS,
          buildId,
          contractArtifactsGenerated:
            contractArtifactsGenerated.get(publicSourceName) ?? [],
          warnings: errors,
        });
      }
    }

    if (options?.quiet !== true) {
      if (isSuccessfulBuild) {
        this.#printCompilationResult(compilationJobs);
      }
    }

    return resultsMap;
  }

  public async getCompilationJobs(
    rootFilePaths: string[],
    options?: GetCompilationJobsOptions,
  ): Promise<CompilationJobCreationError | Map<string, CompilationJob>> {
    await this.#downloadConfiguredCompilers(options?.quiet);

    const { dependencyGraph, resolver } = await buildDependencyGraph(
      rootFilePaths.toSorted(), // We sort them to have a deterministic order
      this.#options.projectRoot,
      this.#options.solidityConfig.remappings,
    );

    const buildProfileName = options?.buildProfile ?? DEFAULT_BUILD_PROFILE;

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
        `Building compilation job for root file ${rootFile} with source name ${resolvedFile.sourceName}`,
      );

      const subgraph = dependencyGraph.getSubgraph(rootFile);

      const configOrError =
        solcConfigSelector.selectBestSolcConfigForSingleRootGraph(subgraph);

      if ("reason" in configOrError) {
        return configOrError;
      }

      subgraphsWithConfig.push([configOrError, subgraph]);
    }

    if (options?.mergeCompilationJobs === true) {
      log(`Merging compilation jobs`);

      const mergedSubgraphsByConfig: Map<
        SolcConfig,
        DependencyGraphImplementation
      > = new Map();

      // Note: This groups the subgraphs by solc config. It compares the configs
      // based on reference, and not by deep equality. It misses some merging
      // opportunities, but this is Hardhat v2's behavior and works well enough.
      for (const [solcConfig, subgraph] of subgraphsWithConfig) {
        const mergedSubgraph = mergedSubgraphsByConfig.get(solcConfig);

        if (mergedSubgraph === undefined) {
          mergedSubgraphsByConfig.set(solcConfig, subgraph);
        } else {
          mergedSubgraphsByConfig.set(
            solcConfig,
            mergedSubgraph.merge(subgraph),
          );
        }
      }

      subgraphsWithConfig = [...mergedSubgraphsByConfig.entries()];
    }

    const solcVersionToLongVersion = new Map<string, string>();

    const compilationJobsPerFile = new Map<string, CompilationJob>();
    for (const [solcConfig, subgraph] of subgraphsWithConfig) {
      let solcLongVersion = solcVersionToLongVersion.get(solcConfig.version);

      if (solcLongVersion === undefined) {
        const compiler = await getCompiler(solcConfig.version);
        solcLongVersion = compiler.longVersion;
        solcVersionToLongVersion.set(solcConfig.version, solcLongVersion);
      }

      const compilationJob = new CompilationJobImplementation(
        subgraph,
        solcConfig,
        solcLongVersion,
        resolver.getRemappings(), // TODO: Only get the ones relevant to the subgraph?
      );

      for (const [publicSourceName, root] of subgraph.getRoots().entries()) {
        compilationJobsPerFile.set(
          formatRootPath(publicSourceName, root),
          compilationJob,
        );
      }
    }

    return compilationJobsPerFile;
  }

  public async runCompilationJob(
    compilationJob: CompilationJob,
    options?: RunCompilationJobOptions,
  ): Promise<CompilerOutput> {
    const buildId = compilationJob.getBuildId();

    if (options?.force !== true) {
      const cachedCompilerOutput =
        await this.#compilerOutputCache.getJson<CompilerOutput>(buildId);
      if (cachedCompilerOutput !== undefined) {
        log(`Using cached compiler output for build ${buildId}`);
        return cachedCompilerOutput;
      }
    }

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

    const compilerOutput = await compiler.compile(
      compilationJob.getSolcInput(),
    );

    if (!this.#hasCompilationErrors(compilerOutput)) {
      await this.#compilerOutputCache.setJson(buildId, compilerOutput);
    }

    return compilerOutput;
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
        (_match, prefix, sourceName) => {
          const file =
            compilationJob.dependencyGraph.getFileBySourceName(sourceName);

          if (file === undefined) {
            return `${prefix}${sourceName}`;
          }

          const replacement = shouldShortenPaths
            ? shortenPath(file.fsPath)
            : file.fsPath;

          return `${prefix}${replacement}`;
        },
      ),
    };
  }

  async #groupEmitArtifactsResults(
    filePaths: string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    for (const filePath of filePaths) {
      const relativePath = path.relative(this.#options.artifactsPath, filePath);
      if (
        path.dirname(relativePath) === "build-info" ||
        path.basename(relativePath) === "artifacts.d.ts"
      ) {
        continue;
      }
      if (await isDirectory(filePath)) {
        result.set(relativePath, []);
      } else {
        const publicSourceName = path.dirname(relativePath);
        const paths = result.get(publicSourceName) ?? [];
        paths.push(filePath);
        result.set(publicSourceName, paths);
      }
    }

    return result;
  }

  public async emitArtifacts(
    compilationJob: CompilationJob,
    compilerOutput: CompilerOutput,
    options?: EmitArtifactsOptions,
  ): Promise<ReadonlyMap<string, string[]>> {
    const result = new Map<string, string[]>();
    const buildId = compilationJob.getBuildId();

    if (options?.force !== true) {
      const cachedFiles = await this.#artifactsCache.getFiles(
        buildId,
        this.#options.artifactsPath,
      );
      if (cachedFiles !== undefined) {
        log(`Using cached artifacts for build ${buildId}`);
        return this.#groupEmitArtifactsResults(cachedFiles);
      }
    }

    const filesToCache: string[] = [];

    // We emit the artifacts for each root file, first emitting one artifact
    // for each contract, and then one declaration file for the entire file,
    // which defines their types and augments the ArtifactMap type.
    for (const [publicSourceName, root] of compilationJob.dependencyGraph
      .getRoots()
      .entries()) {
      const fileFolder = path.join(
        this.#options.artifactsPath,
        publicSourceName,
      );

      // If the folder exists, we remove it first, as we don't want to leave
      // any old artifacts there.
      await remove(fileFolder);

      const contracts = compilerOutput.contracts?.[root.sourceName];
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
            compilationJob.getBuildId(),
            publicSourceName,
            root.sourceName,
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

      result.set(publicSourceName, paths);

      const artifactsDeclarationFilePath = path.join(
        fileFolder,
        "artifacts.d.ts",
      );

      const artifactsDeclarationFile = getArtifactsDeclarationFile(artifacts);

      await writeUtf8File(
        artifactsDeclarationFilePath,
        artifactsDeclarationFile,
      );

      if (paths.length === 0) {
        filesToCache.push(
          path.join(this.#options.artifactsPath, publicSourceName),
        );
      } else {
        filesToCache.push(...paths);
      }
      filesToCache.push(artifactsDeclarationFilePath);
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
    // concurrently, and keep their lifetimes sperated and small.
    await Promise.all([
      (async () => {
        const buildInfo = getBuildInfo(compilationJob);

        await writeUtf8File(
          buildInfoPath,
          // TODO: Maybe formatting the build info is slow, but it's mostly
          // strings, so it probably shouldn't be a problem.
          JSON.stringify(buildInfo, undefined, 2),
        );
      })(),
      (async () => {
        const buildInfoOutput = getBuildInfoOutput(
          compilationJob,
          compilerOutput,
        );

        await writeUtf8File(
          buildInfoOutputPath,
          JSON.stringify(buildInfoOutput),
        );
      })(),
    ]);

    filesToCache.push(buildInfoPath, buildInfoOutputPath);

    await this.#artifactsCache.setFiles(
      buildId,
      this.#options.artifactsPath,
      filesToCache,
    );

    return result;
  }

  public async cleanupArtifacts(rootFilePaths: string[]): Promise<void> {
    log(`Cleaning up artifacts`);

    const publicSourceNames = rootFilePaths.map((rootFilePath) => {
      const parsed = parseRootPath(rootFilePath);
      return isNpmParsedRootPath(parsed)
        ? parsed.npmPath
        : path.relative(this.#options.projectRoot, parsed.fsPath);
    });

    const publicSourceNamesSet = new Set(publicSourceNames);

    for (const file of await getAllDirectoriesMatching(
      this.#options.artifactsPath,
      (d) => d.endsWith(".sol"),
    )) {
      const relativePath = path.relative(this.#options.artifactsPath, file);

      if (!publicSourceNamesSet.has(relativePath)) {
        await remove(file);
      }
    }

    const artifactPaths = await getAllFilesMatching(
      this.#options.artifactsPath,
      (f) =>
        !f.startsWith(path.join(this.#options.artifactsPath, "build-info")) &&
        f.endsWith(".json"),
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
    const buildInfoFiles = await getAllFilesMatching(
      this.#options.artifactsPath,
      (f) => f.startsWith(path.join(this.#options.artifactsPath, "build-info")),
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

  #printCompilationResult(compilationJobs: CompilationJob[]) {
    const jobsPerVersionAndEvmVersion = new Map<
      string,
      Map<string, CompilationJob[]>
    >();

    for (const job of compilationJobs) {
      const solcVersion = job.solcConfig.version;
      const evmVersion =
        job.getSolcInput().settings.evmVersion ??
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
