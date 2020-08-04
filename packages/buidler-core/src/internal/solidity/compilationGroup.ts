import { flatten, isEqual } from "lodash";
import semver from "semver";

import { SolidityFilesCache } from "../../builtin-tasks/utils/solidity-files-cache";
import { MultiSolcConfig, SolcConfig } from "../../types";

import { DependencyGraph } from "./dependencyGraph";
import { ResolvedFile } from "./resolver";

export class CompilationGroup {
  private _filesToCompile: Map<ResolvedFile, boolean> = new Map();

  constructor(public solidityConfig: SolcConfig) {}

  public addFileToCompile(file: ResolvedFile, emitsArtifacts: boolean) {
    const alreadyEmitsArtifacts = this._filesToCompile.get(file);
    if (alreadyEmitsArtifacts === undefined) {
      this._filesToCompile.set(file, emitsArtifacts);
    } else {
      if (!alreadyEmitsArtifacts && emitsArtifacts) {
        this._filesToCompile.set(file, emitsArtifacts);
      }
    }
  }

  public isEmpty() {
    return this._filesToCompile.size === 0;
  }

  public getVersion() {
    return this.solidityConfig.version;
  }

  public getResolvedFiles(): ResolvedFile[] {
    return [...this._filesToCompile.keys()];
  }

  public emitsArtifacts(file: ResolvedFile): boolean {
    const emitsArtifacts = this._filesToCompile.get(file);

    if (emitsArtifacts === undefined) {
      // tslint:disable-next-line only-buidler-error
      throw new Error("Unknown file"); // TODO use BuidlerError
    }

    return emitsArtifacts;
  }
}

function hasChangedSinceLastCompilation(
  file: ResolvedFile,
  solidityFilesCache: SolidityFilesCache
): boolean {
  const result =
    solidityFilesCache[file.absolutePath] === undefined ||
    solidityFilesCache[file.absolutePath].lastModificationDate <
      file.lastModificationDate.valueOf();

  return result;
}

/**
 * Map solc configurations to compilation groups. Keys are deeply compared for
 * equality. Implementation is quadratic, but the number of compilers +
 * overrides shouldn't be huge.
 */
class CompilationGroupMap {
  private _compilationGroups: Map<SolcConfig, CompilationGroup> = new Map();

  public addGroup(config: SolcConfig) {
    this._getOrCreateGroup(config);
  }

  public addFileToGroup(
    config: SolcConfig,
    file: ResolvedFile,
    emitsArtifacts: boolean
  ) {
    const group = this._getOrCreateGroup(config);

    group.addFileToCompile(file, emitsArtifacts);
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

export function createCompilationGroups(
  dependencyGraph: DependencyGraph,
  solidityConfig: MultiSolcConfig,
  solidityFilesCache: SolidityFilesCache
): CompilationGroup[] {
  const overrides = solidityConfig.overrides ?? {};
  const compilationGroupMap = new CompilationGroupMap();

  const allCompilers = [
    ...solidityConfig.compilers,
    ...Object.values(overrides),
  ];

  for (const config of allCompilers) {
    compilationGroupMap.addGroup(config);
  }

  const versions = solidityConfig.compilers.map((c) => c.version);

  for (const file of dependencyGraph.getResolvedFiles()) {
    const overriddenCompiler = overrides[file.globalName];

    const transitiveDependencies = dependencyGraph.getTransitiveDependencies(
      file
    );

    const allVersionPragmas = flatten(
      transitiveDependencies.map((x) => x.content.versionPragmas)
    ).concat(file.content.versionPragmas);

    const version =
      overriddenCompiler !== undefined
        ? overriddenCompiler.version
        : semver.maxSatisfying(versions, allVersionPragmas.join(" "));

    if (version === null) {
      // tslint:disable-next-line only-buidler-error
      throw new Error(`File cannot be compiled: ${file.absolutePath}`); // TODO return error with non-compilable files instead of throwing
    }

    const config =
      overriddenCompiler ??
      solidityConfig.compilers.find(
        (solcConfig) => solcConfig.version === version
      )!;

    const changedSinceLastCompilation =
      hasChangedSinceLastCompilation(file, solidityFilesCache) ||
      transitiveDependencies.some((dependency) =>
        hasChangedSinceLastCompilation(dependency, solidityFilesCache)
      );

    if (changedSinceLastCompilation) {
      compilationGroupMap.addFileToGroup(config, file, true);

      for (const dependency of transitiveDependencies) {
        compilationGroupMap.addFileToGroup(config, dependency, false);
      }
    }
  }

  return [...compilationGroupMap.getGroups()];
}
