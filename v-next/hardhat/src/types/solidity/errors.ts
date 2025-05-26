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
   * Trying to resolve an npm file as root resolves into a project file, either
   * because the user is trying to use project's own files as npm roots
   * (e.g. `<package-name>/File.sol`), or because its being affected by a user
   * remapping which resolves into a project file.
   */
  NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE = "NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE",

  /**
   * Trying to resolve an npm file as root, but it's package is not installed.
   */
  NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE = "NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE",

  /**
   * Trying to resolve an npm file as root, but when loading its package we
   * encountered remapping errors.
   */
  NPM_ROOT_FILE_OF_PACKAGE_WITH_REMAPPING_ERRORS = "NPM_ROOT_FILE_OF_PACKAGE_WITH_REMAPPING_ERRORS",

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
}

export interface NpmRootFileOfUninstalledPackageError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE;
  npmModule: string;
  installationName: string;
}

export interface NpmRootFileOfPackageWithRemappingErrors {
  type: RootResolutionErrorType.NPM_ROOT_FILE_OF_PACKAGE_WITH_REMAPPING_ERRORS;
  npmModule: string;
  installationName: string;
  npmPackage: NpmPackageReference;
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
  | NpmRootFileOfPackageWithRemappingErrors
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
   * Importing an npm package and when loading it one ore more remapping errors
   * were found.
   */
  IMPORT_OF_NPM_PACKAGE_WITH_REMAPPING_ERRORS = "IMPORT_OF_NPM_PACKAGE_WITH_REMAPPING_ERRORS",

  /**
   * Importing a file that is not exported by the npm package' package.exports.
   */
  IMPORT_OF_NON_EXPORTED_NPM_FILE = "IMPORT_OF_NON_EXPORTED_NPM_FILE",
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
}

export interface ImportOfNpmPackageWithRemappingErrorsError {
  type: ImportResolutionErrorType.IMPORT_OF_NPM_PACKAGE_WITH_REMAPPING_ERRORS;
  fromFsPath: string;
  importPath: string;
  npmPackage: NpmPackageReference;
  remappingErrors: UserRemappingError[];
}

export interface ImportOfNonExportedNpmFileError extends ResolvedFileReference {
  type: ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE;
  fromFsPath: string;
  importPath: string;
}

export type ImportResolutionError =
  | ImportWithWindowsPathSeparatorsError
  | IllegalRelativeImportError
  | ImportDoesntExistError
  | ImportInvalidCasingError
  | ImportWithInvalidNpmSyntaxError
  | ImportOfUninstalledPackageError
  | ImportOfNpmPackageWithRemappingErrorsError
  | ImportOfNonExportedNpmFileError;

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

  /**
   * Remapping that has context, prefix or target that doesn't end in /.
   */
  ILLEGAL_REMAPPING_WIHTOUT_SLASH_ENDINGS = "ILLEGAL_REMAPPING_WIHTOUT_SLASH_ENDINGS",
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
 *
 * It includes logic of the npm package it's trying to import, the user
 * remapping its being applied (if any), the file it's trying to import,
 * and the package.exports resolution.
 */
export interface ResolvedFileReference {
  // Only present if the import isn't into a project file
  npmPackage?: NpmPackageReference;

  // Only present if using a user remapping. If this is present, then no
  // package.exports logic is applied, so packageExportsResolvedSubpath is
  // undefined.
  userRemapping?: UserRemappingReference;

  // The file we are trying to import. This isn't necessarly the same as the
  // import path.
  //
  // TODO: Explain better.
  subpath: string;

  // The subpath after resolving package.exports
  //
  // Only present if importing through npm, there package uses package.exports,
  // and the import isn't affected by a user remapping.
  packageExportsResolvedSubpath?: string;
}
