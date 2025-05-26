import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

/**
 * Parses a direct import as if it were an npm import, returning `undefined`
 * if the format is invalid.
 *
 * Note: The returned subpath is not an fs path, and always use path.posix.sep
 */
export function parseNpmDirectImport(directImport: string):
  | {
      package: string;
      subpath: string;
    }
  | undefined {
  // NOTE: We assume usage of path.posix.sep in the direct import
  const directImportPattern =
    /^(?<package>(?:@[a-z0-9-~._]+\/)?[a-z0-9-~][a-z0-9-~._]*)\/(?<path>.*)$/;

  const match = directImportPattern.exec(directImport);

  if (match === null) {
    return undefined;
  }

  assertHardhatInvariant(
    match.groups !== undefined,
    "Groups should be defined because they are part of the pattern",
  );

  return { package: match.groups.package, subpath: match.groups.path };
}

/**
 * Parses an npm module or suffix of a module, returning the name of the
 * package.
 *
 * The reason it supports suffixes is because we want to extrat npm package
 * names from remappings, which may be just `@openzeppelin/contracts/`, and
 * not an entire module.
 *
 * @param npmModuleOrsuffixOfModule The npm module or suffix of a module.
 * @returns The name of the package.
 */
export function getNpmPackageName(
  npmModuleOrsuffixOfModule: string,
): string | undefined {
  const result = parseNpmDirectImport(npmModuleOrsuffixOfModule);

  return result?.package;
}
