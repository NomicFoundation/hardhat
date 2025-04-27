import path from "node:path";

import { exists } from "@nomicfoundation/hardhat-utils/fs";

/**
 * Determins if a given direct import should be considered local or not in the
 * context of a certain npm package, including the Hardhat project.
 *
 * @param npmPackageRootFsPath The aboslute path to the root directory of the
 * npm package, which can be the Hardhat project itself.
 * @param directImport The direct import.
 * @returns
 */
export async function isLocalDirectImport(
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
