import type {
  NpmPackageReference,
  UserRemappingReference,
} from "../../../../../../src/types/solidity/errors.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  formatImportResolutionError,
  formatNpmRootResolutionError,
  formatProjectRootResolutionError,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/error-messages.js";
import {
  ImportResolutionErrorType,
  RootResolutionErrorType,
  UserRemappingErrorType,
} from "../../../../../../src/types/solidity/errors.js";
import { ResolvedFileType } from "../../../../../../src/types/solidity.js";

function joinPathWithPrefix(...segments: string[]): string {
  return "." + path.sep + path.join(...segments);
}

function makeRemapping(
  overrides: Partial<UserRemappingReference> = {},
): UserRemappingReference {
  return {
    originalUserRemapping: overrides.originalUserRemapping ?? "foo=bar",
    actualUserRemapping: overrides.actualUserRemapping ?? "foo=bar",
    remappingSource:
      overrides.remappingSource ?? path.join(process.cwd(), "remappings.txt"),
  };
}

function makeNpmPackage(
  overrides: Partial<NpmPackageReference> = {},
): NpmPackageReference {
  return {
    name: overrides.name ?? "@openzeppelin/contracts",
    version: overrides.version ?? "5.0.0",
    rootFsPath:
      overrides.rootFsPath ??
      path.join(process.cwd(), "node_modules/@openzeppelin/contracts"),
  };
}

describe("Error messages", () => {
  describe("formatProjectRootResolutionError", () => {
    describe("PROJECT_ROOT_FILE_NOT_IN_PROJECT", () => {
      it("Should return a message about the file not being in the project", () => {
        const result = formatProjectRootResolutionError({
          type: RootResolutionErrorType.PROJECT_ROOT_FILE_NOT_IN_PROJECT,
          absoluteFilePath: "/outside/Token.sol",
        });

        assert.equal(result, "The file is not inside your Hardhat project.");
      });
    });

    describe("PROJECT_ROOT_FILE_DOES_NOT_EXIST", () => {
      it("Should return a message about the file not existing", () => {
        const result = formatProjectRootResolutionError({
          type: RootResolutionErrorType.PROJECT_ROOT_FILE_DOES_NOT_EXIST,
          absoluteFilePath: "/missing/Token.sol",
        });

        assert.equal(result, "The file doesn't exist");
      });
    });

    describe("PROJECT_ROOT_FILE_IN_NODE_MODULES", () => {
      it("Should return a message about node_modules and docs reference", () => {
        const result = formatProjectRootResolutionError({
          type: RootResolutionErrorType.PROJECT_ROOT_FILE_IN_NODE_MODULES,
          absoluteFilePath: "/project/node_modules/foo/Bar.sol",
        });

        assert.equal(
          result,
          `The file is inside your node_modules directory.

Please read Hardhat's documentation to learn how to compile npm files.`,
        );
      });
    });
  });

  describe("formatNpmRootResolutionError", () => {
    describe("NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT", () => {
      it("Should return a message about invalid npm module syntax", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT,
          npmModule: "???invalid",
        });

        assert.equal(result, "The npm module syntax is invalid");
      });
    });

    describe("NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE", () => {
      it("Should return the shortened path when there is no user remapping", () => {
        const resolvedPath = path.join(process.cwd(), "contracts", "Token.sol");

        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE,
          npmModule: "contracts/Token.sol",
          resolvedFileFsPath: resolvedPath,
        });

        assert.equal(
          result,
          `The npm module resolves to the local file "${joinPathWithPrefix("contracts", "Token.sol")}".`,
        );
      });

      it("Should include remapping note when userRemapping is defined", () => {
        const resolvedPath = path.join(process.cwd(), "contracts", "Token.sol");
        const remapping = makeRemapping({
          originalUserRemapping: "oz=contracts",
        });

        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE,
          npmModule: "oz/Token.sol",
          resolvedFileFsPath: resolvedPath,
          userRemapping: remapping,
        });

        assert.equal(
          result,
          `The npm module resolves to the local file "${joinPathWithPrefix("contracts", "Token.sol")}".

Note that the npm module is being remapped by "oz=contracts" from "${joinPathWithPrefix("remappings.txt")}".`,
        );
      });
    });

    describe("NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE", () => {
      it("Should return base message when projectHasFoundryToml is undefined", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE,
          npmModule: "missing-pkg/Token.sol",
          installationName: "missing-pkg",
        });

        assert.equal(result, 'The package "missing-pkg" is not installed.');
      });

      it("Should return base message when projectHasFoundryToml is false", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE,
          npmModule: "missing-pkg/Token.sol",
          installationName: "missing-pkg",
          projectHasFoundryToml: false,
        });

        assert.equal(result, 'The package "missing-pkg" is not installed.');
      });

      it("Should include foundry suggestion when projectHasFoundryToml is true", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE,
          npmModule: "missing-pkg/Token.sol",
          installationName: "missing-pkg",
          projectHasFoundryToml: true,
        });

        assert.equal(
          result,
          `The package "missing-pkg" is not installed.

Your project has a foundry.toml, and you may need to install the "@nomicfoundation/hardhat-foundry" plugin.
Learn more about Hardhat's Foundry compatibility here: https://hardhat.org/foundry-compatibility`,
        );
      });
    });

    describe("NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS", () => {
      it("Should format a single REMAPPING_WITH_INVALID_SYNTAX error", () => {
        const source = path.join(process.cwd(), "remappings.txt");

        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS,
          npmModule: "foo/Token.sol",
          remappingErrors: [
            {
              type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
              remapping: "bad-remapping",
              source,
            },
          ],
        });

        assert.equal(
          result,
          `These remapping errors were found while trying to resolve it:

  - "bad-remapping" from "${joinPathWithPrefix("remappings.txt")}": Invalid syntax.`,
        );
      });

      it("Should format a single REMAPPING_TO_UNINSTALLED_PACKAGE error", () => {
        const source = path.join(process.cwd(), "remappings.txt");

        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS,
          npmModule: "foo/Token.sol",
          remappingErrors: [
            {
              type: UserRemappingErrorType.REMAPPING_TO_UNINSTALLED_PACKAGE,
              remapping: "foo=uninstalled-pkg",
              source,
            },
          ],
        });

        assert.equal(
          result,
          `These remapping errors were found while trying to resolve it:

  - "foo=uninstalled-pkg" from "${joinPathWithPrefix("remappings.txt")}": The npm package from its target is not installed.`,
        );
      });

      it("Should format multiple errors with '  - ' prefix each", () => {
        const source = path.join(process.cwd(), "remappings.txt");

        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS,
          npmModule: "foo/Token.sol",
          remappingErrors: [
            {
              type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
              remapping: "bad-syntax",
              source,
            },
            {
              type: UserRemappingErrorType.REMAPPING_TO_UNINSTALLED_PACKAGE,
              remapping: "foo=missing",
              source,
            },
          ],
        });

        assert.equal(
          result,
          `These remapping errors were found while trying to resolve it:

  - "bad-syntax" from "${joinPathWithPrefix("remappings.txt")}": Invalid syntax.
  - "foo=missing" from "${joinPathWithPrefix("remappings.txt")}": The npm package from its target is not installed.`,
        );
      });
    });

    describe("NPM_ROOT_FILE_DOES_NOT_EXIST_WITHIN_ITS_PACKAGE", () => {
      it("Should use packageExportsResolvedSubpath and add exports note when present", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_DOES_NOT_EXIST_WITHIN_ITS_PACKAGE,
          npmModule: "@oz/contracts/Token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "Token.sol",
          packageExportsResolvedSubpath: "src/Token.sol",
        });

        assert.equal(
          result,
          `The file "src/Token.sol" doesn't exist within the package.

Note that the file was referred to as "Token.sol" but the package's package.exports redirects it to "src/Token.sol".`,
        );
      });

      it("Should include remapping note when userRemapping is defined and no exports", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_DOES_NOT_EXIST_WITHIN_ITS_PACKAGE,
          npmModule: "@oz/contracts/Token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "Token.sol",
          userRemapping: makeRemapping(),
        });

        assert.equal(
          result,
          `The file "Token.sol" doesn't exist within the package.

Note that the npm module is being remapped by "foo=bar" from "${joinPathWithPrefix("remappings.txt")}".`,
        );
      });

      it("Should return plain message when no exports and no remapping", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_DOES_NOT_EXIST_WITHIN_ITS_PACKAGE,
          npmModule: "@oz/contracts/Token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "Token.sol",
        });

        assert.equal(
          result,
          'The file "Token.sol" doesn\'t exist within the package.',
        );
      });
    });

    describe("NPM_ROOT_FILE_WITH_INCORRECT_CASING", () => {
      it("Should use packageExportsResolvedSubpath and add exports note when present", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRECT_CASING,
          npmModule: "@oz/contracts/token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "token.sol",
          packageExportsResolvedSubpath: "src/token.sol",
          correctCasing: "src/Token.sol",
        });

        assert.equal(
          result,
          `The file "src/token.sol" casing is wrong. It should be "src/Token.sol".

Note that the file was referred to as "token.sol" but the package's package.exports redirects it to "src/token.sol".`,
        );
      });

      it("Should return plain casing message when no extras", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRECT_CASING,
          npmModule: "@oz/contracts/token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "token.sol",
          correctCasing: "Token.sol",
        });

        assert.equal(
          result,
          'The file "token.sol" casing is wrong. It should be "Token.sol".',
        );
      });
    });

    describe("NPM_ROOT_FILE_NON_EXPORTED_FILE", () => {
      it("Should return a plain non-exported message", () => {
        const result = formatNpmRootResolutionError({
          type: RootResolutionErrorType.NPM_ROOT_FILE_NON_EXPORTED_FILE,
          npmModule: "@oz/contracts/internal.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "internal.sol",
        });

        assert.equal(
          result,
          'The file "internal.sol" is not exported by the package.',
        );
      });
    });
  });

  describe("formatImportResolutionError", () => {
    describe("IMPORT_WITH_WINDOWS_PATH_SEPARATORS", () => {
      it("Should return a message about windows path separators", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_WITH_WINDOWS_PATH_SEPARATORS,
          fromFsPath: "/project/A.sol",
          importPath: ".\\B.sol",
        });

        assert.equal(
          result,
          "The import contains windows path separators. Please use forward slashes instead.",
        );
      });
    });

    describe("ILLEGAL_RELATIVE_IMPORT", () => {
      it("Should return a message about too many '../'", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.ILLEGAL_RELATIVE_IMPORT,
          fromFsPath: "/project/A.sol",
          importPath: "../../../../outside.sol",
        });

        assert.equal(
          result,
          "The import has too many '../' and is trying to leave its package.",
        );
      });
    });

    describe("RELATIVE_IMPORT_INTO_NODE_MODULES", () => {
      it("Should return a message about importing node_modules with filesystem path", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.RELATIVE_IMPORT_INTO_NODE_MODULES,
          fromFsPath: "/project/A.sol",
          importPath: "../node_modules/foo/Bar.sol",
        });

        assert.equal(
          result,
          `You are trying to import a file from your node_modules directory with its file system path.

You should write your imports into npm modules just as you would do in JavaScript files.`,
        );
      });
    });

    describe("IMPORT_WITH_INVALID_NPM_SYNTAX", () => {
      it("Should return a message about invalid npm syntax", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_WITH_INVALID_NPM_SYNTAX,
          fromFsPath: "/project/A.sol",
          importPath: "???invalid",
        });

        assert.equal(
          result,
          "You are trying to import an npm file but its syntax is invalid.",
        );
      });
    });

    describe("IMPORT_OF_UNINSTALLED_PACKAGE", () => {
      it("Should return base message when importerPackageHasFoundryToml is undefined", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE,
          fromFsPath: "/project/A.sol",
          importPath: "missing-pkg/Token.sol",
          installationName: "missing-pkg",
        });

        assert.equal(result, 'The package "missing-pkg" is not installed.');
      });

      it("Should return base message when importerPackageHasFoundryToml is false", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE,
          fromFsPath: "/project/A.sol",
          importPath: "missing-pkg/Token.sol",
          installationName: "missing-pkg",
          importerPackageHasFoundryToml: false,
        });

        assert.equal(result, 'The package "missing-pkg" is not installed.');
      });

      it("Should include foundry note when importerPackageHasFoundryToml is true", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE,
          fromFsPath: "/project/A.sol",
          importPath: "missing-pkg/Token.sol",
          installationName: "missing-pkg",
          importerPackageHasFoundryToml: true,
        });

        assert.equal(
          result,
          `The package "missing-pkg" is not installed.

The file importing this package is inside a Foundry project (foundry.toml detected), and you may need to install the "@nomicfoundation/hardhat-foundry" plugin.
Learn more about Hardhat's Foundry compatibility here: https://hardhat.org/foundry-compatibility`,
        );
      });
    });

    describe("IMPORT_WITH_REMAPPING_ERRORS", () => {
      it("Should format multiple remapping errors", () => {
        const source = path.join(process.cwd(), "remappings.txt");

        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_WITH_REMAPPING_ERRORS,
          fromFsPath: "/project/A.sol",
          importPath: "foo/Token.sol",
          remappingErrors: [
            {
              type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
              remapping: "bad-syntax",
              source,
            },
            {
              type: UserRemappingErrorType.REMAPPING_TO_UNINSTALLED_PACKAGE,
              remapping: "foo=missing",
              source,
            },
          ],
        });

        assert.equal(
          result,
          `These remapping errors were found while trying to resolve the import:

  - "bad-syntax" from "${joinPathWithPrefix("remappings.txt")}": Invalid syntax.
  - "foo=missing" from "${joinPathWithPrefix("remappings.txt")}": The npm package from its target is not installed.`,
        );
      });
    });

    describe("RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING", () => {
      it("Should include the direct import and remapping reference", () => {
        const remapping = makeRemapping({
          originalUserRemapping: "contracts/=src/",
        });

        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING,
          fromFsPath: "/project/A.sol",
          importPath: "./contracts/Token.sol",
          directImport: "contracts/Token.sol",
          userRemapping: remapping,
        });

        assert.equal(
          result,
          `The relative import you are writing gets resolved to "contracts/Token.sol" which clashes with the remapping "contracts/=src/" from "${joinPathWithPrefix("remappings.txt")}", and this is not allowed by Hardhat.

If you want to use the remapping, write your import as "contracts/Token.sol" instead.`,
        );
      });
    });

    describe("DIRECT_IMPORT_TO_LOCAL_FILE", () => {
      it("Should include suggested remapping and remappings.txt", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.DIRECT_IMPORT_TO_LOCAL_FILE,
          fromFsPath: "/project/A.sol",
          importPath: "contracts/Token.sol",
          suggestedRemapping: "contracts/=contracts/",
        });

        assert.equal(
          result,
          `You are trying to import a local file with a direct import path instead of a relative one, and this is not allowed by Hardhat.

If you still want to be able to do it, try adding this remapping "contracts/=contracts/" to the "remappings.txt" file in the root of your project.`,
        );
      });
    });

    describe("IMPORT_DOES_NOT_EXIST", () => {
      it("Should say 'the package' for NPM_PACKAGE_FILE with no extras", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_DOES_NOT_EXIST,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/Missing.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "Missing.sol",
        });

        assert.equal(
          result,
          `The file "Missing.sol" doesn't exist within the package.`,
        );
      });

      it("Should say 'the project' for PROJECT_FILE with no extras", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_DOES_NOT_EXIST,
          fromFsPath: "/project/A.sol",
          importPath: "./Missing.sol",
          resolvedFileType: ResolvedFileType.PROJECT_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "Missing.sol",
        });

        assert.equal(
          result,
          `The file "Missing.sol" doesn't exist within the project.`,
        );
      });

      it("Should include exports redirection note when packageExportsResolvedSubpath is present", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_DOES_NOT_EXIST,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/Token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "Token.sol",
          packageExportsResolvedSubpath: "src/Token.sol",
        });

        assert.equal(
          result,
          `The file "src/Token.sol" doesn't exist within the package.

Note that the file was referred to as "Token.sol" but the package's package.exports redirects it to "src/Token.sol".`,
        );
      });

      it("Should include remapping note with 'the import' when userRemapping is defined", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_DOES_NOT_EXIST,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/Token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "Token.sol",
          userRemapping: makeRemapping(),
        });

        assert.equal(
          result,
          `The file "Token.sol" doesn't exist within the package.

Note that the import is being remapped by "foo=bar" from "${joinPathWithPrefix("remappings.txt")}".`,
        );
      });
    });

    describe("IMPORT_INVALID_CASING", () => {
      it("Should return plain casing message with no extras", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "token.sol",
          correctCasing: "Token.sol",
        });

        assert.equal(
          result,
          'The file "token.sol" casing is wrong. It should be "Token.sol".',
        );
      });

      it("Should include exports note when packageExportsResolvedSubpath is present", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "token.sol",
          packageExportsResolvedSubpath: "src/token.sol",
          correctCasing: "src/Token.sol",
        });

        assert.equal(
          result,
          `The file "src/token.sol" casing is wrong. It should be "src/Token.sol".

Note that the file was referred to as "token.sol" but the package's package.exports redirects it to "src/token.sol".`,
        );
      });

      it("Should include remapping note with 'the import' when userRemapping is defined", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/token.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "token.sol",
          correctCasing: "Token.sol",
          userRemapping: makeRemapping(),
        });

        assert.equal(
          result,
          `The file "token.sol" casing is wrong. It should be "Token.sol".

Note that the import is being remapped by "foo=bar" from "${joinPathWithPrefix("remappings.txt")}".`,
        );
      });
    });

    describe("IMPORT_OF_NON_EXPORTED_NPM_FILE", () => {
      it("Should return plain non-exported message with no extras", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/internal.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "internal.sol",
        });

        assert.equal(
          result,
          'The file "internal.sol" is not exported by the package.',
        );
      });

      it("Should include exports note when packageExportsResolvedSubpath is present", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/internal.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "internal.sol",
          packageExportsResolvedSubpath: "src/internal.sol",
        });

        assert.equal(
          result,
          `The file "internal.sol" is not exported by the package.

Note that the file was referred to as "internal.sol" but the package's package.exports redirects it to "src/internal.sol".`,
        );
      });

      it("Should include remapping note with 'the import' when userRemapping is defined", () => {
        const result = formatImportResolutionError({
          type: ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE,
          fromFsPath: "/project/A.sol",
          importPath: "@oz/contracts/internal.sol",
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          npmPackage: makeNpmPackage(),
          subpath: "internal.sol",
          userRemapping: makeRemapping(),
        });

        assert.equal(
          result,
          `The file "internal.sol" is not exported by the package.

Note that the import is being remapped by "foo=bar" from "${joinPathWithPrefix("remappings.txt")}".`,
        );
      });
    });
  });
});
