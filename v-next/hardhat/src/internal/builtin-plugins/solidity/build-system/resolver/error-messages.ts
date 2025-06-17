import type {
  UserRemappingError,
  UserRemappingReference,
  ImportResolutionError,
  NpmRootResolutionError,
  ProjectRootResolutionError,
} from "../../../../../types/solidity/errors.js";

import { shortenPath } from "@nomicfoundation/hardhat-utils/path";

import {
  ImportResolutionErrorType,
  RootResolutionErrorType,
  UserRemappingErrorType,
} from "../../../../../types/solidity/errors.js";

export function formatProjectRootResolutionError(
  error: ProjectRootResolutionError,
): string {
  switch (error.type) {
    case RootResolutionErrorType.PROJECT_ROOT_FILE_NOT_IN_PROJECT: {
      return `The file is not inside your Hardhat project.`;
    }

    case RootResolutionErrorType.PROJECT_ROOT_FILE_DOESNT_EXIST: {
      return "The file doesn't exist";
    }

    case RootResolutionErrorType.PROJECT_ROOT_FILE_IN_NODE_MODULES: {
      // TODO: This should have a link to the docs.
      return `The file is inside your node_modules directory.

Please read check Hardhat's documentation to learn how to compile npm files.`;
    }
  }
}

export function formatNpmRootResolutionError(
  error: NpmRootResolutionError,
): string {
  switch (error.type) {
    case RootResolutionErrorType.NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT: {
      return "The npm module syntax is invalid";
    }

    case RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE: {
      const message = `The npm module resolves to the local file "${shortenPath(error.resolvedFileFsPath)}".`;

      if (error.userRemapping === undefined) {
        return message;
      }

      return `${message}

Note that the npm module is being remapped by ${formatRemappingReference(error.userRemapping)}.`;
    }

    case RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE: {
      return `The pacakge "${error.installationName}" is not installed.`;
    }

    case RootResolutionErrorType.NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS: {
      return `These remapping errors where found while trying to resolve it:

${formatRemappingErrors(error.remappingErrors)}`;
    }

    case RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE: {
      const message = `The file "${error.packageExportsResolvedSubpath ?? error.subpath}" doesn't exist within the package.`;

      return formatResolutionErrorRemappingsOrPackageExportsNotes({
        message,
        isNpmRootResolutionError: true,
        ...error,
      });
    }

    case RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING: {
      const message = `The file "${error.packageExportsResolvedSubpath ?? error.subpath}" casing is wrong. It should be "${error.correctCasing}".`;

      return formatResolutionErrorRemappingsOrPackageExportsNotes({
        message,
        isNpmRootResolutionError: true,
        ...error,
      });
    }

    case RootResolutionErrorType.NPM_ROOT_FILE_NON_EXPORTED_FILE: {
      const message = `The file "${error.subpath}" is not exported by the package.`;

      return formatResolutionErrorRemappingsOrPackageExportsNotes({
        message,
        isNpmRootResolutionError: true,
        ...error,
      });
    }
  }
}

export function formatImportResolutionError(
  error: ImportResolutionError,
): string {
  switch (error.type) {
    case ImportResolutionErrorType.IMPORT_WITH_WINDOWS_PATH_SEPARATORS: {
      return "The import contains windows path separators. Please use forward slashes instead.";
    }

    case ImportResolutionErrorType.ILLEGAL_RELATIVE_IMPORT: {
      return "The import has too many '../', and trying to leave its package.";
    }

    case ImportResolutionErrorType.RELATIVE_IMPORT_INTO_NODE_MODULES: {
      return `You are trying to import a file from your node_modules directory with its file system path.
      
You should write your the path of your imports into npm modules just as you would do in JavaScript files.`;
    }

    case ImportResolutionErrorType.IMPORT_WITH_INVALID_NPM_SYNTAX: {
      return "You are trying to import an npm file but its syntax is invalid.";
    }

    case ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE: {
      return `The package "${error.installationName}" is not installed.`;
    }

    case ImportResolutionErrorType.IMPORT_WITH_REMAPPING_ERRORS: {
      return `These remapping errors where found while trying to resolve the import:

${formatRemappingErrors(error.remappingErrors)}`;
    }

    case ImportResolutionErrorType.RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING: {
      return `The relative import you are writing gets resolved to "${error.directImport}" which clashes with the remapping ${formatRemappingReference(error.userRemapping)}, and this is not allowed by Hardhat.
      
If you want to use the remapping, write your import as "${error.directImport}" instead.`;
    }

    case ImportResolutionErrorType.DIRECT_IMPORT_TO_LOCAL_FILE: {
      return `You are trying to import a local file with a direct import path instead of a releative one, and this is not allowed by Hardhat.
      
If you still want to be able to do it, try adding this remapping "${error.suggestedRemapping}" to the "remappings.txt" file in the root of your project.`;
    }

    case ImportResolutionErrorType.IMPORT_DOESNT_EXIST: {
      const packageOrProject =
        error.fromFsPath === error.importPath ? "the package" : "the project";

      const message = `The file ${error.packageExportsResolvedSubpath ?? error.subpath} doesn't exist within ${packageOrProject}.`;

      return formatResolutionErrorRemappingsOrPackageExportsNotes({
        message,
        isNpmRootResolutionError: false,
        ...error,
      });
    }

    case ImportResolutionErrorType.IMPORT_INVALID_CASING: {
      const message = `The file "${error.packageExportsResolvedSubpath ?? error.subpath}" casing is wrong. It should be "${error.correctCasing}".`;

      return formatResolutionErrorRemappingsOrPackageExportsNotes({
        message,
        isNpmRootResolutionError: false,
        ...error,
      });
    }

    case ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE: {
      const message = `The file "${error.subpath}" is not exported by the package.`;

      return formatResolutionErrorRemappingsOrPackageExportsNotes({
        message,
        isNpmRootResolutionError: false,
        ...error,
      });
    }
  }
}

function formatRemappingReference(remapping: UserRemappingReference): string {
  return `"${remapping.originalUserRemapping}" from "${shortenPath(remapping.remappingSource)}"`;
}

function formatRemappingErrors(errors: UserRemappingError[]): string {
  return errors
    .map(
      (error) =>
        `  - "${error.remapping}" from "${shortenPath(error.source)}": ${error.type === UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX ? "Invalid syntax." : "The npm package from its target is not installed."}`,
    )
    .join("\n");
}

function formatResolutionErrorRemappingsOrPackageExportsNotes({
  message,
  subpath,
  packageExportsResolvedSubpath,
  userRemapping,
  isNpmRootResolutionError,
}: {
  message: string;
  subpath: string;
  packageExportsResolvedSubpath?: string;
  userRemapping?: UserRemappingReference;
  isNpmRootResolutionError: boolean;
}): string {
  const theThing = isNpmRootResolutionError ? "the npm module" : "the import";

  if (packageExportsResolvedSubpath !== undefined) {
    return `${message}

Note that the file was referred to as "${subpath}" but the package's package.exports redirects it to "${packageExportsResolvedSubpath}".`;
  }

  if (userRemapping !== undefined) {
    return `${message}

Note that ${theThing} is being remapped by ${formatRemappingReference(userRemapping)}.`;
  }

  return message;
}
