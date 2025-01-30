/**
 * @file This file contains utilities to work with the path of root files.
 *
 * The SolidityBuildSystem has a different way to referring to root files when
 * they come from npm packages, which is the `npm:<package>/file` string. This
 * file contains utilities to work with these paths.
 *
 * The main reason for this `npm:` prefix is to make the SolidityBuildSystem
 * APIs ergonomic, instead of using a tagged union type everywhere, but it adds
 * some complexity to the implementation.
 */

import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";

import { ResolvedFileType } from "../../../../types/solidity/resolved-file.js";

/**
 * The result of parsing a root path.
 * @see parseRootPath
 */
export type ParsedRootPath = { npmPath: string } | { fsPath: string };

/**
 * Parses the path of a root file, as received by the SolidityBuildSystem APIs.
 *
 * @param rootPath The root path.
 * @returns The parsed root path.
 */
export function parseRootPath(rootPath: string): ParsedRootPath {
  if (rootPath.startsWith("npm:")) {
    return { npmPath: rootPath.substring(4) };
  }

  return { fsPath: rootPath };
}

/**
 * Returns true if the given root path is for a npm file.
 */
export function isNpmRootPath(rootPath: string): boolean {
  return rootPath.startsWith("npm:");
}

/**
 * Returns an npm root path for the given module.
 * @param mod A module name, i.e. `<package>/<file>`.
 * @returns The npm root path.
 */
export function npmModuleToNpmRootPath(mod: string): string {
  return `npm:${mod}`;
}

/**
 * Returns true if the given parsed root path is for a npm file.
 */
export function isNpmParsedRootPath(
  parsedRootPath: ParsedRootPath,
): parsedRootPath is { npmPath: string } {
  return "npmPath" in parsedRootPath;
}

/**
 * Formats the path of a root file, making it compatible with the
 * SolidityBuildSystem APIs.
 *
 * @param publicSourceName The public source name of the root file.
 * @param rootFile The root file.
 * @returns The formatted path.
 */
export function formatRootPath(
  publicSourceName: string,
  rootFile: ResolvedFile,
): string {
  if (rootFile.type !== ResolvedFileType.NPM_PACKAGE_FILE) {
    return publicSourceName;
  }

  return `npm:${publicSourceName}`;
}
