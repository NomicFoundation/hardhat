import type {
  LocalUserRemapping,
  ResolvedNpmUserRemapping,
  InstallationName,
  RemappedNpmPackagesMap,
  Remapping,
  ResolvedUserRemapping,
  UnresolvedNpmUserRemapping,
  RemappedNpmPackagesMapJson,
  Result,
} from "./types.js";
import type {
  ResolvedFile,
  ResolvedNpmPackage,
  UserRemappingError,
} from "../../../../../types/solidity.js";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import {
  getAllFilesMatching,
  readJsonFile,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import {
  findDependencyPackageJson,
  type PackageJson,
} from "@nomicfoundation/hardhat-utils/package";

import { UserRemappingErrorType } from "../../../../../types/solidity.js";

import { getNpmPackageName } from "./npm-module-parsing.js";
import { parseRemappingString, selectBestRemapping } from "./remappings.js";
import { sourceNamePathJoin } from "./source-name-utils.js";
import { UserRemappingType } from "./types.js";

const HARDHAT_PROJECT_ROOT_SOURCE_NAME = "project";

export function isResolvedUserRemapping(
  remapping: Remapping | ResolvedUserRemapping,
): remapping is ResolvedUserRemapping {
  return (
    "type" in remapping &&
    (remapping.type === UserRemappingType.NPM ||
      remapping.type === UserRemappingType.LOCAL)
  );
}

export class RemappedNpmPackagesMapImplementation
  implements RemappedNpmPackagesMap
{
  /**
   * The Hardhat project itself.
   */
  readonly #hardhatProjectPackage: ResolvedNpmPackage;

  /**
   * This is a map of all the npm packages. Every package that has been
   * loaded by this class, is present in this map.
   *
   * Its value is another map, where the keys are the installation name of each
   * dependency of the package that has been loaded, and the values are objects
   * with the resolved npm package and the remapping that we generate for that
   * package -- installationName --> package relationship.
   *
   * The generated remapping is generated once and stored for each relationship,
   * to preserve its uniqueness.
   */
  readonly #installationMap = new Map<
    ResolvedNpmPackage,
    Map<
      InstallationName,
      { package: ResolvedNpmPackage; generatedRemapping: Remapping }
    >
  >();

  /**
   * A map of all the npm packages, indexed by their root source name.
   */
  readonly #packageByRootSourceName = new Map<string, ResolvedNpmPackage>();

  /**
   * A map of all the user remappings of each npm package.
   */
  readonly #userRemappingsPerPackage = new Map<
    ResolvedNpmPackage,
    Array<ResolvedUserRemapping | UnresolvedNpmUserRemapping>
  >();

  /**
   * A map of all the remappings generated to map a direct import within a
   * package to a particualr npm file. This is used to generate remappings into
   * packages that use package.exports, as we can't generate more generic
   * remappings for them.
   */
  readonly #generatedRemappingsIntoNpmFiles = new Map<
    ResolvedNpmPackage,
    Map<string, Remapping>
  >();

  public static async create(
    projectRootPath: string,
  ): Promise<RemappedNpmPackagesMapImplementation> {
    const projectPackageJson = await readJsonFile<PackageJson>(
      path.join(projectRootPath, "package.json"),
    );

    const resolvedNpmPackage: ResolvedNpmPackage = {
      name: projectPackageJson.name,
      version: projectPackageJson.version,
      exports: projectPackageJson.exports,
      rootFsPath: projectRootPath,
      rootSourceName: HARDHAT_PROJECT_ROOT_SOURCE_NAME,
    };

    return new RemappedNpmPackagesMapImplementation(resolvedNpmPackage);
  }

  private constructor(hardhatProjectPackage: ResolvedNpmPackage) {
    this.#hardhatProjectPackage = hardhatProjectPackage;
    this.#insertNewPackage(hardhatProjectPackage);
  }

  public getHardhatProjectPackage(): ResolvedNpmPackage {
    return this.#hardhatProjectPackage;
  }

  /**
   * Resolves a dependency of the package `from` by its installation name.
   *
   * This method modifies the map, potentially loading new packages, but it
   * doesn't read its remappings, and it doesn't take user remappings into
   * account.
   *
   * This method is pretty complex, so read the comments carefully.
   *
   * @param from The package from which the dependency is being resolved.
   * @param installationName The installation name of the dependency.
   * @returns The package and generated remappings, or undefined if the
   * dependency could not be resolved.
   */
  public async resolveDependencyByInstallationName(
    from: ResolvedNpmPackage,
    installationName: InstallationName,
  ): Promise<
    { package: ResolvedNpmPackage; generatedRemapping: Remapping } | undefined
  > {
    // We may need to modify the installation map, so we need to access it.
    const npmPackageDependenciesMap = this.#installationMap.get(from);
    assertHardhatInvariant(
      npmPackageDependenciesMap !== undefined,
      "The npm package must be present in the map",
    );

    // If the dependency already exists with this same installation name we
    // reuse it.
    const existingDependencyNpmPackageByInstallationName =
      npmPackageDependenciesMap.get(installationName);

    if (existingDependencyNpmPackageByInstallationName !== undefined) {
      return existingDependencyNpmPackageByInstallationName;
    }

    // Otherwise, we try to get it's package.json to:
    //  1) Load it if necessary.
    //  2) Add it to the installation map.
    const dependencyPackageJsonPath = await findDependencyPackageJson(
      from.rootFsPath,
      installationName,
    );

    // If we can't find the package.json, it hasn't been installed.
    if (dependencyPackageJsonPath === undefined) {
      return undefined;
    }

    // We read the package.json file of the dependency.
    const dependencyPackageJson = await readJsonFile<PackageJson>(
      dependencyPackageJsonPath,
    );

    // We treat packages from within the monorepo a bit differently, so we
    // check it here. All we do is using a different version to compute
    // its root source name.
    const dependencyVersion = this.#isPackageJsonFromMonorepo(
      dependencyPackageJsonPath,
    )
      ? "local"
      : dependencyPackageJson.version;

    // We get the root source name of the dependency, to check if it already
    // exists in the map.
    const rootSourceName =
      dependencyPackageJsonPath ===
      path.join(this.#hardhatProjectPackage.rootFsPath, "package.json")
        ? HARDHAT_PROJECT_ROOT_SOURCE_NAME
        : this.#npmPackageToRootSourceName(
            dependencyPackageJson.name,
            dependencyVersion,
          );

    // If it exists, we need to update the installation map, as it was missing
    // there with this installation name, and we return it.
    const existingDependencyNpmPackageBySourceName =
      this.#packageByRootSourceName.get(rootSourceName);
    if (existingDependencyNpmPackageBySourceName !== undefined) {
      const resultOfExistingPackage = {
        package: existingDependencyNpmPackageBySourceName,
        generatedRemapping: this.#generateNpmRemapping(
          from,
          installationName,
          existingDependencyNpmPackageBySourceName,
        ),
      };

      npmPackageDependenciesMap.set(installationName, resultOfExistingPackage);

      return resultOfExistingPackage;
    }

    // Otherwise it's the first time we see this package, so we add it to the
    // map.
    const newDependencyNpmPackage: ResolvedNpmPackage = {
      name: dependencyPackageJson.name,
      version: dependencyVersion,
      rootFsPath: path.dirname(dependencyPackageJsonPath),
      rootSourceName,
      exports: dependencyPackageJson.exports,
    };

    this.#insertNewPackage(newDependencyNpmPackage);

    const resultOfNewPackage = {
      package: newDependencyNpmPackage,
      generatedRemapping: this.#generateNpmRemapping(
        from,
        installationName,
        newDependencyNpmPackage,
      ),
    };

    // We also need to add it to the installation map, as a dependeny of `from`.
    npmPackageDependenciesMap.set(installationName, resultOfNewPackage);

    return resultOfNewPackage;
  }

  public async selectBestUserRemapping(
    from: ResolvedFile,
    directImport: string,
  ): Promise<Result<ResolvedUserRemapping | undefined, UserRemappingError[]>> {
    let userRemappings = this.#userRemappingsPerPackage.get(from.package);

    if (userRemappings === undefined) {
      const readResult = await this.#readPackageRemappings(from.package);

      if (!readResult.success) {
        return { success: false, error: readResult.error };
      }

      userRemappings = readResult.value;
      this.#userRemappingsPerPackage.set(from.package, userRemappings);
    }

    const bestUserRemappingIndex = selectBestRemapping(
      from.inputSourceName,
      directImport,
      userRemappings,
    );

    if (bestUserRemappingIndex === undefined) {
      return { success: true, value: undefined };
    }

    const bestUserRemapping = userRemappings[bestUserRemappingIndex];

    if (
      bestUserRemapping.type === UserRemappingType.LOCAL ||
      bestUserRemapping.type === UserRemappingType.NPM
    ) {
      return { success: true, value: bestUserRemapping };
    }

    const result = await this.#resolveNpmUserRemapping(
      from.package,
      bestUserRemapping,
    );

    if (!result.success) {
      return { success: false, error: [result.error] };
    }

    // We replace the unresolved user remapping with the resolved one
    userRemappings[bestUserRemappingIndex] = result.value;

    return { success: true, value: result.value };
  }

  public async generateRemappingIntoNpmFile(
    fromNpmPackage: ResolvedNpmPackage,
    directImport: string,
    targetInputSourceName: string,
  ): Promise<Remapping> {
    const remappingsIntoFiles =
      this.#generatedRemappingsIntoNpmFiles.get(fromNpmPackage);
    assertHardhatInvariant(
      remappingsIntoFiles !== undefined,
      "Map of generated remappings should exist",
    );

    const existing = remappingsIntoFiles.get(directImport);
    if (existing !== undefined) {
      assertHardhatInvariant(
        existing.target === targetInputSourceName,
        "Trying to generate different remappings for the same direct import into an npm file",
      );

      return existing;
    }

    const remapping = {
      context: fromNpmPackage.rootSourceName + "/",
      prefix: directImport,
      target: targetInputSourceName,
    };

    remappingsIntoFiles.set(directImport, remapping);

    return remapping;
  }

  public toJSON(): RemappedNpmPackagesMapJson {
    return {
      hardhatProjectPackage: this.#hardhatProjectPackage,
      packageByRootSourceName: Object.fromEntries(
        this.#packageByRootSourceName.entries(),
      ),
      installationMap: Object.fromEntries(
        Array.from(this.#installationMap.entries()).map(
          ([pkg, dependenciesMap]) => {
            return [
              pkg.rootSourceName,
              Object.fromEntries(dependenciesMap.entries()),
            ];
          },
        ),
      ),
      userRemappingsPerPackage: Object.fromEntries(
        Array.from(this.#userRemappingsPerPackage.entries()).map(
          ([pkg, remappings]) => {
            return [pkg.rootSourceName, remappings];
          },
        ),
      ),
      generatedRemappingsIntoNpmFiles: Object.fromEntries(
        Array.from(this.#generatedRemappingsIntoNpmFiles.entries()).map(
          ([pkg, remappings]) => {
            return [pkg.rootSourceName, Object.fromEntries(remappings)];
          },
        ),
      ),
    };
  }

  /**
   * Inserts a new package into the maps and queues, maintaining the invariants
   * of this class.
   *
   * @param npmPackage The package.
   */
  #insertNewPackage(npmPackage: ResolvedNpmPackage) {
    this.#installationMap.set(npmPackage, new Map());
    this.#packageByRootSourceName.set(npmPackage.rootSourceName, npmPackage);
    this.#generatedRemappingsIntoNpmFiles.set(npmPackage, new Map());
    // Note: We intentionally don't add an empty array to the map of user
    // remappings, so that we can easily check if they have been processed.
  }

  /**
   * Reads all the user remappings of a package, validating their format and
   * processing them, but without loading their npm packages (if any).
   *
   * @param npmPackage The package.
   */
  async #readPackageRemappings(
    npmPackage: ResolvedNpmPackage,
  ): Promise<
    Result<
      Array<LocalUserRemapping | UnresolvedNpmUserRemapping>,
      UserRemappingError[]
    >
  > {
    const remappingsTxtFiles = await getAllFilesMatching(
      npmPackage.rootFsPath,
      (f) => path.basename(f) === "remappings.txt",
      (f) => !f.endsWith("node_modules"),
    );

    const remappings = [];
    const errors = [];

    for (const remappingsTxtFsPath of remappingsTxtFiles) {
      const packageRemappingsTxtContents =
        await readUtf8File(remappingsTxtFsPath);

      const rawUserRemappings = packageRemappingsTxtContents
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .filter((line) => !line.startsWith("#"));

      for (const userRemapping of rawUserRemappings) {
        const result = await this.#parseUserRemapping(
          npmPackage,
          remappingsTxtFsPath,
          userRemapping,
        );

        if (!result.success) {
          errors.push(result.error);
        } else {
          // If parsing returned `undefined`, it means that it should be
          // ignored.
          if (result.value === undefined) {
            continue;
          }

          remappings.push(result.value);
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors };
    }

    return { success: true, value: remappings };
  }

  /**
   * Parses a user remapping, validating it, and preprocessing it, but without
   * loading its npm package (if any).
   *
   * @param npmPackage The npm package, which remapping is being resolved.
   * @param sourceOfTheRemapping The source of the remapping.
   * @param remappingString The remapping in raw format.
   * @returns The parsed user remapping, or undefined if it should be ignored.
   * If the parsing and validation fails, an error is returned.
   */
  async #parseUserRemapping(
    npmPackage: ResolvedNpmPackage,
    sourceOfTheRemapping: string,
    remappingString: string,
  ): Promise<
    Result<
      LocalUserRemapping | UnresolvedNpmUserRemapping | undefined,
      UserRemappingError
    >
  > {
    // We first parse the remapping string and validate that it doesn't have
    // a context starting with `npm/`, and that the prefix and targets end in /.
    const remapping = parseRemappingString(remappingString);

    if (remapping === undefined) {
      return {
        success: false,
        error: {
          remapping: remappingString,
          type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
          source: sourceOfTheRemapping,
        },
      };
    }

    // Note: User remappings must have each of their components ending with `/`,
    // except for the context. If they don't end with a slash, we add it.
    const context = remapping.context;
    const prefix = remapping.prefix.endsWith("/")
      ? remapping.prefix
      : remapping.prefix + "/";
    const target = remapping.target.endsWith("/")
      ? remapping.target
      : remapping.target + "/";

    const relativeFsPathToRemappingsFile = path.relative(
      npmPackage.rootFsPath,
      path.dirname(sourceOfTheRemapping),
    );

    // If the remapping's target starts with `node_modules/`, we treat
    // it as trying to laod an npm dependency, otherwise we treat it as a local
    // remapping.

    // Local remapping case
    if (!target.startsWith("node_modules/")) {
      return {
        success: true,
        value: {
          type: UserRemappingType.LOCAL,
          context: this.#updateRemappingsTxFragment(
            npmPackage,
            relativeFsPathToRemappingsFile,
            context,
          ),
          prefix,
          target: this.#updateRemappingsTxFragment(
            npmPackage,
            relativeFsPathToRemappingsFile,
            target,
          ),
          originalFormat: remappingString,
          source: sourceOfTheRemapping,
        },
      };
    }

    // If we are here the remapping is a npm remapping.
    // We first remove the node_modules/ prefix from the actual target.
    const targetWithoutNodeModules = target.substring("node_modules/".length);

    // If after doing that the prefix and target are the same, we skip it
    // so that it doesn't even go unnecesarly go through a user remapping.
    if (prefix === targetWithoutNodeModules) {
      return { success: true, value: undefined };
    }

    // If we are treating it as remapping into an npm package, it's syntax,
    // after removing the `node_modules/` prefix, should be similar to
    // an npm module's (i.e. `<package-name>/<file-path>`), except that
    // `<file-path>` here could be a prefix, and not a file path.
    //
    // Note that that package name is the installation name of the dependency
    // within the npm package, not the actual dependency name.
    const installationName = getNpmPackageName(targetWithoutNodeModules);

    if (installationName === undefined) {
      return {
        success: false,
        error: {
          type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
          source: sourceOfTheRemapping,
          remapping: remappingString,
        },
      };
    }

    return {
      success: true,
      value: {
        type: "UNRESOLVED_NPM",
        installationName,
        context: this.#updateRemappingsTxFragment(
          npmPackage,
          relativeFsPathToRemappingsFile,
          context,
        ),
        prefix,
        target,
        originalFormat: remappingString,
        source: sourceOfTheRemapping,
      },
    };
  }

  async #resolveNpmUserRemapping(
    npmPackage: ResolvedNpmPackage,
    unresolvedNpmRemapping: UnresolvedNpmUserRemapping,
  ): Promise<Result<ResolvedNpmUserRemapping, UserRemappingError>> {
    const dependency = await this.resolveDependencyByInstallationName(
      npmPackage,
      unresolvedNpmRemapping.installationName,
    );

    // If we can't find the dependency, it hasn't been installed.
    if (dependency === undefined) {
      return {
        success: false,
        error: {
          remapping: unresolvedNpmRemapping.originalFormat,
          type: UserRemappingErrorType.REMAPPING_TO_UNINSTALLED_PACKAGE,
          source: unresolvedNpmRemapping.source,
        },
      };
    }

    const target =
      dependency.package.rootSourceName +
      unresolvedNpmRemapping.target.substring(
        "node_modules/".length + unresolvedNpmRemapping.installationName.length,
      );

    return {
      success: true,
      value: {
        type: UserRemappingType.NPM,
        context: unresolvedNpmRemapping.context,
        prefix: unresolvedNpmRemapping.prefix,
        originalFormat: unresolvedNpmRemapping.originalFormat,
        source: unresolvedNpmRemapping.source,
        target,
        targetNpmPackage: {
          installationName: unresolvedNpmRemapping.installationName,
          package: dependency.package,
        },
      },
    };
  }

  /**
   * Generates a remapping used to resolve an import from `from` to `to` using
   * the installation name `installationName` as a prefix.
   */
  #generateNpmRemapping(
    from: ResolvedNpmPackage,
    installationName: string,
    to: ResolvedNpmPackage,
  ): Remapping {
    return {
      context: from.rootSourceName + "/",
      prefix: installationName + "/",
      target: to.rootSourceName + "/",
    };
  }

  #isPackageJsonFromMonorepo(packageJsonFsPath: string): boolean {
    return (
      !packageJsonFsPath.includes("node_modules") &&
      !packageJsonFsPath.startsWith(
        this.#hardhatProjectPackage.rootFsPath + path.sep,
      )
    );
  }

  #npmPackageToRootSourceName(name: string, version: string): string {
    return `npm/${name}@${version}`;
  }

  /**
   * Updates a fragment of a remapping found in a remappings.txt in the package
   * from.
   *
   * This is used to update both contexts and targets.
   *
   * This function doesn't update any fragment starting with npm/
   */
  #updateRemappingsTxFragment(
    from: ResolvedNpmPackage,
    relativeFsPathToRemappingsFileFromPackage: string,
    remappingFragment: string,
  ): string {
    if (remappingFragment.startsWith("npm/")) {
      return remappingFragment;
    }

    return sourceNamePathJoin(
      // We add a slash here so that it mains it if the rest of the path is empty
      from.rootSourceName + "/",
      // Same here
      relativeFsPathToRemappingsFileFromPackage + "/",
      remappingFragment,
    );
  }
}
