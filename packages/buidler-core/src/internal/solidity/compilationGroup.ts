import debug from "debug";
import type { LoDashStatic } from "lodash";
import semver from "semver";

import { SolidityFilesCache } from "../../builtin-tasks/utils/solidity-files-cache";
import { MultiSolcConfig, SolcConfig } from "../../types";
import { assertBuidlerInvariant } from "../core/errors";

import { IDependencyGraph } from "./dependencyGraph";
import { ResolvedFile } from "./resolver";

const log = debug("buidler:core:compilation-group");

// this should have a proper version range when it's fixed
const SOLC_BUG_9573_VERSIONS = "*";

export interface ICompilationGroup {
  emitsArtifacts: (file?: ResolvedFile) => boolean;
  getResolvedFiles: () => ResolvedFile[];
  getVersion: () => string;
  merge: (other: ICompilationGroup) => ICompilationGroup;
  getSolcConfig: () => SolcConfig;
}

export interface CompilationGroupsSuccess {
  groups: ICompilationGroup[];
}

export type CompilationGroupsFailure = Record<
  MatchingCompilerFailure["reason"],
  string[]
>;

export function isCompilationGroupsSuccess(
  result: CompilationGroupsResult
): result is CompilationGroupsSuccess {
  return "groups" in result;
}

export function isCompilationGroupsFailure(
  result: CompilationGroupsResult
): result is CompilationGroupsFailure {
  return !isCompilationGroupsSuccess(result);
}

export type CompilationGroupsResult =
  | CompilationGroupsSuccess
  | CompilationGroupsFailure;

type SolidityConfigPredicate = (config: SolcConfig) => boolean;

export interface MatchingCompilerFailure {
  reason:
    | "nonCompilable"
    | "nonCompilableOverriden"
    | "importsIncompatibleFile"
    | "other";
}

export class CompilationGroup implements ICompilationGroup {
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

  public merge(group: ICompilationGroup): ICompilationGroup {
    const { isEqual }: LoDashStatic = require("lodash");
    assertBuidlerInvariant(
      isEqual(this.solidityConfig, group.getSolcConfig()),
      "Merging groups with different solidity configurations"
    );
    const mergedGroups = new CompilationGroup(
      group.getSolcConfig(),
      this._cache
    );
    for (const file of this.getResolvedFiles()) {
      mergedGroups.addFileToCompile(file, this.emitsArtifacts(file));
    }
    for (const file of group.getResolvedFiles()) {
      mergedGroups.addFileToCompile(file, group.emitsArtifacts(file));
    }
    return mergedGroups;
  }

  public getSolcConfig(): SolcConfig {
    return this.solidityConfig;
  }

  public isEmpty() {
    return this._filesToCompile.size === 0;
  }

  public getVersion() {
    return this.solidityConfig.version;
  }

  public getResolvedFiles(): ResolvedFile[] {
    return [...this._filesToCompile.values()].map((x) => x.file);
  }

  /**
   * Check if the given file emits artifacts.
   *
   * If no file is given, check if *some* file in the group emits artifacts.
   */
  public emitsArtifacts(file?: ResolvedFile): boolean {
    if (file === undefined) {
      return [...this._filesToCompile.values()].some((x) => x.emitsArtifacts);
    }

    const fileToCompile = this._filesToCompile.get(file.globalName);

    assertBuidlerInvariant(
      fileToCompile !== undefined,
      `File '${file.globalName}' does not exist in this compilation group`
    );

    return fileToCompile.emitsArtifacts;
  }
}

class CompilationGroupMerger {
  private _compilationGroups: Map<SolcConfig, ICompilationGroup[]> = new Map();

  constructor(private _isMergeable: SolidityConfigPredicate) {}

  public getCompilationGroups(): ICompilationGroup[] {
    const { flatten }: LoDashStatic = require("lodash");

    return flatten([...this._compilationGroups.values()]);
  }

  public addCompilationGroup(compilationGroup: ICompilationGroup) {
    const groups = this._compilationGroups.get(
      compilationGroup.getSolcConfig()
    );

    if (this._isMergeable(compilationGroup.getSolcConfig())) {
      if (groups === undefined) {
        this._compilationGroups.set(compilationGroup.getSolcConfig(), [
          compilationGroup,
        ]);
      } else if (groups.length === 1) {
        const mergedGroups = groups[0].merge(compilationGroup);
        this._compilationGroups.set(compilationGroup.getSolcConfig(), [
          mergedGroups,
        ]);
      } else {
        assertBuidlerInvariant(
          false,
          "More than one mergeable group was added for the same configuration"
        );
      }
    } else {
      if (groups === undefined) {
        this._compilationGroups.set(compilationGroup.getSolcConfig(), [
          compilationGroup,
        ]);
      } else {
        this._compilationGroups.set(compilationGroup.getSolcConfig(), [
          ...groups,
          compilationGroup,
        ]);
      }
    }
  }
}

/**
 * Creates a list of compilation groups from a dependency graph. *This function
 * assumes that the given graph is a connected component*.
 * Returns the list of compilation groups on success, and a list of
 * non-compilable files on failure.
 */
export async function getCompilationGroupsFromConnectedComponent(
  connectedComponent: IDependencyGraph,
  getFromFile: (
    file: ResolvedFile
  ) => Promise<ICompilationGroup | MatchingCompilerFailure>
): Promise<CompilationGroupsResult> {
  const compilationGroups: ICompilationGroup[] = [];
  const failures: CompilationGroupsFailure = {
    nonCompilable: [],
    nonCompilableOverriden: [],
    importsIncompatibleFile: [],
    other: [],
  };

  let someFailure = false;
  for (const file of connectedComponent.getResolvedFiles()) {
    const compilationGroupOrFailure = await getFromFile(file);

    // if the file cannot be compiled, we add it to the list and continue in
    // case there are more non-compilable files
    if ("reason" in compilationGroupOrFailure) {
      log(
        `'${file.absolutePath}' couldn't be compiled. Reason: '${compilationGroupOrFailure.reason}'`
      );
      someFailure = true;
      failures[compilationGroupOrFailure.reason].push(file.globalName);
      continue;
    }

    compilationGroups.push(compilationGroupOrFailure);
  }

  if (someFailure) {
    return failures;
  }

  const mergedCompilationGroups = mergeCompilationGroupsWithBug(
    compilationGroups
  );

  return { groups: mergedCompilationGroups };
}

export async function getCompilationGroupFromFile(
  dependencyGraph: IDependencyGraph,
  file: ResolvedFile,
  solidityConfig: MultiSolcConfig,
  cache: SolidityFilesCache
): Promise<ICompilationGroup | MatchingCompilerFailure> {
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

  const compilationGroup = new CompilationGroup(compilerConfig, cache);

  compilationGroup.addFileToCompile(file, true);
  for (const dependency of transitiveDependencies) {
    log(
      `File '${dependency.absolutePath}' added as dependency of '${file.absolutePath}'`
    );
    compilationGroup.addFileToCompile(dependency, false);
  }

  return compilationGroup;
}

/**
 * Merge compilation groups affected by the solc #9573 bug
 */
export function mergeCompilationGroupsWithBug(
  compilationGroups: ICompilationGroup[]
): ICompilationGroup[] {
  const merger = new CompilationGroupMerger(
    (solcConfig) =>
      solcConfig?.settings?.optimizer?.enabled === true &&
      semver.satisfies(solcConfig.version, SOLC_BUG_9573_VERSIONS)
  );
  for (const group of compilationGroups) {
    merger.addCompilationGroup(group);
  }

  const mergedCompilationGroups = merger.getCompilationGroups();

  return mergedCompilationGroups;
}

/**
 * Merge compilation groups not affected by the solc #9573 bug
 */
export function mergeCompilationGroupsWithoutBug(
  compilationGroups: ICompilationGroup[]
): ICompilationGroup[] {
  const merger = new CompilationGroupMerger(
    (solcConfig) =>
      solcConfig?.settings?.optimizer?.enabled !== true ||
      !semver.satisfies(solcConfig.version, SOLC_BUG_9573_VERSIONS)
  );
  for (const group of compilationGroups) {
    merger.addCompilationGroup(group);
  }

  const mergedCompilationGroups = merger.getCompilationGroups();

  return mergedCompilationGroups;
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
