/**
 * The representation of an npm package.
 */
export interface ResolvedNpmPackage {
  /**
   * The name of the package, potentially scopde.
   */
  name: string;

  /**
   * The version of the package.
   */
  version: string;

  /**
   * The exports of the package.
   */
  exports?: PacakgeExports;

  /**
   * The path to the package's root directory.
   */
  rootFsPath: string;

  /**
   * The prefix that represents the source name of the package's files.
   *
   * For example, package 'foo' with version '1.2.3' would have a root source
   * name of 'npm/foo@1.2.3/'. If the package is part of the monorepo, the root
   * source name would be 'npm/package@local/'.
   *
   * Note that this can be derived from the rest of the fields, but it's
   * cached here for performance reasons.
   */
  rootSourceName: string;
}

/**
 * The possible types of resolved files.
 */
export enum ResolvedFileType {
  PROJECT_FILE = "PROJECT_FILE",
  NPM_PACKAGE_FILE = "NPM_PACKAGE_FILE",
}

/**
 * A file that's part of the Hardhat project (i.e. not installed through npm).
 */
export interface ProjectResolvedFile {
  type: ResolvedFileType.PROJECT_FILE;

  /**
   * The source name of a project files is its relative path from the Hardhat
   * project root.
   */
  sourceName: string;

  /**
   * The absolute path to the file.
   */
  fsPath: string;

  /**
   * The file contents.
   */
  content: FileContent;

  /**
   * Return the non-cryptographic hash id of the file contents.
   */
  getContentHash(): Promise<string>;
}

/**
 * A file that's part of an npm package.
 */
export interface NpmPackageResolvedFile {
  type: ResolvedFileType.NPM_PACKAGE_FILE;

  /**
   * The source of an npm package file is `npm/<package-name>@<version>/<path>`.
   */
  sourceName: string;

  /**
   * The absolute path to the file.
   */
  fsPath: string;

  /**
   * The file contents.
   */
  content: FileContent;

  /**
   * The package this file belongs to.
   */
  package: ResolvedNpmPackage;

  /**
   * Return the non-cryptographic hash id of the file contents.
   */
  getContentHash(): Promise<string>;
}

/**
 * The resolult of resolving a file or import using a Resolver.
 */
export type ResolvedFile = ProjectResolvedFile | NpmPackageResolvedFile;

/**
 * The contents of a Solidity file.
 */
export interface FileContent {
  /**
   * The raw text of the file.
   */
  text: string;

  /**
   * The list of importPaths that are used in the file.
   */
  importPaths: string[];

  /**
   * The list of version pragmas that are used in the file.
   */
  versionPragmas: string[];
}

/* Adapted from `resolve.exports`. License: https://github.com/lukeed/resolve.exports/blob/master/license */

export type PacakgeExports =
  | PackageExportPath
  | {
      [path: PackageExportsEntry]: PackageExportsValue;
      [condition: string]: PackageExportsValue;
    };

/** Allows "." and "./{name}" */
export type PackageExportsEntry = `.${string}`;

/** Internal path */
export type PackageExportPath = `./${string}`;

export type PackageExportsValue =
  | PackageExportPath
  | null
  | {
      [condition: string]: PackageExportsValue;
    }
  | PackageExportsValue[];
