import type {
  SolcConfig,
  SolidityBuildProfileConfig,
} from "../../../../types/config.js";
import type { CompilationJobCreationError } from "../../../../types/solidity/build-system.js";
import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";
import type { DependencyGraph } from "../../../../types/solidity.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { shortenPath } from "@ignored/hardhat-vnext-utils/path";
import { intersects, maxSatisfying, satisfies } from "semver";

import { CompilationJobCreationErrorReason } from "../../../../types/solidity/build-system.js";

export class SolcConfigSelector {
  readonly #buildProfileName: string;
  readonly #buildProfile: SolidityBuildProfileConfig;

  /**
   * Creates a new SolcConfigSelector that can be used to select the best solc
   * configuration for subragraphs of the given dependency graph.
   *
   * All the queries are done in the context of the given dependency graph, and
   * using the same build profile.
   *
   * @param buildProfileName The name of the build profile to use.
   * @param buildProfile  The build profile config.
   * @param _dependencyGraph The entire dependency graph of the project.
   */
  constructor(
    buildProfileName: string,
    buildProfile: SolidityBuildProfileConfig,
    _dependencyGraph: DependencyGraph,
  ) {
    this.#buildProfileName = buildProfileName;
    this.#buildProfile = buildProfile;
  }

  /**
   * Selects the best solc configuration for a subgraph of the dependency graph
   * with which this selector was created.
   *
   * @param subgraph A single-root subgraph of the dependency graph.
   * @returns The best solc configuration for the subgraph, or a
   * CompilationJobCreationError if no compatible solc version could be found.
   */
  public selectBestSolcConfigForSingleRootGraph(
    subgraph: DependencyGraph,
  ): SolcConfig | CompilationJobCreationError {
    const roots = subgraph.getRoots();

    assertHardhatInvariant(
      roots.size === 1,
      "This method only works for single root graphs",
    );

    const [publicSourceName, root] = [...roots.entries()][0];

    const allVersionPragamas = [...subgraph.getAllFiles()]
      .map(({ content }) => content.versionPragmas)
      .flat(1);

    const versionRange = Array.from(new Set(allVersionPragamas)).join(" ");

    const overriddenCompiler = this.#buildProfile.overrides[publicSourceName];

    // if there's an override, we only check that
    if (overriddenCompiler !== undefined) {
      if (!satisfies(overriddenCompiler.version, versionRange)) {
        return this.#getCompilationJobCreationError(
          root,
          subgraph,
          [overriddenCompiler.version],
          true,
        );
      }

      return overriddenCompiler;
    }

    // if there's no override, we find a compiler that matches the version range
    const compilerVersions = this.#buildProfile.compilers.map((x) => x.version);
    const matchingVersion = maxSatisfying(compilerVersions, versionRange);

    if (matchingVersion === null) {
      return this.#getCompilationJobCreationError(
        root,
        subgraph,
        compilerVersions,
        false,
      );
    }

    const matchingConfig = this.#buildProfile.compilers.find(
      (x) => x.version === matchingVersion,
    );

    assertHardhatInvariant(
      matchingConfig !== undefined,
      `Matching config not found for version '${matchingVersion.toString()}'`,
    );

    return matchingConfig;
  }

  #getCompilationJobCreationError(
    root: ResolvedFile,
    dependencyGraph: DependencyGraph,
    compilerVersions: string[],
    overriden: boolean,
  ): CompilationJobCreationError {
    const rootVersionRange = root.content.versionPragmas.join(" ");
    if (maxSatisfying(compilerVersions, rootVersionRange) === null) {
      let reason: CompilationJobCreationErrorReason;
      let formattedReason: string;
      if (overriden) {
        reason =
          CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION;
        formattedReason = `An override with incompatible solc version was found for this file.`;
      } else {
        reason =
          CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT;
        formattedReason = `No solc version enabled in this profile is compatible with this file.`;
      }

      return {
        reason,
        rootFilePath: root.fsPath,
        buildProfile: this.#buildProfileName,
        formattedReason,
      };
    }

    for (const transitiveDependency of this.#getTransitiveDependencies(
      root,
      dependencyGraph,
    )) {
      const transitiveDependencyVersionRange =
        transitiveDependency.versionPragmasPath
          .map((pragmas) => pragmas.join(" "))
          .join(" ");

      if (!intersects(rootVersionRange, transitiveDependencyVersionRange)) {
        return {
          reason: CompilationJobCreationErrorReason.IMPORT_OF_INCOMPATIBLE_FILE,
          rootFilePath: root.fsPath,
          buildProfile: this.#buildProfileName,
          incompatibleImportPath: transitiveDependency.fsPath,
          formattedReason: `Following these imports leads to an incompatible solc version pragma that no version can satisfy:
  * ${shortenPath(root.fsPath)}
  * ${transitiveDependency.fsPath.map((s) => shortenPath(s)).join("\n  * ")}
`,
        };
      }
    }

    return {
      reason:
        CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
      rootFilePath: root.fsPath,
      buildProfile: this.#buildProfileName,
      formattedReason: `No solc version enabled in this profile is compatible with this file and all of its dependencies.`,
    };
  }

  *#getTransitiveDependencies(
    root: ResolvedFile,
    dependencyGraph: DependencyGraph,
    visited = new Set<ResolvedFile>([root]),
  ): Generator<{
    fsPath: string[];
    versionPragmasPath: string[][];
    dependency: ResolvedFile;
  }> {
    for (const dependency of dependencyGraph.getDependencies(root)) {
      if (visited.has(dependency)) {
        continue;
      }

      yield {
        fsPath: [dependency.fsPath],
        versionPragmasPath: [dependency.content.versionPragmas],
        dependency,
      };

      for (const transitive of this.#getTransitiveDependencies(
        dependency,
        dependencyGraph,
        visited,
      )) {
        yield {
          fsPath: [dependency.fsPath, ...transitive.fsPath],
          versionPragmasPath: [
            dependency.content.versionPragmas,
            ...transitive.versionPragmasPath,
          ],
          dependency: transitive.dependency,
        };
      }
    }
  }
}
