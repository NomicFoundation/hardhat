import semver from "semver";

import { SolidityFilesCache } from "../../builtin-tasks/utils/solidity-files-cache";
import { MultiSolcConfig, SolcConfig } from "../../types";

import { DependencyGraph } from "./dependencyGraph";
import { ResolvedFile } from "./resolver";

export class CompilationGroup {
  constructor(
    public solidityConfig: SolcConfig,
    public filesToCompile: Map<ResolvedFile, boolean>
  ) {}

  public addFileToCompile(file: ResolvedFile, emitsArtifacts: boolean) {
    const alreadyEmitsArtifacts = this.filesToCompile.get(file);
    if (alreadyEmitsArtifacts === undefined) {
      this.filesToCompile.set(file, emitsArtifacts);
    } else {
      if (!alreadyEmitsArtifacts && emitsArtifacts) {
        this.filesToCompile.set(file, emitsArtifacts);
      }
    }
  }

  public isEmpty() {
    return this.filesToCompile.size === 0;
  }

  public getVersion() {
    return this.solidityConfig.version;
  }

  public getResolvedFiles(): ResolvedFile[] {
    return [...this.filesToCompile.keys()];
  }

  public emitsArtifacts(file: ResolvedFile): boolean {
    const emitsArtifacts = this.filesToCompile.get(file);

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

export function createCompilationGroups(
  dependencyGraph: DependencyGraph,
  solidityConfig: MultiSolcConfig,
  solidityFilesCache: SolidityFilesCache
): CompilationGroup[] {
  const solidityConfigToCompilationGroup: Map<
    SolcConfig,
    CompilationGroup
  > = new Map();

  for (const config of solidityConfig.compilers) {
    solidityConfigToCompilationGroup.set(
      config,
      new CompilationGroup(config, new Map())
    );
  }

  const versions = solidityConfig.compilers.map((c) => c.version);

  for (const file of dependencyGraph.getResolvedFiles()) {
    const version = semver.maxSatisfying(
      versions,
      file.content.versionPragmas.join(" || ")
    );
    if (version === null) {
      // tslint:disable-next-line only-buidler-error
      throw new Error(`File cannot be compiled: ${file.absolutePath}`); // TODO return error with non-compilable files instead of throwing
    }

    const config = solidityConfig.compilers.find(
      (solcConfig) => solcConfig.version === version
    )!;

    const transitiveDependencies = dependencyGraph.getTransitiveDependencies(
      file
    );

    const changedSinceLastCompilation =
      hasChangedSinceLastCompilation(file, solidityFilesCache) ||
      transitiveDependencies.some((dependency) =>
        hasChangedSinceLastCompilation(dependency, solidityFilesCache)
      );

    if (changedSinceLastCompilation) {
      solidityConfigToCompilationGroup
        .get(config)!
        .addFileToCompile(file, true);

      for (const dependency of transitiveDependencies) {
        solidityConfigToCompilationGroup
          .get(config)!
          .addFileToCompile(dependency, false);
      }
    }
  }

  return [...solidityConfigToCompilationGroup.values()];
}
