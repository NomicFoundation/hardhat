import type { Remapping } from "./types.js";
import type {
  ResolvedNpmPackage,
  UserRemappingError,
} from "../../../../../types/solidity.js";
import type { Result } from "../../../../../types/utils.js";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import {
  exists,
  getAllFilesMatching,
  readJsonFile,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import {
  findDependencyPackageJson,
  type PackageJson,
} from "@nomicfoundation/hardhat-utils/package";

import { UserRemappingErrorType } from "../../../../../types/solidity.js";

import { getNpmPackageName } from "./npm-moudles-parsing.js";
import { parseRemappingString } from "./remappings.js";
import { sourceNamePathJoin } from "./source-name-utils.js";

const HARDHAT_PROJECT_ROOT_SOURCE_NAME = "project";

/**
 * A user remapping, parsed, and with its npm package resolved, if any.
 */
export interface ResolvedUserRemapping extends Remapping {
  context: string;
  prefix: string;
  target: string;
  originalFormat: string;
  source: string;
  targetNpmPackage?: {
    installationName: InstallationName;
    package: ResolvedNpmPackage;
  };
}

export function isResolvedUserRemapping(
  remapping: Remapping,
): remapping is ResolvedUserRemapping {
  return "source" in remapping && typeof remapping.source === "string";
}

/**
 * Npm packages can be installed with different names than the one declared in
 * the package.json file. For example, example, `"my-foo": "npm:foo@1.2.3".
 *
 * We use this type alias to represent the installation name of a package.
 */
export type InstallationName = string;

/**
 * This class represents a map of all the npm packages that the Hardhat project
 * uses, including the Hardhat projecct itself, and their remappings.
 *
 * This class guarantees that there's a single instance of any npm package per
 * each version. That means that, even if you have muiltiple installations of
 * the same package+version (i.e. npm didn't deduplicate them), we only load
 * one of them, and always use that one.
 *
 * This class also guarantees that there's a single instance of each remapping
 * object.
 *
 * While the remappings may seem a bit out of place here, they are more coupled
 * than expected, because:
 *  - Processing a remapping may require loading a new npm package, which is
 *    this class needs to do to ensure the guarantees described above.
 *  - Loading an npm package requires processing its remappigns.
 *
 * These two things, when combined, make the process highly recursive and
 * complex.
 *
 * Please proceed with caution when reading and modifying this class.
 *
 * NOTE: This class should be protected by a mutext. It's not thread/async-safe.
 * If you don't do it, it can't ensure the guarantees described above.
 */
export class RemappedNpmPackagesMap {
  /**
   * The Hardhat project itself.
   */
  public readonly hardhatProjectPackage: ResolvedNpmPackage;

  /**
   * This is a map of all the npm packages. Every package that has been
   * loaded/accesssed by this class, is present in this map.
   *
   * Its value is another map, where the keys are the installation name of each
   * dependency of the package that has been loaded/accesssed, and the values
   * are objects with the resolved npm package and the remapping that we
   * generate for that package -- installationName --> package relationship.
   *
   * The generated remapping is generated once and store per each relationship,
   * to preserve its uniqueness, as described in the class description.
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
   * A map of all the resolved user remappings of each npm package.
   */
  readonly #userRemappingsPerPackage = new Map<
    ResolvedNpmPackage,
    ResolvedUserRemapping[]
  >();

  /**
   * A queue of the npm packages that still need to be resolved.
   */
  readonly #remappingsToResolve = new Array<ResolvedNpmPackage>();

  public static async create(
    projectRootPath: string,
  ): Promise<Result<RemappedNpmPackagesMap, UserRemappingError[]>> {
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

    const map = new RemappedNpmPackagesMap(resolvedNpmPackage);

    const errors = await map.#resolveAnyRemainingRemappings();

    if (errors.length > 0) {
      return { success: false, error: errors };
    }

    return {
      success: true,
      value: map,
    };
  }

  private constructor(hardhatProjectPackage: ResolvedNpmPackage) {
    this.hardhatProjectPackage = hardhatProjectPackage;
    this.#insertNewPackage(hardhatProjectPackage);
  }

  public getHardhatProjectPackage(): ResolvedNpmPackage {
    return this.hardhatProjectPackage;
  }

  public getUserRemappings(
    npmPackage: ResolvedNpmPackage,
  ): ResolvedUserRemapping[] {
    const packageRemappings = this.#userRemappingsPerPackage.get(npmPackage);

    if (packageRemappings === undefined) {
      assertHardhatInvariant(
        this.#installationMap.has(npmPackage),
        "The npm package must be present in the map",
      );

      assertHardhatInvariant(
        packageRemappings !== undefined,
        "The npm package must be present in the map and their user remappings resolved",
      );
    }

    return packageRemappings;
  }

  /**
   * Resolves a dependency of the package `from` by its installation name.
   *
   * This method does not use the remappings of the package `from` to alter
   * the resolution process. It only loads npm packages, their remappings, and
   * resolves them.
   *
   * NOTE: This method may modify the map if necessary.
   *
   * @param from The package from which the dependency is being resolved.
   * @param installationName The installation name of the dependency.
   * @returns `undefiend` if the dependency is not installed, or an object with
   * the dependency and any potential user remapping errors.
   */
  public async resolveDependencyByInstallationName(
    from: ResolvedNpmPackage,
    installationName: InstallationName,
  ): Promise<
    | undefined
    | {
        package: ResolvedNpmPackage;
        generatedRemapping: Remapping;
        remappingErrros?: UserRemappingError[];
      }
  > {
    const dependency = await this.#resolveDependencyByInstallationName(
      from,
      installationName,
    );

    if (dependency === undefined) {
      return undefined;
    }

    const errors = await this.#resolveAnyRemainingRemappings();

    return {
      ...dependency,
      remappingErrros: errors.length > 0 ? errors : undefined,
    };
  }

  public async generateRemappingIntoNpmFile(
    fromNpmPackage: ResolvedNpmPackage,
    directImport: string,
    sourceName: string,
  ): Promise<Remapping> {
    // TODO: Cache this

    return {
      context: fromNpmPackage.rootSourceName + "/",
      prefix: directImport,
      target: sourceName,
    };
  }

  public toJSON(): any {
    return {
      hardhatProjectPackage: this.hardhatProjectPackage,
      installationMap: this.#installationMap.entries(),
      packageByRootSourceName: this.#packageByRootSourceName.entries(),
      remappingsToResolve: this.#remappingsToResolve,
      userRemappingsPerPackage: this.#userRemappingsPerPackage.entries(),
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
    this.#remappingsToResolve.push(npmPackage);
    // Note: We intentionally don't add an empty array to the map of user
    // remappings, so that we can easily check if they have been processed.
  }

  /**
   * Resolves any remaining remappings of the packages that still need to be
   * resolved, returning any error if encountered.
   */
  async #resolveAnyRemainingRemappings(): Promise<UserRemappingError[]> {
    const errors: UserRemappingError[] = [];

    while (this.#remappingsToResolve.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We validate this above
      const npmPackage = this.#remappingsToResolve[0]!;

      this.#userRemappingsPerPackage.set(npmPackage, []);

      const userRemappingErrors =
        await this.#validateAndResolveUserRemappingsOfAnExistingPackage(
          npmPackage,
        );

      if (userRemappingErrors.length > 0) {
        errors.push(...userRemappingErrors);
      }

      this.#remappingsToResolve.shift();
    }

    return errors;
  }

  /**
   * Validates and resolves the user remappigns of a package that has already
   * been added to the map.
   *
   * Note that this may result in more packages being added to the map. If
   * that happens, their remappings won't be automatically resolved. Instead,
   * they'll be added to the #remappingsResolved map with `false`.
   *
   * @param npmPackage The npm package, which must already be present in the map
   */
  async #validateAndResolveUserRemappingsOfAnExistingPackage(
    npmPackage: ResolvedNpmPackage,
  ): Promise<UserRemappingError[]> {
    const packageRemappings = this.#userRemappingsPerPackage.get(npmPackage);
    assertHardhatInvariant(
      packageRemappings !== undefined,
      "The npm package must be present in the map",
    );

    const errors: UserRemappingError[] = [];

    const remappingsTxtFiles = await getAllFilesMatching(
      npmPackage.rootFsPath,
      (f) => path.basename(f) === "remappings.txt",
      (f) => !f.endsWith("node_modules"),
    );

    for (const remappingsTxtFsPath of remappingsTxtFiles) {
      const packageRemappingsTxtContents =
        await readUtf8File(remappingsTxtFsPath);

      const rawUserRemappings = packageRemappingsTxtContents
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .filter((line) => !line.startsWith("#"));

      for (const userRemapping of rawUserRemappings) {
        const error = await this.#validateAndResolveUserRemapping(
          npmPackage,
          remappingsTxtFsPath,
          userRemapping,
        );

        if (error !== undefined) {
          errors.push(error);
        }
      }
    }

    return errors;
  }

  /**
   * Validates and resolves the user remapping of a package, which has to have
   * already been added to the map.
   *
   * Note that this may result in more packages being added to the map. If
   * that happens, their remappings won't be automatically resolved. Instead,
   * they'll be added to the #remappingsResolved map with `false`.
   *
   * This method is pretty complex, so read the comments carefully.
   *
   * @param npmPackage The npm package, which remapping is being resolved.
   * @param sourceOfTheRemapping The source of the remapping.
   * @param remappingString The remapping in raw format.
   */
  async #validateAndResolveUserRemapping(
    npmPackage: ResolvedNpmPackage,
    sourceOfTheRemapping: string,
    remappingString: string,
  ): Promise<UserRemappingError | undefined> {
    // We need to know that the package is present in the map. We use the
    // installation map here, as it may need to be modified, if we load
    // a new dependency of this package.
    const npmPackageDependenciesMap = this.#installationMap.get(npmPackage);
    assertHardhatInvariant(
      npmPackageDependenciesMap !== undefined,
      "The npm package must be present in the map",
    );

    // We also insert the new remappings of the package in this function, so
    // we access its array here.
    const npmPackageRemappings = this.#userRemappingsPerPackage.get(npmPackage);
    assertHardhatInvariant(
      npmPackageRemappings !== undefined,
      "The npm package must be present in the map",
    );

    // We first parse the remapping string and validate that it doesn't have
    // a context starting with `npm/`, and that the prefix and targets end in /.
    const remapping = parseRemappingString(remappingString);

    if (remapping === undefined) {
      return {
        remapping: remappingString,
        type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
        source: sourceOfTheRemapping,
      };
    }

    // User remappings must have each of their components ending with `/`,
    // except for the context, which may be empty.
    if (
      (remapping.context.length > 0 && !remapping.context.endsWith("/")) ||
      !remapping.prefix.endsWith("/") ||
      !remapping.target.endsWith("/")
    ) {
      return {
        remapping: remappingString,
        type: UserRemappingErrorType.ILLEGAL_REMAPPING_WIHTOUT_SLASH_ENDINGS,
        source: sourceOfTheRemapping,
      };
    }

    const relativeFsPathToRemappingsFile = path.relative(
      npmPackage.rootFsPath,
      path.dirname(sourceOfTheRemapping),
    );

    // If the remapping's target starts with `node_modules/`, we remove treat
    // it as trying to laod an npm dependency, otherwise we treat it as a local
    // remapping.

    // Local remapping case
    if (!remapping.target.startsWith("node_modules/")) {
      npmPackageRemappings.push({
        context: this.#updateRemappingsTxFragment(
          npmPackage,
          relativeFsPathToRemappingsFile,
          remapping.context,
        ),
        prefix: remapping.prefix,
        target: this.#updateRemappingsTxFragment(
          npmPackage,
          relativeFsPathToRemappingsFile,
          remapping.target,
        ),
        originalFormat: remappingString,
        source: sourceOfTheRemapping,
      });

      return;
    }

    // npm remapping case:

    // We remove the prefix from the actual target.
    const target = remapping.target.substring("node_modules/".length);

    // If after doing that the prefix and target are the same, we skip it
    // so that it doesn't even go unnecesarly go through a user remapping.
    if (remapping.prefix === target) {
      return;
    }

    // If we are treating it as remapping into an npm package, it's syntax,
    // after removing the `node_modules/` prefix, should be similar to
    // an npm module's (i.e. `<package-name>/<file-path>`), except that
    // `<file-path>` here could be a prefix, and not a file path.
    //
    // Note that that package name is the installation name of the dependency
    // within the npm package, not the actual dependency name.
    const installationName = getNpmPackageName(target);

    if (installationName === undefined) {
      return {
        type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
        source: sourceOfTheRemapping,
        remapping: remappingString,
      };
    }

    const dependencyNpmPackage =
      await this.#resolveDependencyByInstallationName(
        npmPackage,
        installationName,
      );

    // If we can't find the dependency, it hasn't been installed.
    if (dependencyNpmPackage === undefined) {
      return {
        remapping: remappingString,
        type: UserRemappingErrorType.REMAPPING_TO_UNINSTALLED_PACKAGE,
        source: sourceOfTheRemapping,
      };
    }

    // If the remapping is into an npm dependency, we don't need to change
    // its prefix, but just its context.
    npmPackageRemappings.push({
      context: this.#updateRemappingsTxFragment(
        npmPackage,
        relativeFsPathToRemappingsFile,
        remapping.context,
      ),
      prefix: remapping.prefix,
      originalFormat: remappingString,
      source: sourceOfTheRemapping,
      target:
        dependencyNpmPackage.package.rootSourceName +
        target.substring(installationName.length),
      targetNpmPackage: {
        installationName,
        package: dependencyNpmPackage.package,
      },
    });
  }

  /**
   * Resolves a dependency of the package `from` by its installation name.
   *
   * This is the internal implementation used by the public method with the
   * same name, and by the #validateAndResolveUserRemapping method.
   *
   * This method modifies the map, potentially loading new packages, but it
   * doesn't resolve their remappigns. i.e. it doesn't call
   * #resolveAnyRemainingRemappings.
   *
   * This method is pretty complex, so read the comments carefully.
   *
   * @param from The package from which the dependency is being resolved.
   * @param installationName The installation name of the dependency.
   * @returns The package and generated remappings, or undefined if the
   * dependency could not be resolved.
   */
  async #resolveDependencyByInstallationName(
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
      path.join(this.hardhatProjectPackage.rootFsPath, "package.json")
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
        this.hardhatProjectPackage.rootFsPath + path.sep,
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
      // We add the slash here if necessary
      relativeFsPathToRemappingsFileFromPackage.endsWith("/")
        ? relativeFsPathToRemappingsFileFromPackage
        : relativeFsPathToRemappingsFileFromPackage + "/",
      remappingFragment,
    );
  }
}
