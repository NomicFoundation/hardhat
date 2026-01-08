import type {
  SolcConfig,
  SolidityBuildProfileConfig,
} from "../../../../types/config.js";
import type { CompilationJobCreationError } from "../../../../types/solidity/build-system.js";
import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";
import type { DependencyGraph } from "../../../../types/solidity.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { shortenPath } from "@nomicfoundation/hardhat-utils/path";
import { intersects, maxSatisfying, satisfies } from "semver";

import { CompilationJobCreationErrorReason } from "../../../../types/solidity/build-system.js";

export class SolcConfigSelector {
  readonly #buildProfileName: string;
  readonly #buildProfile: SolidityBuildProfileConfig;

  /**
   * Creates a new SolcConfigSelector that can be used to select the best solc
   * configuration for subgraphs of the given dependency graph.
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

    const [userSourceName, root] = [...roots.entries()][0];

    const allVersionPragamas = [...subgraph.getAllFiles()]
      .map(({ content }) => content.versionPragmas)
      .flat(1);

    const versionRange = Array.from(new Set(allVersionPragamas)).join(" ");

    const overriddenCompiler = this.#buildProfile.overrides[userSourceName];

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
    overridden: boolean,
  ): CompilationJobCreationError {
    const rootVersionRange = root.content.versionPragmas.join(" ");
    if (maxSatisfying(compilerVersions, rootVersionRange) === null) {
      let reason: CompilationJobCreationErrorReason;
      let formattedReason: string;
      if (overridden) {
        reason =
          CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION;
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

    //  Collect incompatible files information
    const incompatibleFiles: Array<{ path: string; pragma: string }> = [];

    // check root file
    if (maxSatisfying(compilerVersions, rootVersionRange) === null) {
      incompatibleFiles.push({
        path: shortenPath(root.fsPath),
        pragma: root.content.versionPragmas.join(" "),
      });
    }

    // Check all dependencies
    for (const transitiveDependency of this.#getTransitiveDependencies(
      root,
      dependencyGraph,
    )) {
      const depVersionRange = transitiveDependency.versionPragmasPath
        .map((pragmas) => pragmas.join(" "))
        .join(" ");
      if (maxSatisfying(compilerVersions, depVersionRange) == null) {
        incompatibleFiles.push({
          path: shortenPath(transitiveDependency.dependency.fsPath),
          pragma:
            transitiveDependency.dependency.content.versionPragmas.join(" "),
        });
      }
    }

    // Bulid detailed error message
    let detailedMessage = `No solc version enabled in this profile is compatible with this file and all of its dependencies.`;

    if (incompatibleFiles.length > 0) {
      detailedMessage += `

The following file(s) have incompatible version requirements:`;

      const maxFilesToShow = 5;
      const filesToShow = incompatibleFiles.slice(0, maxFilesToShow);

      for (const file of filesToShow) {
        detailedMessage += `
  - ${file.path}: requires ${file.pragma}`;
      }

      if (incompatibleFiles.length > maxFilesToShow) {
        detailedMessage += `
  ... and ${incompatibleFiles.length - maxFilesToShow} more file(s)`;
      }

      detailedMessage += `

Available compiler versions: ${compilerVersions.join(", ")}`;
    }

    return {
      reason:
        CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
      rootFilePath: root.fsPath,
      buildProfile: this.#buildProfileName,
      formattedReason: detailedMessage,
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
      const file = dependency.file;

      if (visited.has(file)) {
        continue;
      }

      visited.add(file);

      yield {
        fsPath: [file.fsPath],
        versionPragmasPath: [file.content.versionPragmas],
        dependency: file,
      };

      for (const transitive of this.#getTransitiveDependencies(
        file,
        dependencyGraph,
        visited,
      )) {
        yield {
          fsPath: [file.fsPath, ...transitive.fsPath],
          versionPragmasPath: [
            file.content.versionPragmas,
            ...transitive.versionPragmasPath,
          ],
          dependency: transitive.dependency,
        };
      }
    }
  }
}
