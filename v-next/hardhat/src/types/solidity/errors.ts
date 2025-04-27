import { ResolvedFile } from "./resolved-file.js";

export enum RootResolutionErrorType {
  /**
   * Trying to resolve a project file as root, but it's not part of the project.
   */
  PROJECT_ROOT_FILE_NOT_IN_PROJECT = "RESOLVED_PROJECT_FILE_NOT_IN_PROJECT",

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
   * Trying to resolve an npm file as root, but it's package is not installed.
   */
  NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE = "NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE",

  /**
   * Trying to resolve an npm file as root, but its module name clashes with a
   * project file, which is ambiguous.
   */
  NPM_ROOT_FILE_NAME_CLASHES_WITH_PROJECT_FILE = "NPM_ROOT_FILE_NAME_CLASHES_WITH_PROJECT_FILE",

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

  // TODO: What about the remapped roots?
}

/**
 * The different types of errors that can happen when resolving a file or import.
 */
export enum ImportResolutionErrorType {
  /**
   * Trying to import a file using windows path separators, instead of /.
   */
  IMPORT_PATH_WITH_WINDOWS_SEPARATOR = "IMPORT_PATH_WITH_WINDOWS_SEPARATOR",

  /**
   * Trying to import a file that doesn't exist.
   */
  IMPORTED_FILE_DOESNT_EXIST = "IMPORTED_FILE_DOESNT_EXIST",

  /**
   * Trying to import a file that exists, but the casing you are using is incorrect.
   */
  IMPORTED_FILE_WITH_INCORRECT_CASING = "IMPORTED_FILE_WITH_INCORRECT_CASING",

  /**
   * Trying to import a file of an npm package that uses package exports, but
   * the file isn't exported.
   */
  IMPORTED_NON_EXISTENT_PACKAGE_EXPORTS_FILE = "IMPORTED_NON_EXISTENT_PACKAGE_EXPORTS_FILE",

  /**
   * Trying to import a file of an npm package that uses package exports, but
   * the casing you are using is incorrect.
   */
  IMPORTED_PACKAGE_EXPORTS_FILE_WITH_INCORRECT_CASING = "IMPORTED_PACKAGE_EXPORTS_FILE_WITH_INCORRECT_CASING",

  /**
   * You are trying to import a file from an npm package, but the package is
   * not installed.
   */
  IMPORTED_NPM_DEPENDENCY_NOT_INSTALLED = "IMPORTED_NPM_DEPENDENCY_NOT_INSTALLED",

  /**
   * You are importing a file from an npm package, and the package has
   * remappings that are not valid.
   */
  IMPORTED_NPM_DEPENDENCY_WITH_INVALID_REMAPPINGS = "IMPORTED_NPM_DEPENDENCY_WITH_INVALID_REMAPPINGS",

  /**
   * Trying to import a file with a relative import path, from an npm package,
   * but the file doesn't belong to the package.
   */
  ILLEGAL_RELATIVE_IMPORT_FROM_NPM_PACKAGE = "ILLEGAL_RELATIVE_IMPORT_FROM_NPM_PACKAGE",

  /**
   * Trying to import a file with a relative import path, from a project file,
   * but the file doesn't belong to the project.
   */
  ILLEGAL_RELATIVE_IMPORT_FROM_PROJECT_FILE = "ILLEGAL_RELATIVE_IMPORT_FROM_PROJECT_FILE",

  // Trying to import a file, which gets remapped by a user remapping into a
  // project file, but the file doesn't belong to the project.
  ILLEGAL_IMPORT_AFTER_APPLYING_NON_NPM_USER_REMAPPING = "ILLEGAL_IMPORT_AFTER_APPLYING_NON_NPM_USER_REMAPPING",

  // TODO: We probably need the same for npm package imports ^

  /**
   * Trying to import a file from an npm package, but the import path doesn't
   * have a valid npm module format.
   */
  IMPORTED_NPM_FILE_WITH_INVALID_FORMAT = "IMPORTED_NPM_FILE_WITH_INVALID_FORMAT",
}

export interface ImportResolutionError {
  type: ImportResolutionErrorType;
  from: ResolvedFile;
  importPath: string;
  // If the import was affected by a user remapping, this will be present.
  userRemappingInfo?: {
    remapping: string;
    // The source of the remapping. Either "HardhatConfig" or the absolute path
    // to the remappings.txt file.
    source: "HardhatConfig" | string;
    remappedDirectImport: string;
  };
}

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
