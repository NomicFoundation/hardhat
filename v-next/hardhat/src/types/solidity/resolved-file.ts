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
  exports?: PackageExports;

  /**
   * The path to the package's root directory.
   */
  rootFsPath: string;

  /**
   * The prefix to all the input source names of the package's files.
   *
   * For example, package 'foo' with version '1.2.3' would have an input source
   * name root of 'npm/foo@1.2.3'.
   *
   * If the package is part of the monorepo, the input source name root would be
   * 'npm/package@local'.
   *
   * If this package represents the Hardhat project itself, it's 'project'.
   *
   * Note that this doesn't include a trailing slash.
   */
  inputSourceNameRoot: string;
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
  readonly type: ResolvedFileType.PROJECT_FILE;

  /**
   * The source name to be used when generating a compiler input, of the form
   * `project/<relative-path>`.
   */
  readonly inputSourceName: string;

  /**
   * The absolute path to the file.
   */
  readonly fsPath: string;

  /**
   * The file contents.
   */
  readonly content: FileContent;

  /**
   * The package of the Hardhat project itself.
   */
  readonly package: ResolvedNpmPackage;
}

/**
 * A file that's part of an npm package.
 */
export interface NpmPackageResolvedFile {
  type: ResolvedFileType.NPM_PACKAGE_FILE;

  /**
   * The source name to be used when generating a compiler input, of the form
   * `npm/<package-name>@<version>/<path>`.
   */
  inputSourceName: string;

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

export type PackageExports =
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
