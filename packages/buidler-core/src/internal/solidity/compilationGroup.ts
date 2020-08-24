import { isEqual } from "lodash";

import { SolidityFilesCache } from "../../builtin-tasks/utils/solidity-files-cache";
import { MultiSolcConfig, SolcConfig } from "../../types";

import { getMatchingCompilerConfig } from "./compilerMatch";
import { DependencyGraph } from "./dependencyGraph";
import { ResolvedFile } from "./resolver";

enum CompilationLevel {
  NO_COMPILE,
  COMPILE,
  EMIT_ARTIFACTS,
}

// this will depend on the solidity version when this bug is fixed
const SOLC_BUG_9573 = true;

export class CompilationGroup {
  private _filesToCompile: Map<
    string,
    { file: ResolvedFile; compilationLevel: CompilationLevel }
  > = new Map();

  constructor(public solidityConfig: SolcConfig) {}

  public addFileToCompile(
    file: ResolvedFile,
    compilationLevel: CompilationLevel
  ) {
    const fileToCompile = this._filesToCompile.get(file.globalName);
    if (fileToCompile === undefined) {
      this._filesToCompile.set(file.globalName, { file, compilationLevel });
    } else {
      if (compilationLevel > fileToCompile.compilationLevel) {
        this._filesToCompile.set(file.globalName, {
          file,
          compilationLevel,
        });
      }
    }
  }

  public isEmpty() {
    return this._filesToCompile.size === 0;
  }

  public getVersion() {
    return this.solidityConfig.version;
  }

  public getFilesToCompile(): ResolvedFile[] {
    return [...this._filesToCompile.values()]
      .filter((x) => x.compilationLevel !== CompilationLevel.NO_COMPILE)
      .map((x) => x.file);
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
      return [...this._filesToCompile.values()].some(
        (x) => x.compilationLevel === CompilationLevel.EMIT_ARTIFACTS
      );
    }

    const fileToCompile = this._filesToCompile.get(file.globalName);

    if (fileToCompile === undefined) {
      // tslint:disable-next-line only-buidler-error
      throw new Error("Unknown file"); // TODO-HH use BuidlerError
    }

    return fileToCompile.compilationLevel === CompilationLevel.EMIT_ARTIFACTS;
  }

  public needsCompile(file: ResolvedFile): boolean {
    const fileToCompile = this._filesToCompile.get(file.globalName);

    if (fileToCompile === undefined) {
      // tslint:disable-next-line only-buidler-error
      throw new Error("Unknown file"); // TODO-HH use BuidlerError
    }

    return fileToCompile.compilationLevel > CompilationLevel.NO_COMPILE;
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

/**
 * Map solc configurations to compilation groups. Keys are deeply compared for
 * equality. Implementation is quadratic, but the number of compilers +
 * overrides shouldn't be huge.
 */
class CompilationGroupMap {
  private _compilationGroups: Map<SolcConfig, CompilationGroup> = new Map();

  public createGroup(config: SolcConfig) {
    this._getOrCreateGroup(config);
  }

  public addFileToGroup(
    config: SolcConfig,
    file: ResolvedFile,
    compilationLevel: CompilationLevel
  ) {
    const group = this._getOrCreateGroup(config);

    group.addFileToCompile(file, compilationLevel);
  }

  public getGroups(): CompilationGroup[] {
    return [...this._compilationGroups.values()];
  }

  private _getOrCreateGroup(config: SolcConfig): CompilationGroup {
    for (const [configKey, group] of this._compilationGroups.entries()) {
      if (isEqual(config, configKey)) {
        return group;
      }
    }

    const newGroup = new CompilationGroup(config);
    this._compilationGroups.set(config, newGroup);

    return newGroup;
  }
}

interface CompilationGroupsSuccess {
  groups: CompilationGroup[];
}

export interface CompilationGroupsFailure {
  nonCompilable: string[];
  nonCompilableOverriden: string[];
  importsIncompatibleFile: string[];
  other: string[];
}

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

/**
 * Creates a list of compilation groups. Returns the list of compilation groups
 * on success, and a list of non-compilable files on failure.
 */
export function createCompilationGroups(
  dependencyGraph: DependencyGraph,
  solidityConfig: MultiSolcConfig,
  solidityFilesCache: SolidityFilesCache,
  force: boolean
): CompilationGroupsResult {
  const overrides = solidityConfig.overrides ?? {};
  const compilationGroupMap = new CompilationGroupMap();

  const allCompilerConfigs = [
    ...solidityConfig.compilers,
    ...Object.values(overrides),
  ];

  for (const config of allCompilerConfigs) {
    compilationGroupMap.createGroup(config);
  }

  let compilationFailed = false;
  const compilationGroupsFailure: CompilationGroupsFailure = {
    nonCompilable: [],
    nonCompilableOverriden: [],
    importsIncompatibleFile: [],
    other: [],
  };

  for (const file of dependencyGraph.getResolvedFiles()) {
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

    // if the file cannot be compiled, we add it to the list and continue in
    // case there are more non-compilable files
    if (typeof compilerConfig === "string") {
      compilationFailed = true;

      if (compilerConfig === "NonCompilable") {
        compilationGroupsFailure.nonCompilable.push(file.globalName);
      } else if (compilerConfig === "NonCompilableOverriden") {
        compilationGroupsFailure.nonCompilableOverriden.push(file.globalName);
      } else if (compilerConfig === "ImportsIncompatibleFile") {
        compilationGroupsFailure.importsIncompatibleFile.push(file.globalName);
      } else {
        compilationGroupsFailure.other.push(file.globalName);
      }

      continue;
    }

    const changedSinceLastCompilation =
      hasChangedSinceLastCompilation(
        file,
        solidityFilesCache,
        compilerConfig
      ) ||
      transitiveDependencies.some((dependency) =>
        hasChangedSinceLastCompilation(dependency, solidityFilesCache)
      );

    const compilationLevel =
      force || changedSinceLastCompilation
        ? CompilationLevel.EMIT_ARTIFACTS
        : SOLC_BUG_9573
        ? CompilationLevel.COMPILE
        : CompilationLevel.NO_COMPILE;

    compilationGroupMap.addFileToGroup(compilerConfig, file, compilationLevel);

    if (compilationLevel !== CompilationLevel.NO_COMPILE) {
      for (const dependency of transitiveDependencies) {
        compilationGroupMap.addFileToGroup(
          compilerConfig,
          dependency,
          CompilationLevel.COMPILE
        );
      }
    }
  }

  if (compilationFailed) {
    return compilationGroupsFailure;
  }

  return { groups: [...compilationGroupMap.getGroups()] };
}
