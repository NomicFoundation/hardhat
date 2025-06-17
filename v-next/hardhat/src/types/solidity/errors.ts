import type { ResolvedFileType } from "./resolved-file.js";

export enum RootResolutionErrorType {
  /**
   * Trying to resolve a project file as root, but it's not part of the project.
   */
  PROJECT_ROOT_FILE_NOT_IN_PROJECT = "PROJECT_ROOT_FILE_NOT_IN_PROJECT",

  /**
   * Trying to resolve a project file as root, but it doesn't exist.
   */
  PROJECT_ROOT_FILE_DOESNT_EXIST = "PROJECT_ROOT_FILE_DOESNT_EXIST",

  /**
   * Trying to resolve a project file as root, but it's in a node_modules
   * directory.
   */
  PROJECT_ROOT_FILE_IN_NODE_MODULES = "PROJECT_ROOT_FILE_IN_NODE_MODULES",

  /**
   * Trying to resolve an npm file as root, but it's module name has an invalid
   * format.
   */
  NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT = "NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT",

  /**
   * Trying to resolve an npm file as root resolves into a project file
   * because a direct local import was provided (e.g. "contracts/A.sol"), or
   * because its being affected by a user remapping which resolves into a
   * project file.
   */
  NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE = "NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE",

  /**
   * Trying to resolve an npm file as root, but it's package is not installed.
   */
  NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE = "NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE",

  /**
   * Trying to resolve an npm file as root, but remapping errors were found.
   */
  NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS = "NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS",

  /**
   * Trying to resolve an npm file as root, but it doesn't exist within its
   * package.
   */
  NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE = "NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE",

  /**
   * Trying to resolve an npm file as root, but the casing you are using is
   * incorrect.
   */
  NPM_ROOT_FILE_WITH_INCORRRECT_CASING = "NPM_ROOT_FILE_WITH_INCORRRECT_CASING",

  /**
   * Trying to resolve an npm file as root, but the file is not exported by the
   * package.
   */
  NPM_ROOT_FILE_NON_EXPORTED_FILE = "NPM_ROOT_FILE_NON_EXPORTED_FILE",
}

export interface ProjectRootFileNotInProjectError {
  type: RootResolutionErrorType.PROJECT_ROOT_FILE_NOT_IN_PROJECT;
  absoluteFilePath: string;
}

export interface ProjectRootFileDoesntExistError {
  type: RootResolutionErrorType.PROJECT_ROOT_FILE_DOESNT_EXIST;
  absoluteFilePath: string;
}

export interface ProjectRootFileInNodeModulesError {
  type: RootResolutionErrorType.PROJECT_ROOT_FILE_IN_NODE_MODULES;
  absoluteFilePath: string;
}

export interface NpmRootFileNameWithInvalidFormatError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT;
  npmModule: string;
}

export interface NpmRootFileResolvesToProjectFileError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE;
  npmModule: string;
  userRemapping?: UserRemappingReference;
  resolvedFileFsPath: string;
}

export interface NpmRootFileOfUninstalledPackageError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE;
  npmModule: string;
  installationName: string;
}

export interface NpmRootResolutionWithRemappingErrors {
  type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS;
  npmModule: string;
  remappingErrors: UserRemappingError[];
}

export interface NpmRootFileDoesntExistWithinPackageError
  extends ResolvedFileReference {
  type: RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE;
  npmModule: string;
}

export interface NpmRootFileWithIncorrectCasingError
  extends ResolvedFileReference {
  type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING;
  npmModule: string;
  correctCasing: string;
}

export interface NpmRootFileNonExportedFileError extends ResolvedFileReference {
  type: RootResolutionErrorType.NPM_ROOT_FILE_NON_EXPORTED_FILE;
  npmModule: string;
}

export type ProjectRootResolutionError =
  | ProjectRootFileNotInProjectError
  | ProjectRootFileDoesntExistError
  | ProjectRootFileInNodeModulesError;

export type NpmRootResolutionError =
  | NpmRootFileNameWithInvalidFormatError
  | NpmRootFileResolvesToProjectFileError
  | NpmRootFileOfUninstalledPackageError
  | NpmRootResolutionWithRemappingErrors
  | NpmRootFileDoesntExistWithinPackageError
  | NpmRootFileWithIncorrectCasingError
  | NpmRootFileNonExportedFileError;

export type RootResolutionError =
  | ProjectRootResolutionError
  | NpmRootResolutionError;

/**
 * The different types of errors that can happen when resolving an import.
 */
export enum ImportResolutionErrorType {
  /**
   * An import has windows path separators.
   */
  IMPORT_WITH_WINDOWS_PATH_SEPARATORS = "IMPORT_WITH_WINDOWS_PATH_SEPARATORS",
  /**
   * A relative import gets outside of its package/project.
   */
  ILLEGAL_RELATIVE_IMPORT = "ILLEGAL_RELATIVE_IMPORT",
  /**
   * A relative import gets into node_modules instead of just using the
   * npm module name.
   */
  RELATIVE_IMPORT_INTO_NODE_MODULES = "RELATIVE_IMPORT_INTO_NODE_MODULES",
  /**
   * The improted file doesn't exist.
   */
  IMPORT_DOESNT_EXIST = "IMPORT_DOESNT_EXIST",
  /**
   * The imported file exists, but the casing you are using is incorrect.
   */
  IMPORT_INVALID_CASING = "IMPORT_INVALID_CASING",
  /**
   * Trying to import a file via npm, but the import sintax is invalid.
   */
  IMPORT_WITH_INVALID_NPM_SYNTAX = "IMPORT_WITH_INVALID_NPM_SYNTAX",
  /**
   * Importing an uninstalled npm package.
   */
  IMPORT_OF_UNINSTALLED_PACKAGE = "IMPORT_OF_UNINSTALLED_PACKAGE",
  /**
   * Processing an import lead to loading remappings with errors.
   */
  IMPORT_WITH_REMAPPING_ERRORS = "WITH_REMAPPING_ERRORS",
  /**
   * Importing a file that is not exported by the npm package' package.exports.
   */
  IMPORT_OF_NON_EXPORTED_NPM_FILE = "IMPORT_OF_NON_EXPORTED_NPM_FILE",

  /**
   * A relative import is affected by a user remapping, which we forbid.
   */
  RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING = "RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING",

  /**
   * A direct import to a local file was found, which we forbid.
   */
  DIRECT_IMPORT_TO_LOCAL_FILE = "DIRECT_IMPORT_TO_LOCAL_FILE",
}

export interface ImportWithWindowsPathSeparatorsError {
  type: ImportResolutionErrorType.IMPORT_WITH_WINDOWS_PATH_SEPARATORS;
  fromFsPath: string;
  importPath: string;
}

export interface IllegalRelativeImportError {
  type: ImportResolutionErrorType.ILLEGAL_RELATIVE_IMPORT;
  fromFsPath: string;
  importPath: string;
}

export interface RelativeImportIntoNodeModulesError {
  type: ImportResolutionErrorType.RELATIVE_IMPORT_INTO_NODE_MODULES;
  fromFsPath: string;
  importPath: string;
}

export interface ImportDoesntExistError extends ResolvedFileReference {
  type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST;
  fromFsPath: string;
  importPath: string;
}

export interface ImportInvalidCasingError extends ResolvedFileReference {
  type: ImportResolutionErrorType.IMPORT_INVALID_CASING;
  fromFsPath: string;
  importPath: string;
  correctCasing: string;
}

export interface ImportWithInvalidNpmSyntaxError {
  type: ImportResolutionErrorType.IMPORT_WITH_INVALID_NPM_SYNTAX;
  fromFsPath: string;
  importPath: string;
}

export interface ImportOfUninstalledPackageError {
  type: ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE;
  fromFsPath: string;
  importPath: string;
  installationName: string;
  userRemapping?: UserRemappingReference;
}

export interface ImportWithRemappingErrorsError {
  type: ImportResolutionErrorType.IMPORT_WITH_REMAPPING_ERRORS;
  fromFsPath: string;
  importPath: string;
  remappingErrors: UserRemappingError[];
}

export interface ImportOfNonExportedNpmFileError extends ResolvedFileReference {
  type: ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE;
  fromFsPath: string;
  importPath: string;
}

export interface RelativeImportClashesWithUserRemappingError {
  type: ImportResolutionErrorType.RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING;
  fromFsPath: string;
  importPath: string;
  userRemapping: UserRemappingReference;
}

export interface DirectImportToLocalFileError {
  type: ImportResolutionErrorType.DIRECT_IMPORT_TO_LOCAL_FILE;
  fromFsPath: string;
  importPath: string;
  suggestedRemapping: string;
}

export type ImportResolutionError =
  | ImportWithWindowsPathSeparatorsError
  | IllegalRelativeImportError
  | RelativeImportIntoNodeModulesError
  | ImportDoesntExistError
  | ImportInvalidCasingError
  | ImportWithInvalidNpmSyntaxError
  | ImportOfUninstalledPackageError
  | ImportWithRemappingErrorsError
  | ImportOfNonExportedNpmFileError
  | RelativeImportClashesWithUserRemappingError
  | DirectImportToLocalFileError;

/**
 * The different types of errors that can happen when processing a user
 * remapping.
 */
export enum UserRemappingErrorType {
  /**
   * The syntax of the remapping is invalid.
   */
  REMAPPING_WITH_INVALID_SYNTAX = "REMAPPING_WITH_INVALID_SYNTAX",

  /**
   * Remapping into an uninstalled npm package.
   */
  REMAPPING_TO_UNINSTALLED_PACKAGE = "REMAPPING_TO_UNINSTALLED_PACKAGE",
}

export interface UserRemappingError {
  type: UserRemappingErrorType;
  remapping: string;
  source: UserRemappingSource;
}

/**
 * The source where a user remapping was originally read from. i.e. The absolute
 * path to a remappings.txt.
 */
export type UserRemappingSource = string;

/**
 * A reference to a user remapping.
 */
export interface UserRemappingReference {
  originalUserRemapping: string;
  actualUserRemapping: string;
  remappingSource: string;
}

/**
 * A reference to an npm package.
 */
export interface NpmPackageReference {
  name: string;
  version: string;
  rootFsPath: string;
}

/**
 * A shared base interface for errors that refer to the expected target of a
 * resolution.
 */
export interface ResolvedFileReference {
  /**
   * The type of file.
   */
  resolvedFileType: ResolvedFileType;

  /**
   * Its npm package.
   */
  npmPackage: NpmPackageReference;

  // Only present if using a user remapping. If this is present, then no
  // package.exports logic is applied, so packageExportsResolvedSubpath is
  // undefined.
  userRemapping?: UserRemappingReference;

  // The subpath within the package that we are trying to import.
  //
  // This means different things depending on the type of import:
  //  - For a relative import, its the relative source name from the package's
  //    root source name.
  //  - For a user remapping, its the relative source name from the package's
  //    root source name, after applying the user remapping.
  //  - For an npm import, it's the npm-subpath. i.e. the module identifier
  //    without the package name.
  subpath: string;

  // The subpath after resolving package.exports
  //
  // Only present when actually using package.exports.
  packageExportsResolvedSubpath?: string;
}
