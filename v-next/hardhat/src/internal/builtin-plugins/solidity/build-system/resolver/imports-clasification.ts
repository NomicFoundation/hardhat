import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { exists } from "@nomicfoundation/hardhat-utils/fs";
import {
  ResolvedFile,
  ResolvedFileType,
} from "../../../../../types/solidity.js";
import { Result } from "../../../../../types/utils.js";

export class ImportsClassifier {
  readonly #projectRoot: string;
  readonly #cachedResults = new Map<string, Map<string, boolean>>();

  constructor(projectRootAbsolutePath: string) {
    this.#projectRoot = projectRootAbsolutePath;
  }

  public async isUserRemappingTargetLocal(
    remappingLocation: "HardhatConfig" | string,
    remappingTarget: string,
  ): Promise<boolean> {
    const from =
      remappingLocation === "HardhatConfig"
        ? this.#projectRoot
        : path.dirname(remappingLocation);

    const slash = remappingTarget.indexOf("/");

    assertHardhatInvariant(
      slash !== -1,
      "The target of a user remapping must have at least one slash",
    );

    const firstDirectory = remappingTarget.substring(0, slash);

    if (firstDirectory === "hardhat") {
      return false;
    }

    return this.#existsLocally(from, firstDirectory);
  }

  public async isLocalImport(
    from: ResolvedFile,
    importPath: string,
    directImport: string,
  ): Promise<Result<boolean>> {
    const slash = directImport.indexOf("/");

    // If there's no slash, it's a file in the root directory of the package,
    // so it's local. Any npm import requires at least a slash.
    if (slash === -1) {
      return true;
    }

    const isRelativeImport =
      importPath.startsWith("./") || importPath.startsWith("../");

    let firstDirectoryFromPackageRoot;
    let packageRoot =
      from.type === ResolvedFileType.PROJECT_FILE
        ? this.#projectRoot
        : from.package.rootFsPath;

    if (isRelativeImport) {
      if (from.type === ResolvedFileType.PROJECT_FILE) {
        firstDirectoryFromPackageRoot = directImport.substring(0, slash);
      } else {
        firstDirectoryFromPackageRoot = directImport.substring(
          from.package.rootSourceName.length + 1,
          slash,
        );
      }
    } else {
      firstDirectoryFromPackageRoot = directImport.substring(0, slash);
    }

    if (firstDirectoryFromPackageRoot === "hardhat") {
      return false;
    }

    return false;
    // return this.#existsLocally(, firstDirectoryFromPackageRoot);
  }

  async #existsLocally(from: string, directory: string): Promise<boolean> {
    let fromResults = this.#cachedResults.get(from);
    if (fromResults === undefined) {
      fromResults = new Map();
      this.#cachedResults.set(from, fromResults);
    }

    const cachedResults = fromResults.get(directory);
    if (cachedResults !== undefined) {
      return cachedResults;
    }

    const result = await exists(path.join(from, directory));
    fromResults.set(directory, result);

    return result;
  }
}

/**
 * Determins if a given direct import should be considered local or not in the
 * context of a certain npm package, including the Hardhat project.
 *
 *
 *
 * @param npmPackageRootFsPath The aboslute path to the root directory of the
 * npm package, which can be the Hardhat project itself.
 * @param directImport The direct import.
 * @returns
 */
export async function isLocalDirectImportFromPackageRoot(
  npmPackageRootFsPath: string,
  directImport: string,
): Promise<boolean> {
  // NOTE: As we treat `hardhat/console.sol` as a special case, if we need a
  // remapping for it, we should also treat it as a special case.
  if (directImport === "hardhat/console.sol") {
    return false;
  }

  const slash = directImport.indexOf("/");

  // If it's a file in the root directory
  // We also if it has a dot so that we can use this function for
  // remappings, which may not have a slash, and yet they aren't
  if (slash === -1) {
    return true;
  }

  const firstDirectory = directImport.substring(0, slash);

  // TODO: Should we cache this?
  return exists(path.join(npmPackageRootFsPath, firstDirectory));
}

/**
 * Returns the prefix used to desambiguate a directImport by
 * #isDirectImportLocal to determine if its local.
 *
 * For example, the prefix for `foo/bar/File.sol`, this returns `foo/`.
 *
 * NOTE: This method does not support `hardhat/console.sol`, as that's a
 * special case, which is never considered local.
 */
export function getDirectImportLocalDesambiguationPrefix(
  directImport: string,
): string {
  const slash = directImport.indexOf("/");

  // If it's a file in the root directory
  if (slash === -1) {
    return directImport;
  }

  const firstDirectory = directImport.substring(0, slash + 1);

  return firstDirectory;
}
