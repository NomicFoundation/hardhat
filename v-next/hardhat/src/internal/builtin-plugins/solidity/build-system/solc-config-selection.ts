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
   * configuration for single-root subgraphs to create their resepective
   * individual compilation jobs.
   *
   * All the queries use the same build profile.
   *
   * @param buildProfileName The name of the build profile to use.
   * @param buildProfile  The build profile config.
   */
  constructor(
    buildProfileName: string,
    buildProfile: SolidityBuildProfileConfig,
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
  ): { success: true; config: SolcConfig } | CompilationJobCreationError {
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

      return { success: true, config: overriddenCompiler };
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

    return { success: true, config: matchingConfig };
  }

  /**
   * Returns a description of why we couldn't get a compiler configuration for
   * the given root file and dependency subgraph.
   *
   * @param root The root file that created the single-root dependency subgraph
   * @param dependencyGraph The dependency subgraph we couldn't get a compiler
   *   configuration for
   * @param compilerVersions The compiler versions that are configured for the
   *   selected build profile. For overridden roots, it's a single one.
   * @param overridden True if the root has an overridden config.
   * @returns The error why we couldn't get a compiler configuration.
   */
  #getCompilationJobCreationError(
    root: ResolvedFile,
    dependencyGraph: DependencyGraph,
    compilerVersions: string[],
    overridden: boolean,
  ): CompilationJobCreationError {
    const rootVersionRange = root.content.versionPragmas.join(" ");

    // This logic is pretty different depending if we are dealing with a config
    // override or not. If we are, we have a single compiler option, so things
    // are simpler.

    if (overridden) {
      // The root may not be compatible with the override version
      if (maxSatisfying(compilerVersions, rootVersionRange) === null) {
        return {
          success: false,
          reason:
            CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION,
          rootFilePath: root.fsPath,
          buildProfile: this.#buildProfileName,
          formattedReason: `An override with incompatible solc version was found for this file.`,
        };
      }

      // A transitive dependency can have a pragma that's incompatible with
      // the overridden version.
      for (const transitiveDependency of this.#getTransitiveDependencies(
        root,
        dependencyGraph,
      )) {
        const depOwnRange =
          transitiveDependency.dependency.content.versionPragmas.join(" ");

        if (maxSatisfying(compilerVersions, depOwnRange) === null) {
          return {
            success: false,
            reason:
              CompilationJobCreationErrorReason.OVERRIDDEN_SOLC_VERSION_INCOMPATIBLE_WITH_DEPENDENCY,
            rootFilePath: root.fsPath,
            buildProfile: this.#buildProfileName,
            incompatibleImportPath: transitiveDependency.fsPath,
            formattedReason: `The compiler version override is incompatible with a dependency of this file:\n  * ${shortenPath(root.fsPath)}\n  * ${transitiveDependency.fsPath.map((s) => shortenPath(s)).join("\n  * ")}`,
          };
        }
      }

      // There's no other case. If the root and all the dependencies are
      // compatible, and we still can choose a version, we have a bug.
      /* c8 ignore next 5 */
      assertHardhatInvariant(
        false,
        "Trying to get the error for an overridden solidity file that has no compatible config, but failed to detect it, as the root and all the dependencies are compatible with the overridden compiler config.",
      );
    }

    // Non-overridden case: we first check if the root is compatible with any
    // configured compiler
    if (maxSatisfying(compilerVersions, rootVersionRange) === null) {
      return {
        success: false,
        reason:
          CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT,
        rootFilePath: root.fsPath,
        buildProfile: this.#buildProfileName,
        formattedReason: `No solc version enabled in this profile is compatible with this file.`,
      };
    }

    // We check all the transitive dependencies of the root to try to return
    // the most specific error that we can.
    for (const transitiveDependency of this.#getTransitiveDependencies(
      root,
      dependencyGraph,
    )) {
      const transitiveDependencyVersionRange =
        transitiveDependency.versionPragmasPath
          .map((pragmas) => pragmas.join(" "))
          .join(" ");

      const depOwnRange =
        transitiveDependency.dependency.content.versionPragmas.join(" ");

      // A transitive dependency can have a pragma that's incompatible with
      // all the configured compilers
      if (maxSatisfying(compilerVersions, depOwnRange) === null) {
        return {
          success: false,
          reason:
            CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_DEPENDENCY,
          rootFilePath: root.fsPath,
          buildProfile: this.#buildProfileName,
          incompatibleImportPath: transitiveDependency.fsPath,
          formattedReason: `No solc version enabled in this profile is compatible with a dependency of this file:\n  * ${shortenPath(root.fsPath)}\n  * ${transitiveDependency.fsPath.map((s) => shortenPath(s)).join("\n  * ")}`,
        };
      }

      // The root and the version ranges to get to this transitive dependency
      // may be contradictory, so no version ever can satisfy them.
      if (!intersects(rootVersionRange, transitiveDependencyVersionRange)) {
        return {
          success: false,
          reason: CompilationJobCreationErrorReason.IMPORT_OF_INCOMPATIBLE_FILE,
          rootFilePath: root.fsPath,
          buildProfile: this.#buildProfileName,
          incompatibleImportPath: transitiveDependency.fsPath,
          formattedReason: `Following these imports leads to an incompatible solc version pragma that no version can satisfy:\n  * ${shortenPath(root.fsPath)}\n  * ${transitiveDependency.fsPath.map((s) => shortenPath(s)).join("\n  * ")}`,
        };
      }

      // The root and the version ranges to get to this transitive dependency
      // may not be compatible with any configured compiler.
      const combinedRange = `${rootVersionRange} ${transitiveDependencyVersionRange}`;
      if (maxSatisfying(compilerVersions, combinedRange) === null) {
        return {
          success: false,
          reason:
            CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOR_TRANSITIVE_IMPORT_PATH,
          rootFilePath: root.fsPath,
          buildProfile: this.#buildProfileName,
          incompatibleImportPath: transitiveDependency.fsPath,
          formattedReason: `No solc version enabled in this profile is compatible with this file and this import path:\n  * ${shortenPath(root.fsPath)}\n  * ${transitiveDependency.fsPath.map((s) => shortenPath(s)).join("\n  * ")}`,
        };
      }
    }

    // This is a generic case that can happen when the incompatibilities exist
    // but we can't detect them with the above algorithm. For example, if a
    // root imports two compatible dependencies that are incompatible with each
    // other. We could try and improve this error message, but it's
    // computationally expensive and hard to express to the users.
    return {
      success: false,
      reason:
        CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
      rootFilePath: root.fsPath,
      buildProfile: this.#buildProfileName,
      formattedReason: `No solc version enabled in this profile is compatible with this file and all of its dependencies.`,
    };
  }

  /**
   * Returns a generator of all the transitive dependencies of a root file. For each
   * dependency, it yields the sequence of fsPaths from the root to that dependency,
   * along with the corresponding version pragma paths for each file in the import chain.
   * The paths don't include the root itself.
   */
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

      visited = new Set([...visited, file]);

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
