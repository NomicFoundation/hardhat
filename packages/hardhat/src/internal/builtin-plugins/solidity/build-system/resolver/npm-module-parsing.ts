import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

const NPM_MODULE_PATTERN =
  /^(?<package>(?:@[a-z0-9]+(?:[._-][a-z0-9]+)*\/)?[a-z0-9]+(?:[._-][a-z0-9]+)*(?:@(?:\d+\.)?(?:\d+\.)?(?:\*|\d+))?)\/(?<path>.+)$/;
const NPM_MODULE_OR_PREFIX_PATTERN =
  /^(?<package>(?:@[a-z0-9]+(?:[._-][a-z0-9]+)*\/)?[a-z0-9]+(?:[._-][a-z0-9]+)*(?:@(?:\d+\.)?(?:\d+\.)?(?:\*|\d+))?)\/?.*$/;

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
  const match = NPM_MODULE_PATTERN.exec(directImport);

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
 * Parses an npm module or prefix of a module, returning the name of the
 * package.
 *
 * The reason it supports prefixes is because we want to extract npm package
 * names from remappings, which may be just `@openzeppelin/contracts/`, and
 * not an entire module.
 *
 * @param npmModuleOrPrefixOfModule The npm module or prefix of a module.
 * @returns The name of the package.
 */
export function getNpmPackageName(
  npmModuleOrPrefixOfModule: string,
): string | undefined {
  const match = NPM_MODULE_OR_PREFIX_PATTERN.exec(npmModuleOrPrefixOfModule);

  if (match === null) {
    return undefined;
  }

  assertHardhatInvariant(
    match.groups !== undefined,
    "Groups should be defined because they are part of the pattern",
  );

  return match.groups.package;
}
