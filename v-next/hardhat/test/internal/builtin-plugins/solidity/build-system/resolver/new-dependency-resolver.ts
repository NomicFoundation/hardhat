import type {
  ImportResolutionError,
  NpmRootResolutionError,
  ProjectRootResolutionError,
} from "../../../../../../src/types/solidity/errors.js";
import type {
  ProjectResolvedFile,
  ResolvedFile,
} from "../../../../../../src/types/solidity/resolved-file.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import { NewResolverImplementation } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/new-dependency-resolver.js";
import {
  type NewResolver,
  type Result,
  UserRemappingType,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/types.js";
import {
  ImportResolutionErrorType,
  RootResolutionErrorType,
  UserRemappingErrorType,
} from "../../../../../../src/types/solidity/errors.js";
import { ResolvedFileType } from "../../../../../../src/types/solidity/resolved-file.js";

import { useTestProjectTemplate, type TestProjectTemplate } from "./helpers.js";

// Note: this tests don't re-test all the npm resolution rules and how they
// relate to remappings. For those tests see `./remapped-npm-packages-map.ts`.

describe("Dependency resolver", () => {
  describe("Project root files resolution", () => {
    const projectTemplate: TestProjectTemplate = {
      name: "project-root-files-resolution",
      version: "1.0.0",
      files: {
        "contracts/A.sol": `A`,
        "contracts/B.sol": `B`,
        "contracts/C.sol": `C`,
      },
    };

    it("Should error if the file isn't inside the project", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const absoluteFilePath = path.join(path.dirname(project.path), "A.sol");
      const expectedError: ProjectRootResolutionError = {
        type: RootResolutionErrorType.PROJECT_ROOT_FILE_NOT_IN_PROJECT,
        absoluteFilePath,
      };

      assert.deepEqual(await resolver.resolveProjectFile(absoluteFilePath), {
        success: false,
        error: expectedError,
      });
    });

    it("Should error if the file doesn't exist", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const absoluteFilePath = path.join(project.path, "A.sol");
      const expectedError: ProjectRootResolutionError = {
        type: RootResolutionErrorType.PROJECT_ROOT_FILE_DOESNT_EXIST,
        absoluteFilePath,
      };

      assert.deepEqual(await resolver.resolveProjectFile(absoluteFilePath), {
        success: false,
        error: expectedError,
      });
    });

    it("Should error if it's a node_modules file", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const absoluteFilePath = path.join(
        project.path,
        "node_modules/foo/A.sol",
      );

      const expectedError: ProjectRootResolutionError = {
        type: RootResolutionErrorType.PROJECT_ROOT_FILE_IN_NODE_MODULES,
        absoluteFilePath,
      };

      assert.deepEqual(await resolver.resolveProjectFile(absoluteFilePath), {
        success: false,
        error: expectedError,
      });
    });

    it("Should resolve a local file correctly", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const absoluteFilePath = path.join(project.path, "contracts/A.sol");
      const result = await resolver.resolveProjectFile(absoluteFilePath);
      const expectedResult: Result<
        ProjectResolvedFile,
        ProjectRootResolutionError
      > = {
        success: true,
        value: {
          type: ResolvedFileType.PROJECT_FILE,
          fsPath: absoluteFilePath,
          content: {
            text: `A`,
            importPaths: [],
            versionPragmas: [],
          },
          sourceName: "project/contracts/A.sol",
          package: {
            name: "project-root-files-resolution",
            version: "1.0.0",
            rootFsPath: project.path,
            rootSourceName: "project",
            exports: undefined,
          },
        },
      };

      assert.deepEqual(result, expectedResult);
    });

    it("Should resolve a local file correctly, even with incorrect casing", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const result = await resolver.resolveProjectFile(
        path.join(project.path, "contRacts/a.Sol"),
      );
      const expectedResult: Result<
        ProjectResolvedFile,
        ProjectRootResolutionError
      > = {
        success: true,
        value: {
          type: ResolvedFileType.PROJECT_FILE,
          fsPath: path.join(project.path, "contracts/A.sol"),
          content: {
            text: `A`,
            importPaths: [],
            versionPragmas: [],
          },
          sourceName: "project/contracts/A.sol",
          package: {
            name: "project-root-files-resolution",
            version: "1.0.0",
            rootFsPath: project.path,
            rootSourceName: "project",
            exports: undefined,
          },
        },
      };

      assert.deepEqual(result, expectedResult);
    });

    it("Should cache resolved files", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const absoluteFilePath = path.join(project.path, "contracts/A.sol");
      const result1 = await resolver.resolveProjectFile(absoluteFilePath);
      const result2 = await resolver.resolveProjectFile(absoluteFilePath);

      assert.ok(result1.success, "Result 1 should be successful");
      assert.ok(result2.success, "Result 2 should be successful");

      assert.equal(result1.value, result2.value);
    });

    it("Should cache resolved files, even with incorrect casing", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const result1 = await resolver.resolveProjectFile(
        path.join(project.path, "contracts/A.sol"),
      );
      const result2 = await resolver.resolveProjectFile(
        path.join(project.path, "contractS/a.sOl"),
      );

      assert.ok(result1.success, "Result 1 should be successful");
      assert.ok(result2.success, "Result 2 should be successful");

      assert.equal(result1.value, result2.value);
    });

    it("Should cache resolved files, even with incorrect casing, starting with incorrect casing", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const result1 = await resolver.resolveProjectFile(
        path.join(project.path, "contractS/a.sOl"),
      );
      const result2 = await resolver.resolveProjectFile(
        path.join(project.path, "contracts/A.sol"),
      );

      assert.ok(result1.success, "Result 1 should be successful");
      assert.ok(result2.success, "Result 2 should be successful");

      assert.equal(result1.value, result2.value);
    });
  });

  describe("Npm root files resolution", () => {
    const template: TestProjectTemplate = {
      name: "invalid-format-npm-root",
      version: "1.0.0",
      files: {
        "remappings.txt": `foo/=node_modules/dep/contracts/
bar/=node_modules/not-installed/
local/=src/
other-exports/=node_modules/exports/other/`,
        "src/Local.sol": `Local`,
      },
      dependencies: {
        dep: {
          name: "dep",
          version: "1.2.3",
          files: {
            "contracts/A.sol": `A`,
          },
        },
        "not-exported": {
          name: "not-exported",
          version: "1.2.3",
          files: {
            "src/G.sol": `G`,
          },
          exports: {},
        },
        exports: {
          name: "exports",
          version: "1.2.4",
          files: {
            "src/H.sol": `H`,
            "other/I.sol": "I",
          },
          exports: {
            "./*.sol": "./src/*.sol",
          },
        },
      },
    };

    it("Should error if the format is invalid", async () => {
      await using project = await useTestProjectTemplate(template);

      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      async function assertInvalidNpmModuleIdentifierError(npmModule: string) {
        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot(npmModule),
          {
            success: false,
            error: {
              type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT,
              npmModule,
            },
          },
        );
      }

      await assertInvalidNpmModuleIdentifierError("foo\\asd\\a.sol");
      await assertInvalidNpmModuleIdentifierError("./foo.sol");
      await assertInvalidNpmModuleIdentifierError("foo");
      await assertInvalidNpmModuleIdentifierError("foo/");
      await assertInvalidNpmModuleIdentifierError("@foo");
      await assertInvalidNpmModuleIdentifierError("@foo/a/");
      await assertInvalidNpmModuleIdentifierError("-123asd/a/");
    });

    describe("Not affected by user remappings", () => {
      it("Should fail if the package isn't installed", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const npmModule = "not-installed/file.sol";
        const expectedError: NpmRootResolutionError = {
          type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE,
          npmModule,
          installationName: "not-installed",
        };

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot(npmModule),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      describe("Without package.exports", () => {
        it("Should error if the file doesn't exist within the package", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );

          const npmModule = "dep/nope.sol";
          const expectedError: NpmRootResolutionError = {
            type: RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE,
            npmModule,
            npmPackage: {
              name: "dep",
              version: "1.2.3",
              rootFsPath: path.join(project.path, "node_modules/dep"),
            },
            userRemapping: undefined,
            resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
            subpath: "nope.sol",
            packageExportsResolvedSubpath: undefined,
          };

          assert.deepEqual(
            await resolver.resolveNpmDependencyFileAsRoot(npmModule),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should error if the file has a different casing", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );

          const npmModule = "dep/contracts/a.sol";
          const expectedError: NpmRootResolutionError = {
            type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING,
            npmModule,
            npmPackage: {
              name: "dep",
              version: "1.2.3",
              rootFsPath: path.join(project.path, "node_modules/dep"),
            },
            correctCasing: "contracts/A.sol",
            userRemapping: undefined,
            resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
            subpath: "contracts/a.sol",
            packageExportsResolvedSubpath: undefined,
          };

          assert.deepEqual(
            await resolver.resolveNpmDependencyFileAsRoot(npmModule),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should resolve to the correct file", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );

          assert.deepEqual(
            await resolver.resolveNpmDependencyFileAsRoot(
              "dep/contracts/A.sol",
            ),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(
                    project.path,
                    "node_modules/dep/contracts/A.sol",
                  ),
                  content: {
                    text: `A`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/dep@1.2.3/contracts/A.sol",
                  package: {
                    name: "dep",
                    version: "1.2.3",
                    rootFsPath: path.join(project.path, "node_modules/dep"),
                    rootSourceName: "npm/dep@1.2.3",
                    exports: undefined,
                  },
                },
                remapping: undefined,
              },
            },
          );
        });
      });

      describe("With package.exports", () => {
        it("Should fail if the file isn't exported", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );

          const npmModule = "not-exported/src/G.sol";
          const expectedError: NpmRootResolutionError = {
            type: RootResolutionErrorType.NPM_ROOT_FILE_NON_EXPORTED_FILE,
            npmModule,
            npmPackage: {
              name: "not-exported",
              version: "1.2.3",
              rootFsPath: path.join(project.path, "node_modules/not-exported"),
            },
            userRemapping: undefined,
            resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
            subpath: "src/G.sol",
            packageExportsResolvedSubpath: undefined,
          };

          assert.deepEqual(
            await resolver.resolveNpmDependencyFileAsRoot(npmModule),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should fail if the file is exported but doesn't exist", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );

          const npmModule = "exports/nope.sol";
          const expectedError: NpmRootResolutionError = {
            type: RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE,
            npmModule,
            npmPackage: {
              name: "exports",
              version: "1.2.4",
              rootFsPath: path.join(project.path, "node_modules/exports"),
            },
            resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
            subpath: "nope.sol",
            packageExportsResolvedSubpath: "src/nope.sol",
            userRemapping: undefined,
          };

          assert.deepEqual(
            await resolver.resolveNpmDependencyFileAsRoot(npmModule),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should fail if the resolved subpath has a different casing", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );

          const npmModule = "exports/h.sol";
          const expectedError: NpmRootResolutionError = {
            type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING,
            npmModule,
            correctCasing: "src/H.sol",
            npmPackage: {
              name: "exports",
              version: "1.2.4",
              rootFsPath: path.join(project.path, "node_modules/exports"),
            },
            resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
            subpath: "h.sol",
            packageExportsResolvedSubpath: "src/h.sol",
            userRemapping: undefined,
          };

          assert.deepEqual(
            await resolver.resolveNpmDependencyFileAsRoot(npmModule),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should resolve to the correct file", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );

          assert.deepEqual(
            await resolver.resolveNpmDependencyFileAsRoot("exports/H.sol"),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(
                    project.path,
                    "node_modules/exports/src/H.sol",
                  ),
                  content: {
                    text: `H`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/exports@1.2.4/src/H.sol",
                  package: {
                    name: "exports",
                    version: "1.2.4",
                    rootFsPath: path.join(project.path, "node_modules/exports"),
                    rootSourceName: "npm/exports@1.2.4",
                    exports: {
                      "./*.sol": "./src/*.sol",
                    },
                  },
                },
                remapping: undefined,
              },
            },
          );
        });
      });
    });

    describe("Affected by user remappings", () => {
      it("Should fail if the package isn't installed", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const npmModule = "bar/file.sol";
        const expectedError: NpmRootResolutionError = {
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS,
          npmModule,
          remappingErrors: [
            {
              type: UserRemappingErrorType.REMAPPING_TO_UNINSTALLED_PACKAGE,
              remapping: "bar/=node_modules/not-installed/",
              source: path.join(project.path, "remappings.txt"),
            },
          ],
        };

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot(npmModule),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      it("Should fail if there are user remappings errors", async () => {
        await using project = await useTestProjectTemplate({
          name: "with-remapping-errors",
          version: "1.0.0",
          files: {
            "src/foo/remappings.txt": `nope
a/=b`,
          },
        });

        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const npmModule = "bar/file.sol";
        const expectedError: NpmRootResolutionError = {
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS,
          npmModule,
          remappingErrors: [
            {
              type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
              remapping: "nope",
              source: path.join(project.path, "src/foo/remappings.txt"),
            },
            {
              type: UserRemappingErrorType.ILLEGAL_REMAPPING_WIHTOUT_SLASH_ENDINGS,
              remapping: "a/=b",
              source: path.join(project.path, "src/foo/remappings.txt"),
            },
          ],
        };

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot(npmModule),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      it("Should fail if the file doesn't exist within the package", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const npmModule = "foo/nope.sol";
        const expectedError: NpmRootResolutionError = {
          type: RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE,
          npmModule,
          npmPackage: {
            name: "dep",
            version: "1.2.3",
            rootFsPath: path.join(project.path, "node_modules/dep"),
          },
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          subpath: "contracts/nope.sol",
          packageExportsResolvedSubpath: undefined,
          userRemapping: {
            originalUserRemapping: "foo/=node_modules/dep/contracts/",
            actualUserRemapping: "project/:foo/=npm/dep@1.2.3/contracts/",
            remappingSource: path.join(project.path, "remappings.txt"),
          },
        };

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot(npmModule),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      it("Should fail if the file has a different casing", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const npmModule = "foo/a.sol";
        const expectedError: NpmRootResolutionError = {
          type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING,
          npmModule,
          correctCasing: "contracts/A.sol",
          npmPackage: {
            name: "dep",
            version: "1.2.3",
            rootFsPath: path.join(project.path, "node_modules/dep"),
          },
          resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
          subpath: "contracts/a.sol",
          packageExportsResolvedSubpath: undefined,
          userRemapping: {
            originalUserRemapping: "foo/=node_modules/dep/contracts/",
            actualUserRemapping: "project/:foo/=npm/dep@1.2.3/contracts/",
            remappingSource: path.join(project.path, "remappings.txt"),
          },
        };

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot(npmModule),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      it("Should fail if the user remapping takes a string that looks like an npm module into a project file", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const npmModule = "local/Local.sol";
        const expectedError: NpmRootResolutionError = {
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE,
          npmModule,
          resolvedFileFsPath: path.join(project.path, "src/Local.sol"),
          userRemapping: {
            originalUserRemapping: "local/=src/",
            actualUserRemapping: "project/:local/=project/src/",
            remappingSource: path.join(project.path, "remappings.txt"),
          },
        };

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot(npmModule),
          {
            success: false,
            error: expectedError,
          },
        );

        // If we just use a local direct import
        const npmModule2 = "src/Local.sol";
        const expectedError2: NpmRootResolutionError = {
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE,
          npmModule: npmModule2,
          resolvedFileFsPath: path.join(project.path, "src/Local.sol"),
          userRemapping: undefined,
        };

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot(npmModule2),
          {
            success: false,
            error: expectedError2,
          },
        );
      });

      it("Should resolve to the correct file with the best user remapping", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot("foo/A.sol"),
          {
            success: true,
            value: {
              file: {
                type: ResolvedFileType.NPM_PACKAGE_FILE,
                fsPath: path.join(
                  project.path,
                  "node_modules/dep/contracts/A.sol",
                ),
                content: {
                  text: `A`,
                  importPaths: [],
                  versionPragmas: [],
                },
                sourceName: "npm/dep@1.2.3/contracts/A.sol",
                package: {
                  name: "dep",
                  version: "1.2.3",
                  rootFsPath: path.join(project.path, "node_modules/dep"),
                  rootSourceName: "npm/dep@1.2.3",
                  exports: undefined,
                },
              },
              remapping: {
                context: "project/",
                prefix: "foo/",
                target: "npm/dep@1.2.3/contracts/",
                originalFormat: `foo/=node_modules/dep/contracts/`,
                source: path.join(project.path, "remappings.txt"),
                type: UserRemappingType.NPM,
                targetNpmPackage: {
                  installationName: "dep",
                  package: {
                    name: "dep",
                    version: "1.2.3",
                    rootFsPath: path.join(project.path, "node_modules/dep"),
                    rootSourceName: "npm/dep@1.2.3",
                    exports: undefined,
                  },
                },
              },
            },
          },
        );
      });

      it("Should ignore package.exports and use the best user remapping", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        assert.deepEqual(
          await resolver.resolveNpmDependencyFileAsRoot("other-exports/I.sol"),
          {
            success: true,
            value: {
              file: {
                type: ResolvedFileType.NPM_PACKAGE_FILE,
                fsPath: path.join(
                  project.path,
                  "node_modules/exports/other/I.sol",
                ),
                content: {
                  text: `I`,
                  importPaths: [],
                  versionPragmas: [],
                },
                sourceName: "npm/exports@1.2.4/other/I.sol",
                package: {
                  name: "exports",
                  version: "1.2.4",
                  rootFsPath: path.join(project.path, "node_modules/exports"),
                  rootSourceName: "npm/exports@1.2.4",
                  exports: {
                    "./*.sol": "./src/*.sol",
                  },
                },
              },
              remapping: {
                context: "project/",
                prefix: "other-exports/",
                target: "npm/exports@1.2.4/other/",
                originalFormat: `other-exports/=node_modules/exports/other/`,
                source: path.join(project.path, "remappings.txt"),
                type: UserRemappingType.NPM,
                targetNpmPackage: {
                  installationName: "exports",
                  package: {
                    name: "exports",
                    version: "1.2.4",
                    rootFsPath: path.join(project.path, "node_modules/exports"),
                    rootSourceName: "npm/exports@1.2.4",
                    exports: {
                      "./*.sol": "./src/*.sol",
                    },
                  },
                },
              },
            },
          },
        );
      });
    });
  });

  describe("Import resolution", () => {
    // This tempalte is used in the majority of the tests in this `describe`
    const template: TestProjectTemplate = {
      name: "import-resolution",
      version: "1.0.0",
      files: {
        "contracts/A.sol": `A`,
        "contracts/foo/B.sol": `B`,
        "contracts/C.sol": `C`,
      },
      dependencies: {
        dup: {
          name: "dup",
          version: "2.0.0",
          files: {
            "duped.sol": `duped`,
          },
        },
        dep: {
          name: "dep",
          version: "1.2.4",
          files: {
            "src/D.sol": `D`,
            "in-root.sol": `in-root`,
          },
          dependencies: {
            transitive: {
              name: "transitive",
              version: "1.2.5",
              files: {
                "src/E.sol": `E`,
              },
            },
            "dup-with-other-name": {
              name: "dup",
              version: "2.0.0",
              files: {
                "duped.sol": `duped`,
              },
            },
          },
        },
        "with-package-exports": {
          name: "with-package-exports",
          version: "1.2.6",
          files: {
            "src/F.sol": `F`,
            "same.sol": `same`,
          },
          exports: {
            "./same.sol": "./same.sol",
            "./*.sol": "./src/*.sol",
          },
        },
        "not-exported": {
          name: "not-exported",
          version: "1.2.7",
          files: {
            "src/G.sol": `G`,
          },
          exports: {},
        },
      },
    };

    it("Should error if windows path separators are used", async () => {
      await using project = await useTestProjectTemplate(template);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const absoluteFilePath = path.join(project.path, "contracts/A.sol");
      const result = await resolver.resolveProjectFile(absoluteFilePath);
      assert.ok(result.success, "Result should be successful");

      assert.deepEqual(await resolver.resolveImport(result.value, ".\\B"), {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_WITH_WINDOWS_PATH_SEPARATORS,
          fromFsPath: absoluteFilePath,
          importPath: ".\\B",
        },
      });
    });

    it("Should error if the package includes remapping files with errors", async () => {
      await using project = await useTestProjectTemplate({
        name: "with-remapping-errors",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `A`,
          "remappings.txt": `nope`,
        },
      });

      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const absoluteFilePath = path.join(project.path, "contracts/A.sol");
      const result = await resolver.resolveProjectFile(absoluteFilePath);
      assert.ok(result.success, "Result should be successful");

      const importPath = "B";
      assert.deepEqual(await resolver.resolveImport(result.value, importPath), {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_WITH_REMAPPING_ERRORS,
          fromFsPath: absoluteFilePath,
          importPath,
          remappingErrors: [
            {
              type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
              source: path.join(project.path, "remappings.txt"),
              remapping: "nope",
            },
          ],
        },
      });
    });

    describe("Relative imports", () => {
      it("Should error if a relative import matches a user remapping", async () => {
        const templateWithClashes: TestProjectTemplate = {
          name: "relative-import-clashes-with-user-remapping",
          version: "1.0.0",
          files: {
            "a/A.sol": `A`,
            "a/A2.sol": `A2`,
            "b/B.sol": `B`,
            "remappings.txt": `project/a/=b/`,
          },
        };

        await using project = await useTestProjectTemplate(templateWithClashes);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const absoluteFilePath = path.join(project.path, "a/A.sol");
        const result = await resolver.resolveProjectFile(absoluteFilePath);
        assert.ok(result.success, "Result should be successful");

        const importPath = "./A2.sol";
        const expectedError: ImportResolutionError = {
          type: ImportResolutionErrorType.RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING,
          fromFsPath: absoluteFilePath,
          importPath,
          userRemapping: {
            actualUserRemapping: "project/:project/a/=project/b/",
            originalUserRemapping: "project/a/=b/",
            remappingSource: path.join(project.path, "remappings.txt"),
          },
        };

        assert.deepEqual(
          await resolver.resolveImport(result.value, importPath),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      it("Should error if the file doesn't exist", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );
        const absoluteFilePath = path.join(project.path, "contracts/A.sol");
        const result = await resolver.resolveProjectFile(absoluteFilePath);
        assert.ok(result.success, "Result should be successful");

        const importPath = "./nope.sol";
        const expectedError: ImportResolutionError = {
          type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
          fromFsPath: absoluteFilePath,
          importPath,
          npmPackage: {
            name: result.value.package.name,
            version: result.value.package.version,
            rootFsPath: result.value.package.rootFsPath,
          },
          resolvedFileType: ResolvedFileType.PROJECT_FILE,
          subpath: "contracts/nope.sol",
          packageExportsResolvedSubpath: undefined,
          userRemapping: undefined,
        };

        assert.deepEqual(
          await resolver.resolveImport(result.value, importPath),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      it("Should error if the file has an incorrect casing", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );
        const absoluteFilePath = path.join(project.path, "contracts/A.sol");
        const result = await resolver.resolveProjectFile(absoluteFilePath);
        assert.ok(result.success, "Result should be successful");

        const importPath = "./FOO/B.sol";
        const expectedError: ImportResolutionError = {
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: absoluteFilePath,
          importPath,
          correctCasing: "contracts/foo/B.sol",
          npmPackage: {
            name: result.value.package.name,
            version: result.value.package.version,
            rootFsPath: result.value.package.rootFsPath,
          },
          resolvedFileType: ResolvedFileType.PROJECT_FILE,
          subpath: "contracts/FOO/B.sol",
          packageExportsResolvedSubpath: undefined,
          userRemapping: undefined,
        };

        assert.deepEqual(
          await resolver.resolveImport(result.value, importPath),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      it("Should error if trying to import an npm file with a relative path", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );
        const absoluteFilePath = path.join(project.path, "contracts/A.sol");
        const result = await resolver.resolveProjectFile(absoluteFilePath);
        assert.ok(result.success, "Result should be successful");

        const importPath = "../node_modules/dep/src/D.sol";
        const expectedError: ImportResolutionError = {
          type: ImportResolutionErrorType.RELATIVE_IMPORT_INTO_NODE_MODULES,
          fromFsPath: absoluteFilePath,
          importPath,
        };

        assert.deepEqual(
          await resolver.resolveImport(result.value, importPath),
          {
            success: false,
            error: expectedError,
          },
        );
      });

      it("Resolving roots and imports should return the same instance of each file, even when importing in different ways", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const absoluteFilePath = path.join(project.path, "contracts/A.sol");
        const resultA = await resolver.resolveProjectFile(absoluteFilePath);
        assert.ok(resultA.success, "Result should be successful");

        const resultAImported = await resolver.resolveImport(
          resultA.value,
          "./A.sol",
        );

        assert.ok(resultAImported.success, "Result should be successful");

        const resultAImported2 = await resolver.resolveImport(
          resultA.value,
          "../contracts/A.sol",
        );

        assert.ok(resultAImported2.success, "Result should be successful");

        assert.equal(resultA.value, resultAImported.value.file);
        assert.equal(resultA.value, resultAImported2.value.file);

        const resultCImported = await resolver.resolveImport(
          resultA.value,
          "./C.sol",
        );
        assert.ok(resultCImported.success, "Result should be successful");

        const resultC = await resolver.resolveProjectFile(
          path.join(project.path, "contracts/C.sol"),
        );
        assert.ok(resultC.success, "Result should be successful");

        assert.equal(resultC.value, resultCImported.value.file);
      });

      describe("From a local file", () => {
        it("Should error on imports that get out of the project", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "../../foo.sol";
          const expectedError: ImportResolutionError = {
            type: ImportResolutionErrorType.ILLEGAL_RELATIVE_IMPORT,
            fromFsPath: absoluteFilePath,
            importPath,
          };

          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should resolve to the correct file", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(result.value, "./C.sol"),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.PROJECT_FILE,
                  fsPath: path.join(project.path, "contracts/C.sol"),
                  content: {
                    text: `C`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "project/contracts/C.sol",
                  package: result.value.package,
                },
                remapping: undefined,
              },
            },
          );
        });
      });

      describe("From an npm package", () => {
        it("Should error on imports that get out of the package", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const depFileResult = await resolver.resolveImport(
            result.value,
            "dep/src/D.sol",
          );
          assert.ok(depFileResult.success, "Result should be successful");

          const importPath = "../../foo.sol";
          const expectedError: ImportResolutionError = {
            type: ImportResolutionErrorType.ILLEGAL_RELATIVE_IMPORT,
            fromFsPath: depFileResult.value.file.fsPath,
            importPath,
          };

          assert.deepEqual(
            await resolver.resolveImport(depFileResult.value.file, importPath),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should resolve to the correct file", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const depFileResult = await resolver.resolveImport(
            result.value,
            "dep/src/D.sol",
          );
          assert.ok(depFileResult.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(
              depFileResult.value.file,
              "../in-root.sol",
            ),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(
                    depFileResult.value.file.package.rootFsPath,
                    "in-root.sol",
                  ),
                  content: {
                    text: `in-root`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/dep@1.2.4/in-root.sol",
                  package: depFileResult.value.file.package,
                },
                remapping: undefined,
              },
            },
          );
        });
      });
    });

    describe("User remapped imports", () => {
      describe("Into a local file", () => {
        it("Should fail if the file doesn't exist within the package", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "remapped-to-missing-file",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "bar/B.sol": `B`,
              "remappings.txt": `foo/=bar/`,
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "foo/C.sol";
          const expectedError: ImportResolutionError = {
            type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
            fromFsPath: absoluteFilePath,
            importPath,
            npmPackage: {
              name: result.value.package.name,
              version: result.value.package.version,
              rootFsPath: result.value.package.rootFsPath,
            },
            resolvedFileType: ResolvedFileType.PROJECT_FILE,
            subpath: "bar/C.sol",
            packageExportsResolvedSubpath: undefined,
            userRemapping: {
              originalUserRemapping: "foo/=bar/",
              actualUserRemapping: "project/:foo/=project/bar/",
              remappingSource: path.join(project.path, "remappings.txt"),
            },
          };

          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should fail if the file has a different casing", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "remapped-to-missing-file",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "bar/B.sol": `B`,
              "remappings.txt": `foo/=bar/`,
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "foo/b.sol";
          const expectedError: ImportResolutionError = {
            type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
            fromFsPath: absoluteFilePath,
            correctCasing: "bar/B.sol",
            importPath,
            npmPackage: {
              name: result.value.package.name,
              version: result.value.package.version,
              rootFsPath: result.value.package.rootFsPath,
            },
            resolvedFileType: ResolvedFileType.PROJECT_FILE,
            subpath: "bar/b.sol",
            packageExportsResolvedSubpath: undefined,
            userRemapping: {
              originalUserRemapping: "foo/=bar/",
              actualUserRemapping: "project/:foo/=project/bar/",
              remappingSource: path.join(project.path, "remappings.txt"),
            },
          };

          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should resolve to the correct file with the best user remapping", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "remapped-to-missing-file",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "bar/B.sol": `B`,
              "remappings.txt": `foo/=bar/
fo/=barr/`,
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "foo/B.sol";

          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.PROJECT_FILE,
                  fsPath: path.join(project.path, "bar/B.sol"),
                  content: {
                    text: `B`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "project/bar/B.sol",
                  package: result.value.package,
                },
                remapping: {
                  context: "project/",
                  prefix: "foo/",
                  target: "project/bar/",
                  originalFormat: "foo/=bar/",
                  source: path.join(project.path, "remappings.txt"),
                  type: UserRemappingType.LOCAL,
                },
              },
            },
          );
        });
      });

      describe("Into an npm file", () => {
        it("Should fail if the package isn't installed", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "remapped-to-uninstalled-package",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "remappings.txt": `foo/=node_modules/foo/src/`,
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "foo/B.sol";
          const expectedError: ImportResolutionError = {
            type: ImportResolutionErrorType.IMPORT_WITH_REMAPPING_ERRORS,
            fromFsPath: absoluteFilePath,
            importPath,
            remappingErrors: [
              {
                type: UserRemappingErrorType.REMAPPING_TO_UNINSTALLED_PACKAGE,
                remapping: "foo/=node_modules/foo/src/",
                source: path.join(project.path, "remappings.txt"),
              },
            ],
          };

          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should fail if the file doesn't exist within the package", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "remapped-to-missing-file",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "remappings.txt": `foo/=node_modules/foo/src/`,
            },
            dependencies: {
              foo: {
                name: "foo",
                version: "1.2.3",
                files: {
                  "src/B.sol": `B`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "foo/C.sol";
          const expectedError: ImportResolutionError = {
            type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
            fromFsPath: absoluteFilePath,
            importPath,
            npmPackage: {
              name: "foo",
              version: "1.2.3",
              rootFsPath: path.join(project.path, "node_modules/foo"),
            },
            resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
            subpath: "src/C.sol",
            packageExportsResolvedSubpath: undefined,
            userRemapping: {
              originalUserRemapping: "foo/=node_modules/foo/src/",
              actualUserRemapping: "project/:foo/=npm/foo@1.2.3/src/",
              remappingSource: path.join(project.path, "remappings.txt"),
            },
          };

          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should fail if the file has a different casing", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "remapped-to-missing-file",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "remappings.txt": `foo/=node_modules/foo/src/`,
            },
            dependencies: {
              foo: {
                name: "foo",
                version: "1.2.3",
                files: {
                  "src/B.sol": `B`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "foo/b.sol";
          const expectedError: ImportResolutionError = {
            type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
            fromFsPath: absoluteFilePath,
            importPath,
            correctCasing: "src/B.sol",
            npmPackage: {
              name: "foo",
              version: "1.2.3",
              rootFsPath: path.join(project.path, "node_modules/foo"),
            },
            resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
            subpath: "src/b.sol",
            packageExportsResolvedSubpath: undefined,
            userRemapping: {
              originalUserRemapping: "foo/=node_modules/foo/src/",
              actualUserRemapping: "project/:foo/=npm/foo@1.2.3/src/",
              remappingSource: path.join(project.path, "remappings.txt"),
            },
          };

          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: expectedError,
            },
          );
        });

        it("Should resolve to the correct file with the best user remapping", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "resolve-to-npm-remapped-file",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "remappings.txt": `foo/=node_modules/foo/src/`,
            },
            dependencies: {
              foo: {
                name: "foo",
                version: "1.2.3",
                files: {
                  "src/B.sol": `B`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(result.value, "foo/B.sol"),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(project.path, "node_modules/foo/src/B.sol"),
                  content: {
                    text: `B`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/foo@1.2.3/src/B.sol",
                  package: {
                    name: "foo",
                    version: "1.2.3",
                    rootFsPath: path.join(project.path, "node_modules/foo"),
                    rootSourceName: "npm/foo@1.2.3",
                    exports: undefined,
                  },
                },
                remapping: {
                  context: "project/",
                  prefix: "foo/",
                  target: "npm/foo@1.2.3/src/",
                  originalFormat: `foo/=node_modules/foo/src/`,
                  source: path.join(project.path, "remappings.txt"),
                  type: UserRemappingType.NPM,
                  targetNpmPackage: {
                    installationName: "foo",
                    package: {
                      name: "foo",
                      version: "1.2.3",
                      rootFsPath: path.join(project.path, "node_modules/foo"),
                      rootSourceName: "npm/foo@1.2.3",
                      exports: undefined,
                    },
                  },
                },
              },
            },
          );
        });

        it("Should ignore package.exports and use the best user remapping", async () => {
          const templateWithBrokenRemapping: TestProjectTemplate = {
            name: "resolve-to-npm-remapped-file-despite-package-exports",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "remappings.txt": `foo/=node_modules/foo/src/`,
            },
            dependencies: {
              foo: {
                name: "foo",
                version: "1.2.3",
                files: {
                  "src/B.sol": `B`,
                  "srcExported/B.sol": `B`,
                },
                exports: {
                  "./*.sol": "./srcExported/*.sol",
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(
            templateWithBrokenRemapping,
          );
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(result.value, "foo/B.sol"),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(project.path, "node_modules/foo/src/B.sol"),
                  content: {
                    text: `B`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/foo@1.2.3/src/B.sol",
                  package: {
                    name: "foo",
                    version: "1.2.3",
                    rootFsPath: path.join(project.path, "node_modules/foo"),
                    rootSourceName: "npm/foo@1.2.3",
                    exports: {
                      "./*.sol": "./srcExported/*.sol",
                    },
                  },
                },
                remapping: {
                  context: "project/",
                  prefix: "foo/",
                  target: "npm/foo@1.2.3/src/",
                  originalFormat: `foo/=node_modules/foo/src/`,
                  source: path.join(project.path, "remappings.txt"),
                  type: UserRemappingType.NPM,
                  targetNpmPackage: {
                    installationName: "foo",
                    package: {
                      name: "foo",
                      version: "1.2.3",
                      rootFsPath: path.join(project.path, "node_modules/foo"),
                      rootSourceName: "npm/foo@1.2.3",
                      exports: {
                        "./*.sol": "./srcExported/*.sol",
                      },
                    },
                  },
                },
              },
            },
          );
        });
      });

      describe("From an npm file", () => {
        it("Should resolve to a local file using the best user remapping", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "remapped-within-npm-package-using-remapping",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
            },
            dependencies: {
              foo: {
                name: "foo",
                version: "1.2.3",
                files: {
                  "src/B.sol": `B`,
                  "bar/C.sol": `C`,
                  "remappings.txt": `foo/=bar/`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const depFileResult = await resolver.resolveImport(
            result.value,
            "foo/src/B.sol",
          );
          assert.ok(depFileResult.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(depFileResult.value.file, "foo/C.sol"),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(project.path, "node_modules/foo/bar/C.sol"),
                  content: {
                    text: `C`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/foo@1.2.3/bar/C.sol",
                  package: {
                    name: "foo",
                    version: "1.2.3",
                    rootFsPath: path.join(project.path, "node_modules/foo"),
                    rootSourceName: "npm/foo@1.2.3",
                    exports: undefined,
                  },
                },
                remapping: {
                  context:
                    depFileResult.value.file.package.rootSourceName + "/",
                  prefix: "foo/",
                  target: "npm/foo@1.2.3/bar/",
                  originalFormat: `foo/=bar/`,
                  source: path.join(
                    depFileResult.value.file.package.rootFsPath,
                    "remappings.txt",
                  ),
                  type: UserRemappingType.LOCAL,
                },
              },
            },
          );
        });

        it("Should resolve to an npm file using the best user remapping", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "remapped-within-npm-package-using-remapping",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
            },
            dependencies: {
              foo: {
                name: "foo",
                version: "1.2.3",
                files: {
                  "src/B.sol": `B`,
                  "remappings.txt": `d/=node_modules/peer-dep/src/`,
                },
              },
              "peer-dep": {
                name: "peer-dep",
                version: "1.2.4",
                files: {
                  "src/C.sol": `C`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const depFileResult = await resolver.resolveImport(
            result.value,
            "foo/src/B.sol",
          );
          assert.ok(depFileResult.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(depFileResult.value.file, "d/C.sol"),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(
                    project.path,
                    "node_modules/peer-dep/src/C.sol",
                  ),
                  content: {
                    text: `C`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/peer-dep@1.2.4/src/C.sol",
                  package: {
                    name: "peer-dep",
                    version: "1.2.4",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/peer-dep",
                    ),
                    rootSourceName: "npm/peer-dep@1.2.4",
                    exports: undefined,
                  },
                },
                remapping: {
                  context:
                    depFileResult.value.file.package.rootSourceName + "/",
                  prefix: "d/",
                  target: "npm/peer-dep@1.2.4/src/",
                  originalFormat: `d/=node_modules/peer-dep/src/`,
                  source: path.join(
                    depFileResult.value.file.package.rootFsPath,
                    "remappings.txt",
                  ),
                  type: UserRemappingType.NPM,
                  targetNpmPackage: {
                    installationName: "peer-dep",
                    package: {
                      name: "peer-dep",
                      version: "1.2.4",
                      rootFsPath: path.join(
                        project.path,
                        "node_modules/peer-dep",
                      ),
                      rootSourceName: "npm/peer-dep@1.2.4",
                      exports: undefined,
                    },
                  },
                },
              },
            },
          );
        });
      });

      it("Resolving roots and imports should return the same instance of each file, even when importing in different ways", async () => {
        const localTemplate: TestProjectTemplate = {
          name: "cached-remapped-files",
          version: "1.0.0",
          files: {
            "contracts/A.sol": `A`,
            "contracts/B.sol": `B`,
            "contracts/C.sol": `C`,
            "remappings.txt": `foo/=contracts/`,
          },
        };

        await using project = await useTestProjectTemplate(localTemplate);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const resultA = await resolver.resolveProjectFile(
          path.join(project.path, "contracts/A.sol"),
        );
        assert.ok(resultA.success, "Result should be successful");

        const resultAImported = await resolver.resolveImport(
          resultA.value,
          "foo/A.sol",
        );
        assert.ok(resultAImported.success, "Result should be successful");

        const resultBImported = await resolver.resolveImport(
          resultA.value,
          "foo/B.sol",
        );
        assert.ok(resultBImported.success, "Result should be successful");

        const resultB = await resolver.resolveProjectFile(
          path.join(project.path, "contracts/B.sol"),
        );
        assert.ok(resultB.success, "Result should be successful");

        assert.equal(resultA.value, resultAImported.value.file);
        assert.equal(resultB.value, resultBImported.value.file);
      });

      describe("Edge cases", () => {
        it("Should handle seemgly conflicting remappings in different remappings.txt filse", async () => {
          const localTemplate: TestProjectTemplate = {
            name: "seemgly-conflicting-remappings",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `A`,
              "lib/submodule1/src/B.sol": `B`,
              "lib/submodule1/src/C.sol": `C`,
              "lib/submodule1/remappings.txt": `src/=src/`,
              "lib/submodule2/src/D.sol": `D`,
              "lib/submodule2/src/E.sol": `E`,
              "lib/submodule2/remappings.txt": `src/=src/`,
              "remappings.txt": `submodule1/=lib/submodule1/src/
submodule2/=lib/submodule2/src/`,
            },
          };

          await using project = await useTestProjectTemplate(localTemplate);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const resultA = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(resultA.success, "Result should be successful");

          const resultB = await resolver.resolveImport(
            resultA.value,
            "submodule1/B.sol",
          );
          assert.ok(resultB.success, "Result should be successful");
          assert.equal(
            resultB.value.file.sourceName,
            "project/lib/submodule1/src/B.sol",
          );

          const resultC = await resolver.resolveImport(
            resultB.value.file,
            "src/C.sol",
          );
          assert.ok(resultC.success, "Result should be successful");
          assert.equal(
            resultC.value.file.sourceName,
            "project/lib/submodule1/src/C.sol",
          );

          const resultD = await resolver.resolveImport(
            resultA.value,
            "submodule2/D.sol",
          );
          assert.ok(resultD.success, "Result should be successful");
          assert.equal(
            resultD.value.file.sourceName,
            "project/lib/submodule2/src/D.sol",
          );

          const resultE = await resolver.resolveImport(
            resultD.value.file,
            "src/E.sol",
          );
          assert.ok(resultE.success, "Result should be successful");
          assert.equal(
            resultE.value.file.sourceName,
            "project/lib/submodule2/src/E.sol",
          );
        });
      });
    });

    describe("Npm imports", () => {
      it("Should error if the importPath isn't a valid npm module identifier", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );
        const absoluteFilePath = path.join(project.path, "contracts/A.sol");
        const result = await resolver.resolveProjectFile(absoluteFilePath);
        assert.ok(result.success, "Result should be successful");

        async function assertInvalidNpmModuleIdentifierError(
          from: ResolvedFile,
          importPath: string,
        ) {
          assert.deepEqual(await resolver.resolveImport(from, importPath), {
            success: false,
            error: {
              type: ImportResolutionErrorType.IMPORT_WITH_INVALID_NPM_SYNTAX,
              fromFsPath: absoluteFilePath,
              importPath,
            },
          });
        }

        await assertInvalidNpmModuleIdentifierError(result.value, "foo/");
        await assertInvalidNpmModuleIdentifierError(result.value, "@foo/bar");
        await assertInvalidNpmModuleIdentifierError(result.value, "@foo");
        await assertInvalidNpmModuleIdentifierError(result.value, "123@foo");
      });

      it("Should fail if the package isn't installed", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );
        const absoluteFilePath = path.join(project.path, "contracts/A.sol");
        const result = await resolver.resolveProjectFile(absoluteFilePath);
        assert.ok(result.success, "Result should be successful");

        const importPath = "not-installed/foo.sol";
        assert.deepEqual(
          await resolver.resolveImport(result.value, importPath),
          {
            success: false,
            error: {
              type: ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE,
              fromFsPath: absoluteFilePath,
              importPath,
              installationName: "not-installed",
            },
          },
        );
      });

      describe("Without package.exports", () => {
        it("Should fail if the file doesn't exist within the package", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "dep/nope.sol";
          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: {
                type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
                fromFsPath: absoluteFilePath,
                importPath,
                npmPackage: {
                  name: "dep",
                  version: "1.2.4",
                  rootFsPath: path.join(project.path, "node_modules/dep"),
                },
                resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
                subpath: "nope.sol",
                packageExportsResolvedSubpath: undefined,
                userRemapping: undefined,
              },
            },
          );
        });

        it("Should fail if the file has a different casing", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "dep/SRC/D.sol";
          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: {
                type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
                fromFsPath: absoluteFilePath,
                importPath,
                npmPackage: {
                  name: "dep",
                  version: "1.2.4",
                  rootFsPath: path.join(project.path, "node_modules/dep"),
                },
                resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
                subpath: "SRC/D.sol",
                correctCasing: "src/D.sol",
                packageExportsResolvedSubpath: undefined,
                userRemapping: undefined,
              },
            },
          );
        });

        it("Should resolve to the correct file, generating a generic remapping", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const depSrcDResult = await resolver.resolveImport(
            result.value,
            "dep/src/D.sol",
          );

          assert.deepEqual(depSrcDResult, {
            success: true,
            value: {
              file: {
                type: ResolvedFileType.NPM_PACKAGE_FILE,
                fsPath: path.join(project.path, "node_modules/dep/src/D.sol"),
                content: {
                  text: `D`,
                  importPaths: [],
                  versionPragmas: [],
                },
                sourceName: "npm/dep@1.2.4/src/D.sol",
                package: {
                  name: "dep",
                  version: "1.2.4",
                  rootFsPath: path.join(project.path, "node_modules/dep"),
                  rootSourceName: "npm/dep@1.2.4",
                  exports: undefined,
                },
              },
              remapping: {
                context: "project/",
                prefix: "dep/",
                target: "npm/dep@1.2.4/",
              },
            },
          });

          assert.deepEqual(
            await resolver.resolveImport(
              depSrcDResult.value.file,
              "transitive/src/E.sol",
            ),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(
                    project.path,
                    "node_modules/dep/node_modules/transitive/src/E.sol",
                  ),
                  content: {
                    text: `E`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/transitive@1.2.5/src/E.sol",
                  package: {
                    name: "transitive",
                    version: "1.2.5",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/dep/node_modules/transitive",
                    ),
                    rootSourceName: "npm/transitive@1.2.5",
                    exports: undefined,
                  },
                },
                remapping: {
                  context:
                    depSrcDResult.value.file.package.rootSourceName + "/",
                  prefix: "transitive/",
                  target: "npm/transitive@1.2.5/",
                },
              },
            },
          );
        });
      });

      describe("With package.exports", () => {
        it("Should fail if the file is exported but doesn't exist in the file system", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "with-package-exports/nope.sol";
          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: {
                type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
                fromFsPath: absoluteFilePath,
                importPath,
                npmPackage: {
                  name: "with-package-exports",
                  version: "1.2.6",
                  rootFsPath: path.join(
                    project.path,
                    "node_modules/with-package-exports",
                  ),
                },
                resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
                subpath: "nope.sol",
                packageExportsResolvedSubpath: "src/nope.sol",
                userRemapping: undefined,
              },
            },
          );
        });

        it("Should fail if the file isn't exported", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "not-exported/src/G.sol";
          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: {
                type: ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE,
                fromFsPath: absoluteFilePath,
                importPath,
                npmPackage: {
                  name: "not-exported",
                  version: "1.2.7",
                  rootFsPath: path.join(
                    project.path,
                    "node_modules/not-exported",
                  ),
                },
                resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
                subpath: "src/G.sol",
                packageExportsResolvedSubpath: undefined,
                userRemapping: undefined,
              },
            },
          );
        });

        it("Should fail if the resolved subpath has a different casing", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const importPath = "with-package-exports/f.sol";
          assert.deepEqual(
            await resolver.resolveImport(result.value, importPath),
            {
              success: false,
              error: {
                type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
                fromFsPath: absoluteFilePath,
                importPath,
                correctCasing: "src/F.sol",
                npmPackage: {
                  name: "with-package-exports",
                  version: "1.2.6",
                  rootFsPath: path.join(
                    project.path,
                    "node_modules/with-package-exports",
                  ),
                },
                resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
                subpath: "f.sol",
                packageExportsResolvedSubpath: "src/f.sol",
                userRemapping: undefined,
              },
            },
          );
        });

        it("Should resolve to the correct file generating a generic remapping if the resolved subpath is the same as the subpath", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(
              result.value,
              "with-package-exports/same.sol",
            ),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(
                    project.path,
                    "node_modules/with-package-exports/same.sol",
                  ),
                  content: {
                    text: `same`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/with-package-exports@1.2.6/same.sol",
                  package: {
                    name: "with-package-exports",
                    version: "1.2.6",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/with-package-exports",
                    ),
                    rootSourceName: "npm/with-package-exports@1.2.6",
                    exports: {
                      "./same.sol": "./same.sol",
                      "./*.sol": "./src/*.sol",
                    },
                  },
                },
                remapping: {
                  context: "project/",
                  prefix: "with-package-exports/",
                  target: "npm/with-package-exports@1.2.6/",
                },
              },
            },
          );
        });

        it("Should resolve to the correct file generating a single-file remapping if the resolved subpath is different than subpath", async () => {
          await using project = await useTestProjectTemplate(template);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(
              result.value,
              "with-package-exports/F.sol",
            ),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(
                    project.path,
                    "node_modules/with-package-exports/src/F.sol",
                  ),
                  content: {
                    text: `F`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/with-package-exports@1.2.6/src/F.sol",
                  package: {
                    name: "with-package-exports",
                    version: "1.2.6",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/with-package-exports",
                    ),
                    rootSourceName: "npm/with-package-exports@1.2.6",
                    exports: {
                      "./same.sol": "./same.sol",
                      "./*.sol": "./src/*.sol",
                    },
                  },
                },
                remapping: {
                  context: "project/",
                  prefix: "with-package-exports/F.sol",
                  target: "npm/with-package-exports@1.2.6/src/F.sol",
                },
              },
            },
          );
        });
      });

      describe("With simulated package.exports", () => {
        const templateWithForgeStd: TestProjectTemplate = {
          name: "with-forge-std",
          version: "1.0.0",
          files: {
            "contracts/A.sol": `A`,
          },
          dependencies: {
            "forge-std": {
              name: "forge-std",
              version: "1.2.3",
              files: {
                "src/Test.sol": `Test`,
              },
            },
          },
        };

        it("Should simulate package.exports for forge-std", async () => {
          await using project =
            await useTestProjectTemplate(templateWithForgeStd);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          assert.deepEqual(
            await resolver.resolveImport(result.value, "forge-std/Test.sol"),
            {
              success: true,
              value: {
                file: {
                  type: ResolvedFileType.NPM_PACKAGE_FILE,
                  fsPath: path.join(
                    project.path,
                    "node_modules/forge-std/src/Test.sol",
                  ),
                  content: {
                    text: `Test`,
                    importPaths: [],
                    versionPragmas: [],
                  },
                  sourceName: "npm/forge-std@1.2.3/src/Test.sol",
                  package: {
                    name: "forge-std",
                    version: "1.2.3",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/forge-std",
                    ),
                    rootSourceName: "npm/forge-std@1.2.3",
                    exports: undefined,
                  },
                },
                remapping: {
                  context: "project/",
                  prefix: "forge-std/Test.sol",
                  target: "npm/forge-std@1.2.3/src/Test.sol",
                },
              },
            },
          );
        });

        it("Should return the right errors as if it had a package.exports", async () => {
          await using project =
            await useTestProjectTemplate(templateWithForgeStd);
          const resolver = await NewResolverImplementation.create(
            project.path,
            readUtf8File,
          );
          const absoluteFilePath = path.join(project.path, "contracts/A.sol");
          const result = await resolver.resolveProjectFile(absoluteFilePath);
          assert.ok(result.success, "Result should be successful");

          const notExistingImportPath = "forge-std/nope.sol";
          assert.deepEqual(
            await resolver.resolveImport(result.value, notExistingImportPath),
            {
              success: false,
              error: {
                type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
                fromFsPath: absoluteFilePath,
                importPath: notExistingImportPath,
                npmPackage: {
                  name: "forge-std",
                  version: "1.2.3",
                  rootFsPath: path.join(project.path, "node_modules/forge-std"),
                },
                resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
                subpath: "nope.sol",
                packageExportsResolvedSubpath: "src/nope.sol",
                userRemapping: undefined,
              },
            },
          );

          const wrongCasingImportPath = "forge-std/test.sol";
          assert.deepEqual(
            await resolver.resolveImport(result.value, wrongCasingImportPath),
            {
              success: false,
              error: {
                type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
                fromFsPath: absoluteFilePath,
                importPath: wrongCasingImportPath,
                correctCasing: "src/Test.sol",
                npmPackage: {
                  name: "forge-std",
                  version: "1.2.3",
                  rootFsPath: path.join(project.path, "node_modules/forge-std"),
                },
                resolvedFileType: ResolvedFileType.NPM_PACKAGE_FILE,
                subpath: "test.sol",
                packageExportsResolvedSubpath: "src/test.sol",
                userRemapping: undefined,
              },
            },
          );
        });
      });

      it("Resolving roots and imports should return the same instance of each file, even when importing in different ways", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const contractsA = await resolver.resolveProjectFile(
          path.join(project.path, "contracts/A.sol"),
        );
        assert.ok(contractsA.success, "Result should be successful");

        const depSrcD =
          await resolver.resolveNpmDependencyFileAsRoot("dep/src/D.sol");
        assert.ok(depSrcD.success, "Result should be successful");

        const depSrcDFromContractsA = await resolver.resolveImport(
          contractsA.value,
          "dep/src/D.sol",
        );
        assert.ok(depSrcDFromContractsA.success, "Result should be successful");

        assert.equal(depSrcDFromContractsA.value.file, depSrcD.value.file);

        const depInRootFromContractsA = await resolver.resolveImport(
          contractsA.value,
          "dep/in-root.sol",
        );
        assert.ok(
          depInRootFromContractsA.success,
          "Result should be successful",
        );

        const depInRoot =
          await resolver.resolveNpmDependencyFileAsRoot("dep/in-root.sol");
        assert.ok(depInRoot.success, "Result should be successful");

        assert.equal(depInRootFromContractsA.value.file, depInRoot.value.file);
      });

      it("should return a single instance for the same dependency+version+subpath", async () => {
        await using project = await useTestProjectTemplate(template);
        const resolver = await NewResolverImplementation.create(
          project.path,
          readUtf8File,
        );

        const resultA = await resolver.resolveProjectFile(
          path.join(project.path, "contracts/A.sol"),
        );
        assert.ok(resultA.success, "Result should be successful");

        const resultDupDuped = await resolver.resolveImport(
          resultA.value,
          "dup/duped.sol",
        );
        assert.ok(resultDupDuped.success, "Result should be successful");

        const depSrcDResult = await resolver.resolveImport(
          resultA.value,
          "dep/src/D.sol",
        );
        assert.ok(depSrcDResult.success, "Result should be successful");

        const depSrcDDupWithOtherNameDupedResult = await resolver.resolveImport(
          depSrcDResult.value.file,
          "dup/duped.sol",
        );
        assert.ok(
          depSrcDDupWithOtherNameDupedResult.success,
          "Result should be successful",
        );

        assert.equal(
          depSrcDDupWithOtherNameDupedResult.value.file,
          resultDupDuped.value.file,
        );
      });
    });

    describe("Special cases", () => {
      describe("Remapping suggestion for local direct import errors", () => {
        async function assertSuggestedRemapping(
          resolver: NewResolver,
          from: ResolvedFile,
          importPath: string,
          suggestedRemapping: string,
        ) {
          assert.deepEqual(await resolver.resolveImport(from, importPath), {
            success: false,
            error: {
              type: ImportResolutionErrorType.DIRECT_IMPORT_TO_LOCAL_FILE,
              fromFsPath: from.fsPath,
              importPath,
              suggestedRemapping,
            },
          });
        }

        describe("From a local file", () => {
          it("Should suggest a remapping to make the local direct import work", async () => {
            const localTemplate: TestProjectTemplate = {
              name: "local-direct-import-suggestion",
              version: "1.0.0",
              files: {
                "contracts/A.sol": `A`,
                "contracts/B.sol": `B`,
                "lib/submodule/src/C.sol": `C`,
                "lib/submodule/src/asd/D.sol": `D`,
                "lib/submodule/test/E.sol": `E`,
              },
            };

            await using project = await useTestProjectTemplate(localTemplate);
            const resolver = await NewResolverImplementation.create(
              project.path,
              readUtf8File,
            );

            const contractsA = await resolver.resolveProjectFile(
              path.join(project.path, "contracts/A.sol"),
            );
            assert.ok(contractsA.success, "Result should be successful");

            const libSubmoduleSrcAsdD = await resolver.resolveProjectFile(
              path.join(project.path, "lib/submodule/src/asd/D.sol"),
            );
            assert.ok(
              libSubmoduleSrcAsdD.success,
              "Result should be successful",
            );

            const libSubmoduleTestE = await resolver.resolveProjectFile(
              path.join(project.path, "lib/submodule/test/E.sol"),
            );
            assert.ok(libSubmoduleTestE.success, "Result should be successful");

            await assertSuggestedRemapping(
              resolver,
              contractsA.value,
              "contracts/B.sol",
              "contracts/=contracts/",
            );

            await assertSuggestedRemapping(
              resolver,
              libSubmoduleSrcAsdD.value,
              "src/C.sol",
              "lib/submodule/:src/=src/",
            );

            await assertSuggestedRemapping(
              resolver,
              libSubmoduleSrcAsdD.value,
              "src/asd/D.sol",
              "lib/submodule/:src/=src/",
            );

            await assertSuggestedRemapping(
              resolver,
              libSubmoduleTestE.value,
              "src/asd/D.sol",
              "lib/submodule/:src/=src/",
            );

            await assertSuggestedRemapping(
              resolver,
              libSubmoduleTestE.value,
              "src/C.sol",
              "lib/submodule/:src/=src/",
            );
          });
        });

        describe("From an npm file", () => {
          it("Should suggest a remapping to make the local direct import work", async () => {
            // Note: this is almost the same test as above, but everything is in
            // an npm package, so the remapping is different.

            const localTemplate: TestProjectTemplate = {
              name: "local-direct-import-suggestion",
              version: "1.0.0",
              files: {},
              dependencies: {
                dep: {
                  name: "dep",
                  version: "1.2.3",
                  files: {
                    "contracts/A.sol": `A`,
                    "contracts/B.sol": `B`,
                    "lib/submodule/src/C.sol": `C`,
                    "lib/submodule/src/asd/D.sol": `D`,
                    "lib/submodule/test/E.sol": `E`,
                  },
                },
              },
            };

            await using project = await useTestProjectTemplate(localTemplate);
            const resolver = await NewResolverImplementation.create(
              project.path,
              readUtf8File,
            );

            const contractsA = await resolver.resolveNpmDependencyFileAsRoot(
              "dep/contracts/A.sol",
            );
            assert.ok(contractsA.success, "Result should be successful");

            const libSubmoduleSrcAsdD =
              await resolver.resolveNpmDependencyFileAsRoot(
                "dep/lib/submodule/src/asd/D.sol",
              );
            assert.ok(
              libSubmoduleSrcAsdD.success,
              "Result should be successful",
            );

            const libSubmoduleTestE =
              await resolver.resolveNpmDependencyFileAsRoot(
                "dep/lib/submodule/test/E.sol",
              );
            assert.ok(libSubmoduleTestE.success, "Result should be successful");

            await assertSuggestedRemapping(
              resolver,
              contractsA.value.file,
              "contracts/B.sol",
              "npm/dep@1.2.3/:contracts/=npm/dep@1.2.3/contracts/",
            );

            await assertSuggestedRemapping(
              resolver,
              libSubmoduleSrcAsdD.value.file,
              "src/C.sol",
              "npm/dep@1.2.3/lib/submodule/:src/=npm/dep@1.2.3/src/",
            );

            await assertSuggestedRemapping(
              resolver,
              libSubmoduleSrcAsdD.value.file,
              "src/asd/D.sol",
              "npm/dep@1.2.3/lib/submodule/:src/=npm/dep@1.2.3/src/",
            );

            await assertSuggestedRemapping(
              resolver,
              libSubmoduleTestE.value.file,
              "src/asd/D.sol",
              "npm/dep@1.2.3/lib/submodule/:src/=npm/dep@1.2.3/src/",
            );

            await assertSuggestedRemapping(
              resolver,
              libSubmoduleTestE.value.file,
              "src/C.sol",
              "npm/dep@1.2.3/lib/submodule/:src/=npm/dep@1.2.3/src/",
            );
          });
        });
      });
    });
  });

  describe("Resolved file content processing", () => {
    it("Should process the content of a project file", async () => {
      const localTemplate: TestProjectTemplate = {
        name: "process-content-of-project-file",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `import "./B.sol";
import * as C from "./C.sol";`,
          "contracts/B.sol": `B`,
          "contracts/C.sol": `pragma solidity ^0.8.0;

          pragma solidity ^0.1.0;
`,
        },
      };

      await using project = await useTestProjectTemplate(localTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const resultA = await resolver.resolveProjectFile(
        path.join(project.path, "contracts/A.sol"),
      );
      assert.ok(resultA.success, "Result should be successful");

      const resultC = await resolver.resolveProjectFile(
        path.join(project.path, "contracts/C.sol"),
      );
      assert.ok(resultC.success, "Result should be successful");

      assert.deepEqual(resultA.value.content, {
        text: localTemplate.files["contracts/A.sol"],
        importPaths: ["./B.sol", "./C.sol"],
        versionPragmas: [],
      });

      assert.deepEqual(resultC.value.content, {
        text: localTemplate.files["contracts/C.sol"],
        importPaths: [],
        versionPragmas: ["^0.8.0", "^0.1.0"],
      });
    });

    it("Should process the content of an npm file", async () => {
      const localTemplate: TestProjectTemplate = {
        name: "process-content-of-npm-file",
        version: "1.0.0",
        files: {
          "main.sol": "main",
        },
        dependencies: {
          dep: {
            name: "dep",
            version: "1.2.3",
            files: {
              "contracts/A.sol": `import "./B.sol";
import * as C from "./C.sol";`,
              "contracts/B.sol": `B`,
              "contracts/C.sol": `pragma solidity ^0.8.0;

          pragma solidity ^0.1.0;
`,
            },
          },
        },
      };

      await using project = await useTestProjectTemplate(localTemplate);
      const resolver = await NewResolverImplementation.create(
        project.path,
        readUtf8File,
      );

      const mainResult = await resolver.resolveProjectFile(
        path.join(project.path, "main.sol"),
      );
      assert.ok(mainResult.success, "Result should be successful");

      const resultA = await resolver.resolveImport(
        mainResult.value,
        "dep/contracts/A.sol",
      );
      assert.ok(resultA.success, "Result should be successful");

      const resultC = await resolver.resolveImport(
        mainResult.value,
        "dep/contracts/C.sol",
      );
      assert.ok(resultC.success, "Result should be successful");

      assert.deepEqual(resultA.value.file.content, {
        text: localTemplate.dependencies?.dep?.files["contracts/A.sol"],
        importPaths: ["./B.sol", "./C.sol"],
        versionPragmas: [],
      });

      assert.deepEqual(resultC.value.file.content, {
        text: localTemplate.dependencies?.dep?.files["contracts/C.sol"],
        importPaths: [],
        versionPragmas: ["^0.8.0", "^0.1.0"],
      });
    });
  });
});
