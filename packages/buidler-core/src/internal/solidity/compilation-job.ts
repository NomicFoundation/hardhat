import debug from "debug";
import type { LoDashStatic } from "lodash";
import semver from "semver";

import * as taskTypes from "../../builtin-tasks/types";
import { MultiSolcConfig, SolcConfig } from "../../types";
import { assertBuidlerInvariant } from "../core/errors";

import { ResolvedFile } from "./resolver";

const log = debug("buidler:core:compilation-job");

// this should have a proper version range when it's fixed
const SOLC_BUG_9573_VERSIONS = "*";

/**
 * An object with a list of successfully created jobs and a list of errors.
 * The `errors` entry maps error codes (that come from the
 * CompilationJobCreationError enum) to the source names of the files that
 * caused that error.
 */
export interface CompilationJobsCreationResult {
  jobs: taskTypes.CompilationJob[];
  errors: {
    [compilationJobCreationError: string]: string[];
  };
}

export type CompilationJobsCreationErrors = CompilationJobsCreationResult["errors"];

export enum CompilationJobCreationError {
  OTHER_ERROR = "other",
  NO_COMPATIBLE_SOLC_VERSION_FOUND = "no-compatible-solc-version-found",
  INCOMPATIBLE_OVERRIDEN_SOLC_VERSION = "incompatible-overriden-solc-version",
  IMPORTS_INCOMPATIBLE_FILE = "imports-incompatible-file",
}

function isCompilationJobCreationError(
  x: unknown
): x is CompilationJobCreationError {
  return typeof x === "string";
}

export class CompilationJob implements taskTypes.CompilationJob {
  private _filesToCompile: Map<
    string,
    { file: ResolvedFile; emitsArtifacts: boolean }
  > = new Map();

  constructor(public solidityConfig: SolcConfig) {}

  public addFileToCompile(file: ResolvedFile, emitsArtifacts: boolean) {
    const fileToCompile = this._filesToCompile.get(file.globalName);

    // if the file doesn't exist, we add it
    // we also add it if emitsArtifacts is true, to override it in case it was
    // previously added but with a false emitsArtifacts
    if (fileToCompile === undefined || emitsArtifacts) {
      this._filesToCompile.set(file.globalName, { file, emitsArtifacts });
    }
  }

  public hasSolc9573Bug(): boolean {
    return (
      this.solidityConfig?.settings?.optimizer?.enabled === true &&
      semver.satisfies(this.solidityConfig.version, SOLC_BUG_9573_VERSIONS)
    );
  }

  public merge(job: taskTypes.CompilationJob): taskTypes.CompilationJob {
    const { isEqual }: LoDashStatic = require("lodash");
    assertBuidlerInvariant(
      isEqual(this.solidityConfig, job.getSolcConfig()),
      "Merging jobs with different solidity configurations"
    );
    const mergedJobs = new CompilationJob(job.getSolcConfig());
    for (const file of this.getResolvedFiles()) {
      mergedJobs.addFileToCompile(file, this.emitsArtifacts(file));
    }
    for (const file of job.getResolvedFiles()) {
      mergedJobs.addFileToCompile(file, job.emitsArtifacts(file));
    }
    return mergedJobs;
  }

  public getSolcConfig(): SolcConfig {
    return this.solidityConfig;
  }

  public isEmpty() {
    return this._filesToCompile.size === 0;
  }

  public getResolvedFiles(): ResolvedFile[] {
    return [...this._filesToCompile.values()].map((x) => x.file);
  }

  /**
   * Check if the given file emits artifacts.
   *
   * If no file is given, check if *some* file in the job emits artifacts.
   */
  public emitsArtifacts(file: ResolvedFile): boolean {
    const fileToCompile = this._filesToCompile.get(file.globalName);

    assertBuidlerInvariant(
      fileToCompile !== undefined,
      `File '${file.globalName}' does not exist in this compilation job`
    );

    return fileToCompile.emitsArtifacts;
  }
}

class CompilationJobsMerger {
  private _compilationJobs: Map<
    SolcConfig,
    taskTypes.CompilationJob[]
  > = new Map();

  constructor(
    private _isMergeable: (job: taskTypes.CompilationJob) => boolean
  ) {}

  public getCompilationJobs(): taskTypes.CompilationJob[] {
    const { flatten }: LoDashStatic = require("lodash");

    return flatten([...this._compilationJobs.values()]);
  }

  public addCompilationJob(compilationJob: taskTypes.CompilationJob) {
    const jobs = this._compilationJobs.get(compilationJob.getSolcConfig());

    if (this._isMergeable(compilationJob)) {
      if (jobs === undefined) {
        this._compilationJobs.set(compilationJob.getSolcConfig(), [
          compilationJob,
        ]);
      } else if (jobs.length === 1) {
        const mergedJobs = jobs[0].merge(compilationJob);
        this._compilationJobs.set(compilationJob.getSolcConfig(), [mergedJobs]);
      } else {
        assertBuidlerInvariant(
          false,
          "More than one mergeable job was added for the same configuration"
        );
      }
    } else {
      if (jobs === undefined) {
        this._compilationJobs.set(compilationJob.getSolcConfig(), [
          compilationJob,
        ]);
      } else {
        this._compilationJobs.set(compilationJob.getSolcConfig(), [
          ...jobs,
          compilationJob,
        ]);
      }
    }
  }
}

/**
 * Creates a list of compilation jobs from a dependency graph. *This function
 * assumes that the given graph is a connected component*.
 * Returns the list of compilation jobs on success, and a list of
 * non-compilable files on failure.
 */
export async function createCompilationJobsFromConnectedComponent(
  connectedComponent: taskTypes.DependencyGraph,
  getFromFile: (
    file: ResolvedFile
  ) => Promise<taskTypes.CompilationJob | CompilationJobCreationError>
): Promise<CompilationJobsCreationResult> {
  const compilationJobs: taskTypes.CompilationJob[] = [];
  const errors: CompilationJobsCreationErrors = {};

  for (const file of connectedComponent.getResolvedFiles()) {
    const compilationJobOrError = await getFromFile(file);

    if (isCompilationJobCreationError(compilationJobOrError)) {
      log(
        `'${file.absolutePath}' couldn't be compiled. Reason: '${compilationJobOrError}'`
      );
      errors[compilationJobOrError] = errors[compilationJobOrError] ?? [];
      errors[compilationJobOrError].push(file.globalName);
      continue;
    }

    compilationJobs.push(compilationJobOrError);
  }

  const jobs = mergeCompilationJobsWithBug(compilationJobs);

  return { jobs, errors };
}

export async function createCompilationJobFromFile(
  dependencyGraph: taskTypes.DependencyGraph,
  file: ResolvedFile,
  solidityConfig: MultiSolcConfig
): Promise<taskTypes.CompilationJob | CompilationJobCreationError> {
  const directDependencies = dependencyGraph.getDependencies(file);
  const transitiveDependencies = dependencyGraph.getTransitiveDependencies(
    file
  );

  const compilerConfig = getMatchingCompilerConfig(
    file,
    directDependencies,
    transitiveDependencies,
    solidityConfig
  );

  // if the config cannot be obtained, we just return the failure
  if (isCompilationJobCreationError(compilerConfig)) {
    return compilerConfig;
  }
  log(
    `File '${file.absolutePath}' will be compiled with version '${compilerConfig.version}'`
  );

  const compilationJob = new CompilationJob(compilerConfig);

  compilationJob.addFileToCompile(file, true);
  for (const dependency of transitiveDependencies) {
    log(
      `File '${dependency.absolutePath}' added as dependency of '${file.absolutePath}'`
    );
    compilationJob.addFileToCompile(dependency, false);
  }

  return compilationJob;
}

/**
 * Merge compilation jobs affected by the solc #9573 bug
 */
export function mergeCompilationJobsWithBug(
  compilationJobs: taskTypes.CompilationJob[]
): taskTypes.CompilationJob[] {
  const merger = new CompilationJobsMerger((job) => job.hasSolc9573Bug());
  for (const job of compilationJobs) {
    merger.addCompilationJob(job);
  }

  const mergedCompilationJobs = merger.getCompilationJobs();

  return mergedCompilationJobs;
}

/**
 * Merge compilation jobs not affected by the solc #9573 bug
 */
export function mergeCompilationJobsWithoutBug(
  compilationJobs: taskTypes.CompilationJob[]
): taskTypes.CompilationJob[] {
  const merger = new CompilationJobsMerger((job) => !job.hasSolc9573Bug());
  for (const job of compilationJobs) {
    merger.addCompilationJob(job);
  }

  const mergedCompilationJobs = merger.getCompilationJobs();

  return mergedCompilationJobs;
}

/**
 * Return the compiler config that matches the given version ranges,
 * or a value indicating why the compiler couldn't be obtained.
 */
function getMatchingCompilerConfig(
  file: ResolvedFile,
  directDependencies: ResolvedFile[],
  transitiveDependencies: ResolvedFile[],
  solidityConfig: MultiSolcConfig
): SolcConfig | CompilationJobCreationError {
  const { uniq }: LoDashStatic = require("lodash");

  const transitiveDependenciesVersionPragmas = transitiveDependencies.map(
    (x) => x.content.versionPragmas
  );
  const versionRange = uniq([
    ...file.content.versionPragmas,
    ...transitiveDependenciesVersionPragmas,
  ]).join(" ");

  const overrides = solidityConfig.overrides ?? {};

  const overriddenCompiler = overrides[file.globalName];

  // if there's an override, we only check that
  if (overriddenCompiler !== undefined) {
    if (!semver.satisfies(overriddenCompiler.version, versionRange)) {
      return getMatchingCompilerFailure(
        file,
        directDependencies,
        [overriddenCompiler.version],
        true
      );
    }

    return overriddenCompiler;
  }

  // if there's no override, we find a compiler that matches the version range
  const compilerVersions = solidityConfig.compilers.map((x) => x.version);
  const matchingVersion = semver.maxSatisfying(compilerVersions, versionRange);

  if (matchingVersion === null) {
    return getMatchingCompilerFailure(
      file,
      directDependencies,
      compilerVersions,
      false
    );
  }

  const matchingConfig = solidityConfig.compilers.find(
    (x) => x.version === matchingVersion
  )!;

  return matchingConfig;
}

function getMatchingCompilerFailure(
  file: ResolvedFile,
  directDependencies: ResolvedFile[],
  compilerVersions: string[],
  overriden: boolean
): CompilationJobCreationError {
  const fileVersionRange = file.content.versionPragmas.join(" ");
  if (semver.maxSatisfying(compilerVersions, fileVersionRange) === null) {
    return overriden
      ? CompilationJobCreationError.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION
      : CompilationJobCreationError.NO_COMPATIBLE_SOLC_VERSION_FOUND;
  }

  for (const dependency of directDependencies) {
    const dependencyVersionRange = dependency.content.versionPragmas.join(" ");
    if (!semver.intersects(fileVersionRange, dependencyVersionRange)) {
      return CompilationJobCreationError.IMPORTS_INCOMPATIBLE_FILE;
    }
  }

  return CompilationJobCreationError.OTHER_ERROR;
}
