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
  readJsonFile,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import {
  findDependencyPackageJson,
  type PackageJson,
} from "@nomicfoundation/hardhat-utils/package";

import { UserRemappingErrorType } from "../../../../../types/solidity.js";

import {
  getDirectImportLocalDesambiguationPrefix,
  isLocalDirectImport,
} from "./imports-clasification.js";
import { getNpmPackageName } from "./npm-moudles-parsing.js";
import { parseRemappingString } from "./remappings.js";
import { sourceNamePathJoin } from "./source-name-utils.js";

/**
 * A user remapping, parsed, and with its npm package resolved, if any.
 */
export interface ResolvedUserRemapping extends Remapping {
  context: string;
  prefix: string;
  target: string;
  originalFormat: string;
  source: "HardhatConfig" | string;
  targetNpmPackage?: {
    installationName: InstallationName;
    package: ResolvedNpmPackage;
  };
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
 * Note that local remappings of npm packages will be turned into two different
 * remapping objects. One targets relative imports, and the other one direct
 * imports. The one with relative imports needs to have its prefix updated,
 * because solc will resolve the relative import before looking for a remapping.
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
   * The user remappings from the Hardhat config.
   */
  readonly #configUserRemappings: string[];

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
    configUserRemappings: string[],
  ): Promise<Result<RemappedNpmPackagesMap, UserRemappingError[]>> {
    const projectPackageJson = await readJsonFile<PackageJson>(
      path.join(projectRootPath, "package.json"),
    );

    const resolvedNpmPackage: ResolvedNpmPackage = {
      name: projectPackageJson.name,
      version: projectPackageJson.version,
      exports: projectPackageJson.exports,
      rootFsPath: projectRootPath,
      rootSourceName: "",
    };

    const map = new RemappedNpmPackagesMap(
      resolvedNpmPackage,
      configUserRemappings,
    );
    const errors = await map.#resolveAnyRemainingRemappings();

    if (errors.length > 0) {
      return { success: false, error: errors };
    }

    return {
      success: true,
      value: map,
    };
  }

  private constructor(
    hardhatProjectPackage: ResolvedNpmPackage,
    configUserRemappings: string[],
  ) {
    this.hardhatProjectPackage = hardhatProjectPackage;
    this.#configUserRemappings = configUserRemappings;
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

  /**
   * Generates the remapping needed to import a local file using a direct import.
   */
  public async generateRemappingForLocalDirectImport(
    fromNpmPackage: ResolvedNpmPackage,
    directImport: string,
  ): Promise<Remapping> {
    const prefix = getDirectImportLocalDesambiguationPrefix(directImport);

    // TODO: Cache this

    return {
      context: fromNpmPackage.rootSourceName,
      prefix,
      target: fromNpmPackage.rootSourceName + directImport,
    };
  }

  public getLegacyRemappings(): Remapping[] {
    const hardhatProjectRemappings = this.getUserRemappings(
      this.hardhatProjectPackage,
    );

    const userRemappings = hardhatProjectRemappings.map((remapping) => ({
      context: remapping.context,
      prefix: remapping.prefix,
      target: remapping.target,
    }));

    const remappings: Remapping[] = [];

    for (const [
      thePackage,
      dependenciesMap,
    ] of this.#installationMap.entries()) {
      let context: string;

      if (thePackage === this.hardhatProjectPackage) {
        context = "";
      } else {
        context = thePackage.rootSourceName;
      }

      for (const [importedPackage, dependency] of dependenciesMap.entries()) {
        // As `hardhat/console.sol` is always resolved through npm, even if the
        // `hardhat/` folder exists in the root of the package/project, we
        // only remap that file.
        //
        // We should revisit this if we exported more solidity files in the
        // hardhat package in the future.
        //
        // Also note that we are using the importedPackageName here, and not
        // the dependency's name, and that's because we always resolve 'hardhat'
        // as the hh package itself. If someone installs another package as
        // "hardhat", it may break.
        if (
          dependency.package !== this.hardhatProjectPackage &&
          importedPackage === "hardhat"
        ) {
          const prefix = importedPackage + "/console.sol";
          const target = dependency.package.rootSourceName + "/console.sol";

          remappings.push({ context, prefix, target });
        } else {
          const prefix = importedPackage + "/";

          const target =
            dependency.package === this.hardhatProjectPackage
              ? ""
              : dependency.package.rootSourceName + "/";

          // If a dependency is being remapped by the user using the same
          // prefix, we don't want to override it, as it can cause problems
          // when a file from that dependency is also treated as a root.
          //
          // For example, if the user sets this remapping
          // "forge-std/=npm/forge-std@1.9.4/src/" and for some reason also
          // compiles "forge-std/src/Test.sol" as a root.
          //
          // Without this check, we would have two remappings in the solc input:
          //    "forge-std/=npm/forge-std@1.9.4/src/"
          //    "forge-std/=npm/forge-std@1.9.4/"
          // and the latter would win, leading to a compilation error.
          if (thePackage === this.hardhatProjectPackage) {
            if (hardhatProjectRemappings.some((r) => r.prefix === prefix)) {
              continue;
            }
          }

          remappings.push({ context, prefix, target });
        }
      }
    }

    return [...userRemappings, ...remappings];
  }

  public toJSON(): any {
    return {
      hardhatProjectPackage: this.hardhatProjectPackage,
      configUserRemappings: this.#configUserRemappings,
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

    if (npmPackage === this.hardhatProjectPackage) {
      for (const userRemapping of this.#configUserRemappings) {
        const error = await this.#validateAndResolveUserRemapping(
          this.hardhatProjectPackage,
          npmPackage.rootFsPath,
          userRemapping,
        );

        if (error !== undefined) {
          errors.push(error);
        }
      }
    }

    // Currently we only load the `remappings.txt` file in the root of the
    // npm package.
    const packageRemappingsTxtFsPath = path.join(
      npmPackage.rootFsPath,
      "remappings.txt",
    );

    if (await exists(packageRemappingsTxtFsPath)) {
      const packageRemappingsTxtContents = await readUtf8File(
        packageRemappingsTxtFsPath,
      );

      const rawUserRemappings = packageRemappingsTxtContents
        .split("\n")
        .map((line) => line.trim());

      for (const userRemapping of rawUserRemappings) {
        const error = await this.#validateAndResolveUserRemapping(
          npmPackage,
          packageRemappingsTxtFsPath,
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
    sourceOfTheRemapping: "HardhatConfig" | string,
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

    if (
      remapping.context.startsWith("npm/") ||
      remapping.prefix.startsWith("npm/") ||
      remapping.target.startsWith("npm/")
    ) {
      return {
        remapping: remappingString,
        type: UserRemappingErrorType.REMAPPING_WITH_NPM_SYNTAX,
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

    // If the remapping's target starts with `node_modules/`, we remove it,
    // so that it's resolved through the acutal npm resolution rules.
    if (remapping.target.startsWith("node_modules/")) {
      remapping.target = remapping.target.substring("node_modules/".length);

      // If after doing that the prefix and target are the same, we skip it
      // so that it doesn't even go through the remappings rules.
      if (remapping.prefix === remapping.target) {
        return;
      }
    }

    // If we are treating it as remapping into an npm package, we use the
    // same syntax as an npm module would (i.e. `<package-name>/<file-path>`),
    // except that `<file-path>` here could be a prefix, and not a file path.
    //
    // Note that that package name is the installation name of the dependency
    // within the npm package, not the actual dependency name.
    const installationName = getNpmPackageName(remapping.target);

    // If the remapping looks like a local import or if we can't parse its
    // installation name from the target, we treat it as a remapping
    // into local files within the npmPackage.
    if (
      (await isLocalDirectImport(npmPackage.rootFsPath, remapping.target)) ||
      installationName === undefined
    ) {
      // We may need to turn this single remapping into two:
      //  - One that remaps local files based on their entire source name
      //    after having resolved a relative import. For example, `./bar.sol`
      //    being turned into `npm/foo@1.2.3/bar.sol`.
      //  - One that remaps the import as a direct import from the root of
      //    the npm package. For example, `import "bar.sol"` won't
      //    turn into "npm/foo@123/bar.sol" before picking the remapping, so
      //    we need to add a new one for this case..
      //
      // At the same time, if the npm package is the hardhat project itself,
      // we don't need to update it.

      if (npmPackage !== this.hardhatProjectPackage) {
        npmPackageRemappings.push({
          ...remapping,
          originalFormat: remappingString,
          source: sourceOfTheRemapping,
        });

        return;
      }

      // Remapping for the full source name after relative imports
      npmPackageRemappings.push({
        context: sourceNamePathJoin(
          npmPackage.rootSourceName,
          remapping.context,
        ),
        prefix: sourceNamePathJoin(npmPackage.rootSourceName, remapping.prefix),
        target: sourceNamePathJoin(npmPackage.rootSourceName, remapping.target),
        originalFormat: remappingString,
        source: sourceOfTheRemapping,
      });

      // Remapping for the direct import
      npmPackageRemappings.push({
        context: sourceNamePathJoin(
          npmPackage.rootSourceName,
          remapping.context,
        ),
        prefix: remapping.prefix,
        target: sourceNamePathJoin(npmPackage.rootSourceName, remapping.target),
        originalFormat: remappingString,
        source: sourceOfTheRemapping,
      });

      return;
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
      context: sourceNamePathJoin(npmPackage.rootSourceName, remapping.context),
      prefix: remapping.prefix,
      originalFormat: remappingString,
      source: sourceOfTheRemapping,
      target:
        dependencyNpmPackage.package.rootSourceName +
        remapping.target.substring(installationName.length),
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
   * @returns The dependency, or `undefined` if it's not installed.
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
    // exists in the map. The hardhat proejct has an empty root source name.
    const rootSourceName =
      dependencyPackageJsonPath ===
      path.join(this.hardhatProjectPackage.rootFsPath, "package.json")
        ? ""
        : npmPackageToRootSourceName(
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
        generatedRemapping: this.#generateRemapping(
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
    };

    this.#insertNewPackage(newDependencyNpmPackage);

    const resultOfNewPackage = {
      package: newDependencyNpmPackage,
      generatedRemapping: this.#generateRemapping(
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
  #generateRemapping(
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
}

function npmPackageToRootSourceName(name: string, version: string): string {
  return `npm/${name}@${version}`;
}
