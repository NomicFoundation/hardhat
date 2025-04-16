/* eslint-disable @typescript-eslint/no-shadow -- test cases can overwrite higher scope variables */
import type { Resolver } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/types.js";
import type {
  ResolvedFile,
  ProjectResolvedFile,
  ResolvedNpmPackage,
  NpmPackageResolvedFile,
} from "../../../../../../src/types/solidity/resolved-file.js";

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { getRealPath } from "@nomicfoundation/hardhat-utils/fs";

import {
  fsPathToSourceNamePath,
  ResolverImplementation,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/dependency-resolver.js";
import { ResolvedFileType } from "../../../../../../src/types/solidity/resolved-file.js";
import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-intialization.js";
import { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

const TEST_FIXTURES_ROOT = path.resolve(import.meta.dirname, "test-fixtures");

const FIXTURE_HARDHAT_PROJECT_ROOT = path.resolve(
  TEST_FIXTURES_ROOT,
  "monorepo/packages/hardhat-project",
);

function assertResolvedProjectFile(
  resolvedFile: ResolvedFile,
  pathFromProjectRoot: string,
): asserts resolvedFile is ProjectResolvedFile {
  assert.ok(
    resolvedFile.type === ResolvedFileType.PROJECT_FILE,
    `Resolved file ${resolvedFile.fsPath} is not a project file`,
  );
  assert.equal(
    resolvedFile.sourceName,
    fsPathToSourceNamePath(pathFromProjectRoot),
  );
  assert.equal(
    resolvedFile.fsPath,
    path.resolve(FIXTURE_HARDHAT_PROJECT_ROOT, pathFromProjectRoot),
  );

  const pathFromTestFixturesRoot = path.relative(
    TEST_FIXTURES_ROOT,
    resolvedFile.fsPath,
  );

  // Just as a way to validate which file we are reading the contents from
  // we wrote their relative unix-style relative path from the fixture root
  assert.deepEqual(resolvedFile.content, {
    text: fsPathToSourceNamePath(pathFromTestFixturesRoot) + "\n",
    importPaths: [],
    versionPragmas: [],
  });
}

function assertNpmPackageResolvedFile(
  resolvedFile: ResolvedFile,
  pacakge: Omit<ResolvedNpmPackage, "rootFsPath">,
  packagePathFromTestFixturesRoot: string,
  filePathFromPackageRoot: string,
  filePathFromTestFixturesRoot = path.join(
    packagePathFromTestFixturesRoot,
    filePathFromPackageRoot,
  ),
): asserts resolvedFile is NpmPackageResolvedFile {
  assert.ok(
    resolvedFile.type === ResolvedFileType.NPM_PACKAGE_FILE,
    `Resolved file ${resolvedFile.fsPath} is not an npm file`,
  );

  const packageRootPath = path.join(
    TEST_FIXTURES_ROOT,
    packagePathFromTestFixturesRoot,
  );

  assert.equal(resolvedFile.package.name, pacakge.name);
  assert.equal(resolvedFile.package.version, pacakge.version);
  assert.equal(resolvedFile.package.rootSourceName, pacakge.rootSourceName);
  assert.equal(resolvedFile.package.rootFsPath, packageRootPath);

  assert.equal(
    resolvedFile.sourceName,
    pacakge.rootSourceName + fsPathToSourceNamePath(filePathFromPackageRoot),
  );
  assert.equal(
    resolvedFile.fsPath,
    path.join(TEST_FIXTURES_ROOT, filePathFromTestFixturesRoot),
  );

  // Just as a way to validate which file we are reading the contents from
  // we wrote their relative unix-style relative path from the fixture root
  assert.deepEqual(resolvedFile.content, {
    text: fsPathToSourceNamePath(filePathFromTestFixturesRoot) + "\n",
    importPaths: [],
    versionPragmas: [],
  });
}

describe("Resolver", () => {
  // Some of the error messages in the resolver use a file path based on the
  // CWD, so we set it for these tests
  let originalCwd: string;
  let hre: HardhatRuntimeEnvironment;

  before(async () => {
    originalCwd = process.cwd();
    process.chdir(FIXTURE_HARDHAT_PROJECT_ROOT);
    hre = await createHardhatRuntimeEnvironment({});
  });

  after(() => {
    process.chdir(originalCwd);
  });

  describe("Project files resolution", () => {
    it("Should throw if the file isn't part of the project", async () => {
      const resolver = await ResolverImplementation.create(
        FIXTURE_HARDHAT_PROJECT_ROOT,
        [],
        hre.hooks,
      );

      let file = "foo.sol";
      await assertRejectsWithHardhatError(
        () => resolver.resolveProjectFile(file),
        HardhatError.ERRORS.CORE.SOLIDITY
          .RESOLVING_INCORRECT_FILE_AS_PROJECT_FILE,
        { file },
      );

      file = "/asd/asd/foo.sol";
      await assertRejectsWithHardhatError(
        () => resolver.resolveProjectFile(file),
        HardhatError.ERRORS.CORE.SOLIDITY
          .RESOLVING_INCORRECT_FILE_AS_PROJECT_FILE,
        { file },
      );
    });

    it("Should resolve them to project files with their path from the project root as sourceName", async () => {
      const resolver = await ResolverImplementation.create(
        FIXTURE_HARDHAT_PROJECT_ROOT,
        [],
        hre.hooks,
      );

      assertResolvedProjectFile(
        await resolver.resolveProjectFile(
          path.join(FIXTURE_HARDHAT_PROJECT_ROOT, "contracts/File.sol"),
        ),
        "contracts/File.sol",
      );

      assertResolvedProjectFile(
        await resolver.resolveProjectFile(
          path.join(FIXTURE_HARDHAT_PROJECT_ROOT, "File.sol"),
        ),
        "File.sol",
      );

      assertResolvedProjectFile(
        await resolver.resolveProjectFile(
          path.join(FIXTURE_HARDHAT_PROJECT_ROOT, "npm/File.sol"),
        ),
        "npm/File.sol",
      );
    });

    it("Should validate that the files exists", async () => {
      const resolver = await ResolverImplementation.create(
        FIXTURE_HARDHAT_PROJECT_ROOT,
        [],
        hre.hooks,
      );

      await assertRejectsWithHardhatError(
        resolver.resolveProjectFile(
          path.join(FIXTURE_HARDHAT_PROJECT_ROOT, "nope.sol"),
        ),
        HardhatError.ERRORS.CORE.SOLIDITY.RESOLVING_NONEXISTENT_PROJECT_FILE,
        {
          file: "nope.sol",
        },
      );
    });
  });

  describe("Imports resolution", () => {
    describe("Without user remappings", () => {
      let resolver: Resolver;
      let contractsFileSol: ProjectResolvedFile;

      beforeEach(async () => {
        resolver = await ResolverImplementation.create(
          FIXTURE_HARDHAT_PROJECT_ROOT,
          [],
          hre.hooks,
        );

        contractsFileSol = await resolver.resolveProjectFile(
          path.resolve(FIXTURE_HARDHAT_PROJECT_ROOT, "contracts/File.sol"),
        );
      });

      describe("Imports from the project", () => {
        describe("Imports of project files", () => {
          describe("Relative imports", () => {
            it("Should resolve them to project files with their path from the project root as sourceName", async () => {
              assertResolvedProjectFile(
                await resolver.resolveImport(contractsFileSol, "./File2.sol"),
                "contracts/File2.sol",
              );

              assertResolvedProjectFile(
                await resolver.resolveImport(contractsFileSol, "../File.sol"),
                "File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), []);
            });

            it("Should validate that the files exists with the right casing", async () => {
              await assertRejectsWithHardhatError(
                resolver.resolveImport(contractsFileSol, "./nope.sol"),
                HardhatError.ERRORS.CORE.SOLIDITY.IMPORTED_FILE_DOESNT_EXIST,
                {
                  importPath: "./nope.sol",
                  from: path.join("contracts", "File.sol"),
                },
              );

              await assertRejectsWithHardhatError(
                resolver.resolveImport(contractsFileSol, "../file.sol"),
                HardhatError.ERRORS.CORE.SOLIDITY
                  .IMPORTED_FILE_WITH_INCORRECT_CASING,
                {
                  importPath: "../file.sol",
                  from: path.join("contracts", "File.sol"),
                  correctCasing: "File.sol",
                },
              );

              assert.deepEqual(resolver.getRemappings(), []);
            });
          });

          describe("Direct imports", () => {
            it("Should resolve them to project files with the direct import as sourceName", async () => {
              assertResolvedProjectFile(
                await resolver.resolveImport(
                  contractsFileSol,
                  "contracts/File.sol",
                ),
                "contracts/File.sol",
              );

              assertResolvedProjectFile(
                await resolver.resolveImport(
                  contractsFileSol,
                  "contracts/File2.sol",
                ),
                "contracts/File2.sol",
              );

              assertResolvedProjectFile(
                await resolver.resolveImport(contractsFileSol, "npm/File.sol"),
                "npm/File.sol",
              );

              assertResolvedProjectFile(
                await resolver.resolveImport(contractsFileSol, "File.sol"),
                "File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), []);
            });

            it("Should validate that the files exist with the right casing", async () => {
              // Note that the imports here are considered local imports,
              // otherwise they would be validated as npm imports

              await assertRejectsWithHardhatError(
                resolver.resolveImport(contractsFileSol, "contracts/nope.sol"),
                HardhatError.ERRORS.CORE.SOLIDITY.IMPORTED_FILE_DOESNT_EXIST,
                {
                  importPath: "contracts/nope.sol",
                  from: path.join("contracts", "File.sol"),
                },
              );

              await assertRejectsWithHardhatError(
                resolver.resolveImport(contractsFileSol, "contracts/file2.sol"),
                HardhatError.ERRORS.CORE.SOLIDITY
                  .IMPORTED_FILE_WITH_INCORRECT_CASING,
                {
                  importPath: "contracts/file2.sol",
                  from: path.join("contracts", "File.sol"),
                  correctCasing: "contracts/File2.sol",
                },
              );

              assert.deepEqual(resolver.getRemappings(), []);
            });

            it("Should treat files in the project root as local imports, even if they don't exist", async () => {
              assertResolvedProjectFile(
                await resolver.resolveImport(contractsFileSol, "File.sol"),
                "File.sol",
              );

              await assertRejectsWithHardhatError(
                resolver.resolveImport(contractsFileSol, "nope.sol"),
                HardhatError.ERRORS.CORE.SOLIDITY.IMPORTED_FILE_DOESNT_EXIST,
                {
                  importPath: "nope.sol",
                  from: path.join("contracts", "File.sol"),
                },
              );

              assert.deepEqual(resolver.getRemappings(), []);
            });

            it("Should treat files whose first directory exists in the project root as local imports, even if they don't exist", async () => {
              assertResolvedProjectFile(
                await resolver.resolveImport(
                  contractsFileSol,
                  "hardhat/File.sol",
                ),
                "hardhat/File.sol",
              );

              await assertRejectsWithHardhatError(
                resolver.resolveImport(contractsFileSol, "npm/nope.sol"),
                HardhatError.ERRORS.CORE.SOLIDITY.IMPORTED_FILE_DOESNT_EXIST,
                {
                  importPath: "npm/nope.sol",
                  from: path.join("contracts", "File.sol"),
                },
              );

              assert.deepEqual(resolver.getRemappings(), []);
            });
          });
        });

        describe("Imports of npm files", () => {
          it("Should always treat hardhat/console.sol as resolved from the hh package itself even if other hardhat/ files are local", async () => {
            const consoleSol = await resolver.resolveImport(
              contractsFileSol,
              "hardhat/console.sol",
            );

            assert.equal(consoleSol.type, ResolvedFileType.NPM_PACKAGE_FILE);
            assert.equal(consoleSol.package.name, "hardhat");
            assert.equal(consoleSol.package.version, "local");
            assert.equal(
              consoleSol.package.rootSourceName,
              "npm/hardhat@local/",
            );
            assert.equal(
              consoleSol.package.rootFsPath,
              await getRealPath(
                path.join(import.meta.dirname, "../../../../../.."),
              ),
            );

            const hardhatFile = await resolver.resolveImport(
              contractsFileSol,
              "hardhat/File.sol",
            );

            assertResolvedProjectFile(hardhatFile, "hardhat/File.sol");

            assert.deepEqual(resolver.getRemappings(), [
              {
                context: "",
                prefix: "hardhat/console.sol",
                target: "npm/hardhat@local/console.sol",
              },
            ]);
          });

          it("Should fail if the package is not installed", async () => {
            await assertRejectsWithHardhatError(
              resolver.resolveImport(
                contractsFileSol,
                "uninstalled-package/File.sol",
              ),
              HardhatError.ERRORS.CORE.SOLIDITY
                .IMPORTED_NPM_DEPENDENCY_NOT_INSTALLED,
              {
                from: path.join("contracts", "File.sol"),
                importPath: "uninstalled-package/File.sol",
              },
            );
          });

          it("Should validate that the files exist with the right casing", async () => {
            await assertRejectsWithHardhatError(
              resolver.resolveImport(contractsFileSol, "dependency/nope.sol"),
              HardhatError.ERRORS.CORE.SOLIDITY.IMPORTED_FILE_DOESNT_EXIST,
              {
                from: path.join("contracts", "File.sol"),
                importPath: "dependency/nope.sol",
              },
            );

            await assertRejectsWithHardhatError(
              resolver.resolveImport(contractsFileSol, "dependency/file.sol"),
              HardhatError.ERRORS.CORE.SOLIDITY
                .IMPORTED_FILE_WITH_INCORRECT_CASING,
              {
                from: path.join("contracts", "File.sol"),
                importPath: "dependency/file.sol",
                correctCasing: "File.sol",
              },
            );
          });

          describe("Of a monorepo file", () => {
            it("Should be resolved with npm/package@local/path/from/root", async () => {
              const localDependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "local-dependency/contracts/File.sol",
              );

              assertNpmPackageResolvedFile(
                localDependencyFile,
                {
                  name: "local-dependency",
                  version: "local",
                  rootSourceName: "npm/local-dependency@local/",
                },
                "monorepo/packages/local-dependency",
                "contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "local-dependency/",
                  target: "npm/local-dependency@local/",
                },
              ]);
            });
          });

          describe("Of a direct npm dependency file", () => {
            it("Should be resolved with npm/package@version/path/from/root", async () => {
              const directDependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "dependency/contracts/File.sol",
              );

              assertNpmPackageResolvedFile(
                directDependencyFile,
                {
                  name: "dependency",
                  version: "2.0.0",
                  rootSourceName: "npm/dependency@2.0.0/",
                },
                "monorepo/packages/hardhat-project/node_modules/dependency",
                "contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
              ]);
            });
          });

          describe("Of a hoisted npm dependency file", () => {
            it("Should be resolved with npm/package@version/path/from/root", async () => {
              const hoistedDependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "hoisted/File.sol",
              );

              assertNpmPackageResolvedFile(
                hoistedDependencyFile,
                {
                  name: "hoisted",
                  version: "8.0.0",
                  rootSourceName: "npm/hoisted@8.0.0/",
                },
                "monorepo/node_modules/hoisted",
                "File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "hoisted/",
                  target: "npm/hoisted@8.0.0/",
                },
              ]);
            });
          });

          describe("Of a scoped dependency file", () => {
            it("Should be resolved with npm/@scope/package@version/path/from/root", async () => {
              const scopeDependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "@scope/dependency/contracts/File.sol",
              );

              assertNpmPackageResolvedFile(
                scopeDependencyFile,
                {
                  name: "@scope/dependency",
                  version: "1.0.0",
                  rootSourceName: "npm/@scope/dependency@1.0.0/",
                },
                "monorepo/node_modules/@scope/dependency",
                "contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "@scope/dependency/",
                  target: "npm/@scope/dependency@1.0.0/",
                },
              ]);
            });
          });

          describe("Of package that's installed with an alternative name", () => {
            it("Should be resolved with npm/package@version/path/from/root using the package.json's name", async () => {
              const otherNameDependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "other-name/contracts/File.sol",
              );

              assertNpmPackageResolvedFile(
                otherNameDependencyFile,
                {
                  name: "real-name",
                  version: "6.0.0",
                  rootSourceName: "npm/real-name@6.0.0/",
                },
                "monorepo/packages/hardhat-project/node_modules/other-name",
                "contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "other-name/",
                  target: "npm/real-name@6.0.0/",
                },
              ]);
            });

            it("Should not resolve imports to the real-name if not installed with that name", async () => {
              await assertRejectsWithHardhatError(
                resolver.resolveImport(
                  contractsFileSol,
                  "real-name/contracts/File.sol",
                ),
                HardhatError.ERRORS.CORE.SOLIDITY
                  .IMPORTED_NPM_DEPENDENCY_NOT_INSTALLED,
                {
                  from: path.join("contracts", "File.sol"),
                  importPath: "real-name/contracts/File.sol",
                },
              );
            });
          });
        });
      });

      describe("Imports from an npm package", () => {
        describe("Imports of the own package files", () => {
          describe("Relative imports", () => {
            it("Should resolve it without needing a new remapping", async () => {
              const dependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "dependency/contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
              ]);

              const dependencyFileAgain = await resolver.resolveImport(
                dependencyFile,
                "./File.sol",
              );

              assert.equal(dependencyFile, dependencyFileAgain);

              const dependencyNpmFile = await resolver.resolveImport(
                dependencyFile,
                "../npm/File.sol",
              );

              assertNpmPackageResolvedFile(
                dependencyNpmFile,
                {
                  name: "dependency",
                  version: "2.0.0",
                  rootSourceName: "npm/dependency@2.0.0/",
                },
                "monorepo/packages/hardhat-project/node_modules/dependency",
                "npm/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
              ]);
            });
          });

          describe("Direct imports", () => {
            it("Should resolve it and create a new remapping to avoid clashes with the project's source names", async () => {
              const dependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "dependency/contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
              ]);

              const dependencyContractsFileSol = await resolver.resolveImport(
                dependencyFile,
                "contracts/File.sol",
              );

              assertNpmPackageResolvedFile(
                dependencyContractsFileSol,
                {
                  name: "dependency",
                  version: "2.0.0",
                  rootSourceName: "npm/dependency@2.0.0/",
                },
                "monorepo/packages/hardhat-project/node_modules/dependency",
                "contracts/File.sol",
              );

              const dependencyFileSol = await resolver.resolveImport(
                dependencyFile,
                "File.sol",
              );

              assertNpmPackageResolvedFile(
                dependencyFileSol,
                {
                  name: "dependency",
                  version: "2.0.0",
                  rootSourceName: "npm/dependency@2.0.0/",
                },
                "monorepo/packages/hardhat-project/node_modules/dependency",
                "File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
                {
                  context: "npm/dependency@2.0.0/",
                  prefix: "File.sol",
                  target: "npm/dependency@2.0.0/File.sol",
                },
                {
                  context: "npm/dependency@2.0.0/",
                  prefix: "contracts/",
                  target: "npm/dependency@2.0.0/contracts/",
                },
              ]);
            });
          });
        });

        describe("Imports of npm files", () => {
          describe("Of a monorepo file", () => {
            it("Should be resolved with npm/package@local/path/from/root", async () => {
              const dependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "dependency/contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
              ]);

              const monorepoFile = await resolver.resolveImport(
                dependencyFile,
                "local-dependency/contracts/File.sol",
              );

              assertNpmPackageResolvedFile(
                monorepoFile,
                {
                  name: "local-dependency",
                  version: "local",
                  rootSourceName: "npm/local-dependency@local/",
                },
                "monorepo/packages/local-dependency",
                "contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
                {
                  context: "npm/dependency@2.0.0/",
                  prefix: "local-dependency/",
                  target: "npm/local-dependency@local/",
                },
              ]);
            });
          });

          describe("Of a direct npm dependency file", () => {
            it("Should be resolved with npm/package@version/path/from/root", async () => {
              const dependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "dependency/contracts/File.sol",
              );

              const dependencyDependencyFile = await resolver.resolveImport(
                dependencyFile,
                "dependencydependency/File.sol",
              );

              assertNpmPackageResolvedFile(
                dependencyDependencyFile,
                {
                  name: "dependencydependency",
                  version: "7.8.9",
                  rootSourceName: "npm/dependencydependency@7.8.9/",
                },
                "monorepo/packages/hardhat-project/node_modules/dependency/node_modules/dependencydependency",
                "File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
                {
                  context: "npm/dependency@2.0.0/",
                  prefix: "dependencydependency/",
                  target: "npm/dependencydependency@7.8.9/",
                },
              ]);
            });
          });

          describe("Of a file within the hardhat project", () => {
            it("Should resolve them to project files with the direct import as sourceName", async () => {
              const dependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "dependency/contracts/File.sol",
              );

              const localFile = await resolver.resolveImport(
                dependencyFile,
                "hardhat-project/File.sol",
              );

              assertResolvedProjectFile(localFile, "File.sol");

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
                {
                  context: "npm/dependency@2.0.0/",
                  prefix: "hardhat-project/",
                  target: "",
                },
              ]);
            });
          });

          describe("Of the same dependency than the hardhat project but a different version", () => {
            it("Should be resolved with npm/package@version/path/from/root using the package.json's name", async () => {
              const dependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "dependency/contracts/File.sol",
              );

              const localDependencyFile = await resolver.resolveImport(
                contractsFileSol,
                "local-dependency/contracts/File.sol",
              );

              const localDependencyDependencyFile =
                await resolver.resolveImport(
                  localDependencyFile,
                  "dependency/contracts/File.sol",
                );

              assert.notEqual(dependencyFile, localDependencyDependencyFile);

              assertNpmPackageResolvedFile(
                dependencyFile,
                {
                  name: "dependency",
                  version: "2.0.0",
                  rootSourceName: "npm/dependency@2.0.0/",
                },
                "monorepo/packages/hardhat-project/node_modules/dependency",
                "contracts/File.sol",
              );

              assertNpmPackageResolvedFile(
                localDependencyDependencyFile,
                {
                  name: "dependency",
                  version: "4.0.0",
                  rootSourceName: "npm/dependency@4.0.0/",
                },
                "monorepo/packages/local-dependency/node_modules/dependency",
                "contracts/File.sol",
              );

              assert.deepEqual(resolver.getRemappings(), [
                {
                  context: "",
                  prefix: "dependency/",
                  target: "npm/dependency@2.0.0/",
                },
                {
                  context: "",
                  prefix: "local-dependency/",
                  target: "npm/local-dependency@local/",
                },
                {
                  context: "npm/local-dependency@local/",
                  prefix: "dependency/",
                  target: "npm/dependency@4.0.0/",
                },
              ]);
            });
          });
        });
      });
    });

    describe("With user remappings", () => {
      describe("Resolver initialization", () => {
        it("Should validate forbid remappings with npm/... context", async () => {});

        it.todo("Should allow remappings with npm/... targets");

        it.todo(
          "Should validate and resolve npm/... targets of npm dependencies",
        );

        it.todo(
          "Should validate and resolve npm/... targets of monorepo dependencies",
        );
      });

      describe("Imports from the project", () => {
        describe("Imports into project files", () => {
          it.todo(
            "Should throw if the resulting sourceName would be considered an npm import if used as a direct import",
          );

          it.todo(
            "Should validate that the resulting sourceName exists and has the correct casing as a relative path from the project root",
          );

          it.todo("Should resolve it to the remapped sourceName");
        });

        describe("Imports into npm files", () => {
          describe("Using the npm/ prefix", () => {
            it.todo(
              "Should be equivalent to just importing that file through npm",
            );
          });
        });
      });

      describe("Imports from an npm package", () => {
        describe("Direct imports", () => {
          it.todo(
            "It should not be affected by a user remapping, even if the prefix matches",
          );
        });
      });
    });

    describe("Edge cases", () => {
      describe("Duplicated dependency in the monorepo", () => {
        it.todo("Should always be resolved to whatever was resolved first");
      });
    });
  });

  describe("NPM with package exports handling", function () {
    describe("resolving dependenciesAsRoot for packages that use exports", function () {
      it("resolves the exported dependency contract correctly", async () => {
        const resolver = await ResolverImplementation.create(
          FIXTURE_HARDHAT_PROJECT_ROOT,
          [],
          hre.hooks,
        );
        const file = await resolver.resolveNpmDependencyFileAsRoot(
          "exports/Exported.sol",
        );

        assertNpmPackageResolvedFile(
          file,
          {
            name: "exports",
            version: "3.0.0",
            rootSourceName: "npm/exports@3.0.0/",
          },
          "monorepo/node_modules/exports",
          "Exported.sol",
          "monorepo/node_modules/exports/contracts/Exported.sol",
        );

        assert.equal(file.sourceName, "npm/exports@3.0.0/Exported.sol");
      });

      it("throws RESOLVE_NON_EXISTENT_NPM_FILE when trying to use the real path instead of the exported path", async () => {
        const resolver = await ResolverImplementation.create(
          FIXTURE_HARDHAT_PROJECT_ROOT,
          [],
          hre.hooks,
        );

        await assertRejectsWithHardhatError(
          resolver.resolveNpmDependencyFileAsRoot(
            "exports/contracts/Exported.sol",
          ),
          HardhatError.ERRORS.CORE.SOLIDITY.RESOLVE_NON_EXISTENT_NPM_ROOT,
          {
            module: "exports/contracts/Exported.sol",
          },
        );
      });

      it("throws RESOLVE_NON_EXISTENT_NPM_FILE when trying to use a path that resolves exports but the file doesnt exist", async () => {
        const resolver = await ResolverImplementation.create(
          FIXTURE_HARDHAT_PROJECT_ROOT,
          [],
          hre.hooks,
        );

        await assertRejectsWithHardhatError(
          resolver.resolveNpmDependencyFileAsRoot(
            "exports/ResolvesButDoesntExist.sol",
          ),
          HardhatError.ERRORS.CORE.SOLIDITY.RESOLVE_NON_EXISTENT_NPM_ROOT,
          {
            module: "exports/ResolvesButDoesntExist.sol",
          },
        );
      });

      it("throws RESOLVE_NOT_EXPORTED_NPM_FILE for non-exported files", async () => {
        const resolver = await ResolverImplementation.create(
          FIXTURE_HARDHAT_PROJECT_ROOT,
          [],
          hre.hooks,
        );

        await assertRejectsWithHardhatError(
          resolver.resolveNpmDependencyFileAsRoot("exports/NotExported"),
          HardhatError.ERRORS.CORE.SOLIDITY.RESOLVE_NOT_EXPORTED_NPM_FILE,
          {
            module: "exports/NotExported", // not using .sol, because that would match the *.sol rule
          },
        );
      });
    });

    describe("resolving direct imports to npm packages that use exports", function () {
      let file: ResolvedFile;
      let resolver: Resolver;

      beforeEach(async () => {
        resolver = await ResolverImplementation.create(
          FIXTURE_HARDHAT_PROJECT_ROOT,
          [],
          hre.hooks,
        );
        file = await resolver.resolveProjectFile(
          path.resolve(FIXTURE_HARDHAT_PROJECT_ROOT, "contracts/File.sol"),
        );
      });

      describe("without remappings", function () {
        it("resolves a file that uses a single export", async () => {
          const resolvedFile = await resolver.resolveImport(
            file,
            "exports/SingleExport.sol",
          );

          assertNpmPackageResolvedFile(
            resolvedFile,
            {
              name: "exports",
              version: "3.0.0",
              rootSourceName: "npm/exports@3.0.0/",
            },
            "monorepo/node_modules/exports",
            "SingleExport.sol",
            "monorepo/node_modules/exports/contracts2/SingleExport.sol",
          );

          assert.equal(
            resolvedFile.sourceName,
            "npm/exports@3.0.0/SingleExport.sol",
          );
        });

        it("resolves a file that uses wildcard export", async () => {
          const resolvedFile = await resolver.resolveImport(
            file,
            "exports/Exported.sol",
          );

          assertNpmPackageResolvedFile(
            resolvedFile,
            {
              name: "exports",
              version: "3.0.0",
              rootSourceName: "npm/exports@3.0.0/",
            },
            "monorepo/node_modules/exports",
            "Exported.sol",
            "monorepo/node_modules/exports/contracts/Exported.sol",
          );

          assert.equal(
            resolvedFile.sourceName,
            "npm/exports@3.0.0/Exported.sol",
          );
        });

        it("requires correct casing, and uses a special error", async () => {
          await assertRejectsWithHardhatError(
            resolver.resolveImport(file, "exports/exported.sol"),
            HardhatError.ERRORS.CORE.SOLIDITY
              .IMPORTED_PACKAGE_EXPORTS_FILE_WITH_INCORRECT_CASING,
            {
              importPath: "exports/exported.sol",
              from: path.join("contracts", "File.sol"),
            },
          );
        });

        it("requires the file to be exported", async () => {
          await assertRejectsWithHardhatError(
            resolver.resolveImport(file, "exports/NotExported"),
            HardhatError.ERRORS.CORE.SOLIDITY.RESOLVE_NOT_EXPORTED_NPM_FILE,
            { module: "exports/NotExported" },
          );
        });

        describe("exports that use conditions", function () {
          it("doesn't resolve with the 'node' condition", async () => {
            assertRejectsWithHardhatError(
              resolver.resolveImport(file, "exports/Condition-node.sol"),
              HardhatError.ERRORS.CORE.SOLIDITY.RESOLVE_NOT_EXPORTED_NPM_FILE,
              { module: "exports/Condition-node.sol" },
            );
          });

          it("does not resolve with the 'import' condition", async () => {
            await assertRejectsWithHardhatError(
              resolver.resolveImport(file, "exports/Condition-import.sol"),
              HardhatError.ERRORS.CORE.SOLIDITY.RESOLVE_NOT_EXPORTED_NPM_FILE,
              { module: "exports/Condition-import.sol" },
            );
          });

          it("resolves with the 'default' condition", async () => {
            const resolvedFile = await resolver.resolveImport(
              file,
              "exports/Condition-default.sol",
            );

            assertNpmPackageResolvedFile(
              resolvedFile,
              {
                name: "exports",
                version: "3.0.0",
                rootSourceName: "npm/exports@3.0.0/",
              },
              "monorepo/node_modules/exports",
              "Condition-default.sol",
              "monorepo/node_modules/exports/contracts4/Condition-default.sol",
            );

            assert.equal(
              resolvedFile.sourceName,
              "npm/exports@3.0.0/Condition-default.sol",
            );
          });

          it("resolves with nested supported conditions", async () => {
            const resolvedFile = await resolver.resolveImport(
              file,
              "exports/Condition-nested.sol",
            );

            assertNpmPackageResolvedFile(
              resolvedFile,
              {
                name: "exports",
                version: "3.0.0",
                rootSourceName: "npm/exports@3.0.0/",
              },
              "monorepo/node_modules/exports",
              "Condition-nested.sol",
              "monorepo/node_modules/exports/contracts4/Condition-nested.sol",
            );

            assert.equal(
              resolvedFile.sourceName,
              "npm/exports@3.0.0/Condition-nested.sol",
            );
          });

          it("doesnt resolve with the 'require' condition", async () => {
            assertRejectsWithHardhatError(
              resolver.resolveImport(file, "exports/Condition-require.sol"),
              HardhatError.ERRORS.CORE.SOLIDITY.RESOLVE_NOT_EXPORTED_NPM_FILE,
              { module: "exports/Condition-require.sol" },
            );
          });
        });
      });

      describe("with remappings", function () {
        it("resolves exported file when remapping part of the path", async () => {
          resolver = await ResolverImplementation.create(
            FIXTURE_HARDHAT_PROJECT_ROOT,
            ["remapped_pkg/=npm/exports@3.0.0/"],
            hre.hooks,
          );

          const resolvedFile = await resolver.resolveImport(
            file,
            "remapped_pkg/SingleExport.sol",
          );

          assertNpmPackageResolvedFile(
            resolvedFile,
            {
              name: "exports",
              version: "3.0.0",
              rootSourceName: "npm/exports@3.0.0/",
            },
            "monorepo/node_modules/exports",
            "SingleExport.sol",
            "monorepo/node_modules/exports/contracts2/SingleExport.sol",
          );

          assert.equal(
            resolvedFile.sourceName,
            "npm/exports@3.0.0/SingleExport.sol",
          );
        });

        it("resolves the exported file when remapping the whole path", async () => {
          const resolver = await ResolverImplementation.create(
            FIXTURE_HARDHAT_PROJECT_ROOT,
            ["remapped_file=npm/exports@3.0.0/SingleExport.sol"],
            hre.hooks,
          );

          const resolvedFile = await resolver.resolveImport(
            file,
            "remapped_file",
          );

          assertNpmPackageResolvedFile(
            resolvedFile,
            {
              name: "exports",
              version: "3.0.0",
              rootSourceName: "npm/exports@3.0.0/",
            },
            "monorepo/node_modules/exports",
            "SingleExport.sol",
            "monorepo/node_modules/exports/contracts2/SingleExport.sol",
          );

          assert.equal(
            resolvedFile.sourceName,
            "npm/exports@3.0.0/SingleExport.sol",
          );
        });

        it("throws an error when the remapped file doesnt exist", async () => {
          const resolver = await ResolverImplementation.create(
            FIXTURE_HARDHAT_PROJECT_ROOT,
            ["remapped_pkg/=npm/exports@3.0.0/"],
            hre.hooks,
          );

          await assertRejectsWithHardhatError(
            resolver.resolveImport(file, "remapped_pkg/NonExistent.sol"),
            HardhatError.ERRORS.CORE.SOLIDITY.IMPORTED_FILE_DOESNT_EXIST,
            {
              importPath: "remapped_pkg/NonExistent.sol",
              from: path.join("contracts", "File.sol"),
            },
          );
        });
      });
    });
  });
});
