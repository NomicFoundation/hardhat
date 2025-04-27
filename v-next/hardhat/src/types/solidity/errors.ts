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
   * Trying to resolve an npm file as root, but it's module name has an invalid
   * format.
   */
  NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT = "NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT",

  /**
   * Trying to resolve an npm file as root, but its module name clashes with a
   * project file, which is ambiguous.
   *
   * For example, if you were to try to resolve `package/File.sol` as an npm
   * root, and you have a folder called `pacakge/` in the root of your project,
   * you'd get this error.
   *
   * The reason for this is that if we would resolve it to an npm file, it would
   * behave differently as if we had `import "package/File.sol";` in one of the
   * project files.
   */
  NPM_ROOT_FILE_NAME_CLASHES_WITH_PROJECT_FILE = "NPM_ROOT_FILE_NAME_CLASHES_WITH_PROJECT_FILE",

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
}

export interface ProjectRootFileNotInProjectError {
  type: RootResolutionErrorType.PROJECT_ROOT_FILE_NOT_IN_PROJECT;
  absoluteFilePath: string;
}

export interface ProjectRootFileDoesntExistError {
  type: RootResolutionErrorType.PROJECT_ROOT_FILE_DOESNT_EXIST;
  absoluteFilePath: string;
}

export interface NpmRootFileNameWithInvalidFormatError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT;
  npmModule: string;
}

export interface NpmRootFileClashesWithProjectFileError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_CLASHES_WITH_PROJECT_FILE;
  npmModule: string;
  directory: string;
}

export interface NpmRootFileResolvesToProjectFileError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE;
  npmModule: string;
  userRemapping?: {
    originalUserRemapping: string;
    actualUserRemapping: string;
    remappingSource: "HardhatConfig" | string;
  };
}

export interface NpmRootFileOfUninstalledPackageError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE;
  npmModule: string;
  packageName: string;
}

export interface NpmRootFileOfPackageWithRemappingErrors {
  type: RootResolutionErrorType.NPM_ROOT_FILE_OF_PACKAGE_WITH_REMAPPING_ERRORS;
  npmModule: string;
  installationName: string;
  packageName: string;
  remappingErrors: UserRemappingError[];
}

export interface NpmRootFileDoesntExistWithinPackageError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE;
  npmModule: string;
  userRemapping?: {
    originalUserRemapping: string;
    actualUserRemapping: string;
    remappingSource: "HardhatConfig" | string;
  };
  target: {
    // Only present if the import isn't into a project file
    npmPackage: { name: string; version: string; rootFsPath: string };
    // The file we are trying to import
    subpath: string;
    // The file we were expecting to see in the file system after applying
    // pacakge.exports
    resolvedSubpath?: string;
  };
}

export interface NpmRootFileWithIncorrectCasingError {
  type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING;
  npmModule: string;
  userRemapping?: {
    originalUserRemapping: string;
    actualUserRemapping: string;
    remappingSource: "HardhatConfig" | string;
  };
  target: {
    // Only present if the import isn't into a project file
    npmPackage: { name: string; version: string; rootFsPath: string };
    // The file we are trying to import
    subpath: string;
    // The file we were expecting to see in the file system after applying
    // pacakge.exports
    resolvedSubpath?: string;
  };
  correctCasing: string;
}

export type ProjectRootResolutionError =
  | ProjectRootFileNotInProjectError
  | ProjectRootFileDoesntExistError;

export type NpmRootResolutionError =
  | NpmRootFileNameWithInvalidFormatError
  | NpmRootFileClashesWithProjectFileError
  | NpmRootFileResolvesToProjectFileError
  | NpmRootFileOfUninstalledPackageError
  | NpmRootFileOfPackageWithRemappingErrors
  | NpmRootFileDoesntExistWithinPackageError
  | NpmRootFileWithIncorrectCasingError;

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

export interface ImportDoesntExistError {
  type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST;
  fromFsPath: string;
  importPath: string;
  userRemapping?: {
    originalUserRemapping: string;
    actualUserRemapping: string;
    remappingSource: "HardhatConfig" | string;
  };
  target: {
    // Only present if the import isn't into a project file
    npmPackage?: { name: string; version: string; rootFsPath: string };
    // The file we are trying to import
    subpath: string;
    // The file we were expecting to see in the file system after applying
    // pacakge.exports
    resolvedSubpath?: string;
  };
}

export interface ImportInvalidCasingError {
  type: ImportResolutionErrorType.IMPORT_INVALID_CASING;
  fromFsPath: string;
  importPath: string;
  userRemapping?: {
    originalUserRemapping: string;
    actualUserRemapping: string;
    remappingSource: "HardhatConfig" | string;
  };
  target: {
    // Only present if the import isn't into a project file
    npmPackage?: { name: string; version: string; rootFsPath: string };
    // The file we are trying to import
    subpath: string;
    // The file we were expecting to see in the file system after applying
    // pacakge.exports
    resolvedSubpath?: string;
  };
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
  packageName: string;
}

export interface ImportOfNpmPackageWithRemappingErrorsError {
  type: ImportResolutionErrorType.IMPORT_OF_NPM_PACKAGE_WITH_REMAPPING_ERRORS;
  fromFsPath: string;
  importPath: string;
  installationName: string;
  packageName: string;
  remappingErrors: UserRemappingError[];
}

export type ImportResolutionError =
  | ImportWithWindowsPathSeparatorsError
  | IllegalRelativeImportError
  | ImportDoesntExistError
  | ImportInvalidCasingError
  | ImportWithInvalidNpmSyntaxError
  | ImportOfUninstalledPackageError
  | ImportOfNpmPackageWithRemappingErrorsError;

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
   * A component of the remapping starts with npm/, which is not allowed.
   */
  REMAPPING_WITH_NPM_SYNTAX = "REMAPPING_WITH_NPM_CONTEXT",

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
  // The source of the remapping. Either "HardhatConfig" or the absolute path
  // to the remappings.txt file.
  source: "HardhatConfig" | string;
}
