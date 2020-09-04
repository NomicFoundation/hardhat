import { flatten, isEqual } from "lodash";
import semver from "semver";

import { SolidityFilesCache } from "../../builtin-tasks/utils/solidity-files-cache";
import { MultiSolcConfig, SolcConfig } from "../../types";

import {
  getMatchingCompilerConfig,
  MatchingCompilerFailure,
} from "./compilerMatch";
import { DependencyGraph } from "./dependencyGraph";
import { ResolvedFile } from "./resolver";

// this should have a proper version range when it's fixed
const SOLC_BUG_9573_VERSIONS = "*";

export class CompilationGroup {
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

  public merge(group: CompilationGroup): CompilationGroup {
    if (!isEqual(this.solidityConfig, group.solidityConfig)) {
      // TODO-HH throw a BuidlerError
      // tslint:disable only-buidler-error
      throw new Error("should not happen");
    }
    const mergedGroups = new CompilationGroup(group.solidityConfig);
    for (const { file, emitsArtifacts } of this._filesToCompile.values()) {
      mergedGroups.addFileToCompile(file, emitsArtifacts);
    }
    for (const { file, emitsArtifacts } of group._filesToCompile.values()) {
      mergedGroups.addFileToCompile(file, emitsArtifacts);
    }
    return mergedGroups;
  }

  /**
   * Check if some file in the group has changed, or if the config of the group
   * is different from the last one that was used for that file
   */
  public hasChanged(cache: SolidityFilesCache): boolean {
    return this.getResolvedFiles().some((file) =>
      hasChangedSinceLastCompilation(file, cache, this.solidityConfig)
    );
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

    if (fileToCompile === undefined) {
      // TODO-HH throw a BuidlerError
      // tslint:disable only-buidler-error
      throw new Error("Unknown file");
    }

    return fileToCompile.emitsArtifacts;
  }
}

function hasChangedSinceLastCompilation(
  file: ResolvedFile,
  solidityFilesCache: SolidityFilesCache,
  config?: SolcConfig
): boolean {
  const fileCache = solidityFilesCache[file.absolutePath];

  if (fileCache === undefined) {
    // new file or no cache available, assume it's new
    return true;
  }

  if (fileCache.lastModificationDate < file.lastModificationDate.valueOf()) {
    return true;
  }

  if (config !== undefined && !isEqual(config, fileCache.solcConfig)) {
    return true;
  }

  return false;
}

export interface CompilationGroupsSuccess {
  groups: CompilationGroup[];
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

class CompilationGroupMerger {
  private _compilationGroups: Map<SolcConfig, CompilationGroup[]> = new Map();

  constructor(private _isMergeable: SolidityConfigPredicate) {}

  public getCompilationGroups(): CompilationGroup[] {
    return flatten([...this._compilationGroups.values()]);
  }

  public addCompilationGroup(compilationGroup: CompilationGroup) {
    const groups = this._compilationGroups.get(compilationGroup.solidityConfig);
    if (this._isMergeable(compilationGroup.solidityConfig)) {
      if (groups === undefined) {
        this._compilationGroups.set(compilationGroup.solidityConfig, [
          compilationGroup,
        ]);
      } else if (groups.length === 1) {
        const mergedGroups = groups[0].merge(compilationGroup);
        this._compilationGroups.set(compilationGroup.solidityConfig, [
          mergedGroups,
        ]);
      } else {
        // TODO-HH throw a BuidlerError
        // tslint:disable only-buidler-error
        throw new Error("should not happen");
      }
    } else {
      if (groups === undefined) {
        this._compilationGroups.set(compilationGroup.solidityConfig, [
          compilationGroup,
        ]);
      } else {
        this._compilationGroups.set(compilationGroup.solidityConfig, [
          ...groups,
          compilationGroup,
        ]);
      }
    }
  }
}

/**
 * Creates a list of compilation groups from a dependency graph. Returns the
 * list of compilation groups on success, and a list of non-compilable files on
 * failure.
 */
export async function getCompilationGroupsFromDependencyGraph(
  dependencyGraph: DependencyGraph,
  getFromFile: (
    file: ResolvedFile
  ) => Promise<CompilationGroup | MatchingCompilerFailure>
): Promise<CompilationGroupsResult> {
  const connectedComponents = dependencyGraph.getConnectedComponents();

  const compilationGroups: CompilationGroup[] = [];
  const failures: CompilationGroupsFailure = {
    nonCompilable: [],
    nonCompilableOverriden: [],
    importsIncompatibleFile: [],
    other: [],
  };

  let someFailure = false;
  for (const connectedComponent of connectedComponents) {
    for (const file of connectedComponent.getResolvedFiles()) {
      const compilationGroupOrFailure = await getFromFile(file);

      // if the file cannot be compiled, we add it to the list and continue in
      // case there are more non-compilable files
      if ("reason" in compilationGroupOrFailure) {
        someFailure = true;
        failures[compilationGroupOrFailure.reason].push(file.globalName);
        continue;
      }

      compilationGroups.push(compilationGroupOrFailure);
    }
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
  dependencyGraph: DependencyGraph,
  file: ResolvedFile,
  solidityConfig: MultiSolcConfig
): Promise<CompilationGroup | MatchingCompilerFailure> {
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
  const compilationGroup = new CompilationGroup(compilerConfig.config);

  compilationGroup.addFileToCompile(file, true);
  for (const dependency of transitiveDependencies) {
    compilationGroup.addFileToCompile(dependency, false);
  }

  return compilationGroup;
}

/**
 * Merge compilation groups affected by the solc #9573 bug
 */
export function mergeCompilationGroupsWithBug(
  compilationGroups: CompilationGroup[]
): CompilationGroup[] {
  const merger = new CompilationGroupMerger(
    (solcConfig) =>
      solcConfig.optimizer?.enabled === true &&
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
  compilationGroups: CompilationGroup[]
): CompilationGroup[] {
  const merger = new CompilationGroupMerger(
    (solcConfig) =>
      solcConfig.optimizer?.enabled !== true ||
      !semver.satisfies(solcConfig.version, SOLC_BUG_9573_VERSIONS)
  );
  for (const group of compilationGroups) {
    merger.addCompilationGroup(group);
  }

  const mergedCompilationGroups = merger.getCompilationGroups();

  return mergedCompilationGroups;
}
