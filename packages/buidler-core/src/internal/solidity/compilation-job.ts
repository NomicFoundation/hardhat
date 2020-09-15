import debug from "debug";
import type { LoDashStatic } from "lodash";
import semver from "semver";

import { SolidityFilesCache } from "../../builtin-tasks/utils/solidity-files-cache";
import { MultiSolcConfig, SolcConfig } from "../../types";
import { assertBuidlerInvariant } from "../core/errors";

import { IDependencyGraph } from "./dependencyGraph";
import { ResolvedFile } from "./resolver";

const log = debug("buidler:core:compilation-job");

// this should have a proper version range when it's fixed
const SOLC_BUG_9573_VERSIONS = "*";

export interface ICompilationJob {
  emitsArtifacts(file?: ResolvedFile): boolean;
  getResolvedFiles(): ResolvedFile[];
  merge(other: ICompilationJob): ICompilationJob;
  getSolcConfig(): SolcConfig;
}

export interface CompilationJobsSuccess {
  jobs: ICompilationJob[];
}

export type CompilationJobsFailure = Record<
  MatchingCompilerFailure["reason"],
  string[]
>;

export function isCompilationJobsSuccess(
  result: CompilationJobsResult
): result is CompilationJobsSuccess {
  return "jobs" in result;
}

export function isCompilationJobsFailure(
  result: CompilationJobsResult
): result is CompilationJobsFailure {
  return !isCompilationJobsSuccess(result);
}

export type CompilationJobsResult =
  | CompilationJobsSuccess
  | CompilationJobsFailure;

type SolidityConfigPredicate = (config: SolcConfig) => boolean;

export interface MatchingCompilerFailure {
  reason:
    | "nonCompilable"
    | "nonCompilableOverriden"
    | "importsIncompatibleFile"
    | "other";
}

export class CompilationJob implements ICompilationJob {
  private _filesToCompile: Map<
    string,
    { file: ResolvedFile; emitsArtifacts: boolean }
  > = new Map();

  constructor(
    public solidityConfig: SolcConfig,
    private _cache: SolidityFilesCache
  ) {}

  public addFileToCompile(file: ResolvedFile, emitsArtifacts: boolean) {
    const fileToCompile = this._filesToCompile.get(file.globalName);

    // if the file doesn't exist, we add it
    // we also add it if emitsArtifacts is true, to override it in case it was
    // previously added but with a false emitsArtifacts
    if (fileToCompile === undefined || emitsArtifacts) {
      this._filesToCompile.set(file.globalName, { file, emitsArtifacts });
    }
  }

  public merge(job: ICompilationJob): ICompilationJob {
    const { isEqual }: LoDashStatic = require("lodash");
    assertBuidlerInvariant(
      isEqual(this.solidityConfig, job.getSolcConfig()),
      "Merging jobs with different solidity configurations"
    );
    const mergedJobs = new CompilationJob(job.getSolcConfig(), this._cache);
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
  public emitsArtifacts(file?: ResolvedFile): boolean {
    if (file === undefined) {
      return [...this._filesToCompile.values()].some((x) => x.emitsArtifacts);
    }

    const fileToCompile = this._filesToCompile.get(file.globalName);

    assertBuidlerInvariant(
      fileToCompile !== undefined,
      `File '${file.globalName}' does not exist in this compilation job`
    );

    return fileToCompile.emitsArtifacts;
  }
}

class CompilationJobsMerger {
  private _compilationJobs: Map<SolcConfig, ICompilationJob[]> = new Map();

  constructor(private _isMergeable: SolidityConfigPredicate) {}

  public getCompilationJobs(): ICompilationJob[] {
    const { flatten }: LoDashStatic = require("lodash");

    return flatten([...this._compilationJobs.values()]);
  }

  public addCompilationJob(compilationJob: ICompilationJob) {
    const jobs = this._compilationJobs.get(compilationJob.getSolcConfig());

    if (this._isMergeable(compilationJob.getSolcConfig())) {
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
export async function getCompilationJobsFromConnectedComponent(
  connectedComponent: IDependencyGraph,
  getFromFile: (
    file: ResolvedFile
  ) => Promise<ICompilationJob | MatchingCompilerFailure>
): Promise<CompilationJobsResult> {
  const compilationJobs: ICompilationJob[] = [];
  const failures: CompilationJobsFailure = {
    nonCompilable: [],
    nonCompilableOverriden: [],
    importsIncompatibleFile: [],
    other: [],
  };

  let someFailure = false;
  for (const file of connectedComponent.getResolvedFiles()) {
    const compilationJobOrFailure = await getFromFile(file);

    // if the file cannot be compiled, we add it to the list and continue in
    // case there are more non-compilable files
    if ("reason" in compilationJobOrFailure) {
      log(
        `'${file.absolutePath}' couldn't be compiled. Reason: '${compilationJobOrFailure.reason}'`
      );
      someFailure = true;
      failures[compilationJobOrFailure.reason].push(file.globalName);
      continue;
    }

    compilationJobs.push(compilationJobOrFailure);
  }

  if (someFailure) {
    return failures;
  }

  const mergedCompilationJobs = mergeCompilationJobsWithBug(compilationJobs);

  return { jobs: mergedCompilationJobs };
}

export async function getCompilationJobFromFile(
  dependencyGraph: IDependencyGraph,
  file: ResolvedFile,
  solidityConfig: MultiSolcConfig,
  cache: SolidityFilesCache
): Promise<ICompilationJob | MatchingCompilerFailure> {
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
  if ("reason" in compilerConfig) {
    return compilerConfig;
  }
  log(
    `File '${file.absolutePath}' will be compiled with version '${compilerConfig.version}'`
  );

  const compilationJob = new CompilationJob(compilerConfig, cache);

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
  compilationJobs: ICompilationJob[]
): ICompilationJob[] {
  const merger = new CompilationJobsMerger(
    (solcConfig) =>
      solcConfig?.settings?.optimizer?.enabled === true &&
      semver.satisfies(solcConfig.version, SOLC_BUG_9573_VERSIONS)
  );
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
  compilationJobs: ICompilationJob[]
): ICompilationJob[] {
  const merger = new CompilationJobsMerger(
    (solcConfig) =>
      solcConfig?.settings?.optimizer?.enabled !== true ||
      !semver.satisfies(solcConfig.version, SOLC_BUG_9573_VERSIONS)
  );
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
export function getMatchingCompilerConfig(
  file: ResolvedFile,
  directDependencies: ResolvedFile[],
  transitiveDependencies: ResolvedFile[],
  solidityConfig: MultiSolcConfig
): SolcConfig | MatchingCompilerFailure {
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
): MatchingCompilerFailure {
  const fileVersionRange = file.content.versionPragmas.join(" ");
  if (semver.maxSatisfying(compilerVersions, fileVersionRange) === null) {
    const reason = overriden ? "nonCompilableOverriden" : "nonCompilable";
    return { reason };
  }

  for (const dependency of directDependencies) {
    const dependencyVersionRange = dependency.content.versionPragmas.join(" ");
    if (!semver.intersects(fileVersionRange, dependencyVersionRange)) {
      return { reason: "importsIncompatibleFile" };
    }
  }

  return { reason: "other" };
}
