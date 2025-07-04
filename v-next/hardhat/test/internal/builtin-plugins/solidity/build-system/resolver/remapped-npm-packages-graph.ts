import type { TestProjectTemplate } from "./helpers.js";
import type {
  Remapping,
  ResolvedUserRemapping,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/types.js";
import type {
  NpmPackageResolvedFile,
  ProjectResolvedFile,
} from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { symlink } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import {
  ensureDir,
  mkdtemp,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  isResolvedUserRemapping,
  RemappedNpmPackagesGraphImplementation,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/remapped-npm-packages-graph.js";
import { UserRemappingType } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/types.js";
import {
  ResolvedFileType,
  UserRemappingErrorType,
} from "../../../../../../src/types/solidity.js";

import { useTestProjectTemplate } from "./helpers.js";

describe("RemappedNpmPackagesGraph", () => {
  describe("Graph initialization", () => {
    describe("Without dependencies and remappings", () => {
      it("Should initialize a graph with the right hardhat project package", async () => {
        const template: TestProjectTemplate = {
          name: "no-dependencies-nor-remappings",
          version: "1.2.4",
          files: {
            "contracts/A.sol": "contract A {}",
          },
          exports: {
            "./*.sol": "./contracts/*.sol",
          },
        };
        await using project = await useTestProjectTemplate(template);
        const graph = await RemappedNpmPackagesGraphImplementation.create(
          project.path,
        );

        const hhProjectPackage = graph.getHardhatProjectPackage();

        assert.deepEqual(graph.toJSON(), {
          hardhatProjectPackage: hhProjectPackage,
          packageByInputSourceNameRoot: {
            project: hhProjectPackage,
          },
          installationMap: {
            project: {},
          },
          userRemappingsPerPackage: {},
          generatedRemappingsIntoNpmFiles: {
            project: {},
          },
        });
      });

      it("Shouldn't load any remappings.txt when first initialized", async () => {
        const template: TestProjectTemplate = {
          name: "no-remappings-loaded-on-init",
          version: "1.2.4",
          files: {
            "contracts/A.sol": "contract A {}",
            "remappings.txt": `foo/=bar/
node_modules/nope/=bar/
nope`,
            "lib/submodule/remappings.txt": `context/:prefix/=target/
invalid syntax`,
          },
          exports: {
            "./*.sol": "./contracts/*.sol",
          },
        };
        await using project = await useTestProjectTemplate(template);
        const graph = await RemappedNpmPackagesGraphImplementation.create(
          project.path,
        );

        const hhProjectPackage = graph.getHardhatProjectPackage();

        assert.deepEqual(graph.toJSON(), {
          hardhatProjectPackage: hhProjectPackage,
          packageByInputSourceNameRoot: {
            project: hhProjectPackage,
          },
          installationMap: {
            project: {},
          },
          userRemappingsPerPackage: {},
          generatedRemappingsIntoNpmFiles: {
            project: {},
          },
        });
      });

      it("Shouldn't load any dependency nor their remappings.txts when first initialized", async () => {
        const template: TestProjectTemplate = {
          name: "no-dependencies-loaded-on-init",
          version: "1.2.4",
          files: {
            "contracts/A.sol": "contract A {}",
            "remappings.txt": `foo/=bar/
nope`,
            "lib/submodule/remappings.txt": `context/:prefix/=target/
invalid syntax`,
          },
          dependencies: {
            dep1: {
              name: "dep1",
              version: "1.2.0",
              files: {
                "src/A.sol": "contract A {}",
              },
            },
            "@cope/dep2": {
              name: "@cope/dep2",
              version: "1.2.0",
              files: {
                "remappings.txt": `foo/=bar/`,
                "foo/remappings.txt": `nope`,
              },
            },
          },
        };
        await using project = await useTestProjectTemplate(template);
        const graph = await RemappedNpmPackagesGraphImplementation.create(
          project.path,
        );

        const hhProjectPackage = graph.getHardhatProjectPackage();

        assert.deepEqual(graph.toJSON(), {
          hardhatProjectPackage: hhProjectPackage,
          packageByInputSourceNameRoot: {
            project: hhProjectPackage,
          },
          installationMap: {
            project: {},
          },
          userRemappingsPerPackage: {},
          generatedRemappingsIntoNpmFiles: {
            project: {},
          },
        });
      });
    });

    describe("resolveDependencyByInstallationName", () => {
      it("Should resolve a dependency by it's installation name", async () => {
        const template: TestProjectTemplate = {
          name: "resolve-dependency-by-installation-name",
          version: "1.2.4",
          files: {
            "contracts/A.sol": "contract A {}",
          },
          dependencies: {
            dep1: {
              name: "dep1",
              version: "1.2.0",
              files: {
                "src/A.sol": "contract A {}",
              },
            },
            otherName: {
              name: "real-name",
              version: "1.2.3",
              files: {},
              exports: {
                "./*.sol": "./src/*.sol",
              },
            },
            "@scope/dep2": {
              name: "no-scope",
              version: "1.1.1",
              files: {},
            },
          },
        };
        await using project = await useTestProjectTemplate(template);
        const graph = await RemappedNpmPackagesGraphImplementation.create(
          project.path,
        );
        const hhProjectPackage = graph.getHardhatProjectPackage();

        const result = await graph.resolveDependencyByInstallationName(
          hhProjectPackage,
          "dep1",
        );

        assert.deepEqual(result, {
          package: {
            name: "dep1",
            version: "1.2.0",
            rootFsPath: path.join(project.path, "node_modules/dep1"),
            inputSourceNameRoot: "npm/dep1@1.2.0",
            exports: undefined,
          },
          generatedRemapping: {
            context: "project/",
            prefix: "dep1/",
            target: "npm/dep1@1.2.0/",
          },
        });

        const resultWithOtherName =
          await graph.resolveDependencyByInstallationName(
            hhProjectPackage,
            "otherName",
          );

        assert.deepEqual(resultWithOtherName, {
          package: {
            name: "real-name",
            version: "1.2.3",
            rootFsPath: path.join(project.path, "node_modules/otherName"),
            inputSourceNameRoot: "npm/real-name@1.2.3",
            exports: {
              "./*.sol": "./src/*.sol",
            },
          },
          generatedRemapping: {
            context: "project/",
            prefix: "otherName/",
            target: "npm/real-name@1.2.3/",
          },
        });

        const resultWithScope = await graph.resolveDependencyByInstallationName(
          hhProjectPackage,
          "@scope/dep2",
        );

        assert.deepEqual(resultWithScope, {
          package: {
            name: "no-scope",
            version: "1.1.1",
            rootFsPath: path.join(project.path, "node_modules/@scope/dep2"),
            inputSourceNameRoot: "npm/no-scope@1.1.1",
            exports: undefined,
          },
          generatedRemapping: {
            context: "project/",
            prefix: "@scope/dep2/",
            target: "npm/no-scope@1.1.1/",
          },
        });
      });

      describe("Remappings", () => {
        it("Shouldn't load the remappings.txt files of a dependency", async () => {
          const template: TestProjectTemplate = {
            name: "no-remappings-loaded-on-resolution-of-dependency",
            version: "1.2.4",
            files: {},
            dependencies: {
              dep1: {
                name: "dep1",
                version: "1.2.0",
                files: {
                  "remappings.txt": `INVALID SYNTAX`,
                },
              },
            },
          };
          await using project = await useTestProjectTemplate(template);
          const graph = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );
          const hhProjectPackage = graph.getHardhatProjectPackage();

          const result = await graph.resolveDependencyByInstallationName(
            hhProjectPackage,
            "dep1",
          );

          assert.deepEqual(result, {
            package: {
              name: "dep1",
              version: "1.2.0",
              rootFsPath: path.join(project.path, "node_modules/dep1"),
              inputSourceNameRoot: "npm/dep1@1.2.0",
              exports: undefined,
            },
            generatedRemapping: {
              context: "project/",
              prefix: "dep1/",
              target: "npm/dep1@1.2.0/",
            },
          });

          const json = graph.toJSON();
          assert.deepEqual(
            json.userRemappingsPerPackage[result.package.inputSourceNameRoot],
            undefined,
          );
        });

        it("It should reuse the same remapping object if run twice", async () => {
          const template: TestProjectTemplate = {
            name: "reuse-remapping-object-on-resolution-of-dependency",
            version: "1.2.4",
            files: {},
            dependencies: {
              dep1: {
                name: "dep1",
                version: "1.2.0",
                files: {},
              },
            },
          };

          await using project = await useTestProjectTemplate(template);
          const graph = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );
          const hhProjectPackage = graph.getHardhatProjectPackage();

          const result = await graph.resolveDependencyByInstallationName(
            hhProjectPackage,
            "dep1",
          );

          const result2 = await graph.resolveDependencyByInstallationName(
            hhProjectPackage,
            "dep1",
          );

          assert.deepEqual(result, result2);

          assert.equal(result?.generatedRemapping, result2?.generatedRemapping);
        });
      });

      describe("Transitive dependencies", () => {
        it("It should load dependencies of dependencies, following npm resolution rules, except for duplicated dependencies", async () => {
          const template: TestProjectTemplate = {
            name: "transitive-dependencies",
            version: "1.0.0",
            files: {},
            dependencies: {
              "@openzeppelin/contracts": {
                name: "@openzeppelin/contracts",
                version: "4.8.0",
                files: {},
              },
              "dependency-with-ozc": {
                name: "dependency-with-ozc",
                version: "1.0.0",
                files: {},
                dependencies: {
                  "@openzeppelin/contracts": {
                    name: "@openzeppelin/contracts",
                    version: "4.7.0",
                    files: {},
                  },
                },
              },
              "dependency-with-peer-ozc": {
                name: "with-peer-ozc",
                version: "1.2.3",
                files: {},
                dependencies: {},
              },
              "dependency-with-transitive-dependency": {
                name: "dependency-with-transitive-dependency",
                version: "1.0.0",
                files: {},
                dependencies: {
                  "transitive-dependency": {
                    name: "transitive-dependency",
                    version: "1.0.0",
                    files: {},
                    dependencies: {},
                  },
                },
              },
              "with-duplicated-dependency": {
                name: "with-duplicated-dependency",
                version: "2.3.4",
                files: {},
                dependencies: {
                  // This dependency would normally be deduplicated by npm
                  "@openzeppelin/contracts": {
                    name: "@openzeppelin/contracts",
                    version: "4.8.0",
                    files: {},
                  },
                },
              },
            },
          };

          const project = await useTestProjectTemplate(template);
          const graph = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );
          const hhProjectPackage = graph.getHardhatProjectPackage();

          const ozcFromRoot = await graph.resolveDependencyByInstallationName(
            hhProjectPackage,
            "@openzeppelin/contracts",
          );

          assert.deepEqual(ozcFromRoot, {
            package: {
              name: "@openzeppelin/contracts",
              version: "4.8.0",
              rootFsPath: path.join(
                project.path,
                "node_modules/@openzeppelin/contracts",
              ),
              inputSourceNameRoot: "npm/@openzeppelin/contracts@4.8.0",
              exports: undefined,
            },
            generatedRemapping: {
              context: "project/",
              prefix: "@openzeppelin/contracts/",
              target: "npm/@openzeppelin/contracts@4.8.0/",
            },
          });

          const dependencyWithOzc =
            await graph.resolveDependencyByInstallationName(
              hhProjectPackage,
              "dependency-with-ozc",
            );

          assert.deepEqual(dependencyWithOzc, {
            package: {
              name: "dependency-with-ozc",
              version: "1.0.0",
              rootFsPath: path.join(
                project.path,
                "node_modules/dependency-with-ozc",
              ),
              inputSourceNameRoot: "npm/dependency-with-ozc@1.0.0",
              exports: undefined,
            },
            generatedRemapping: {
              context: "project/",
              prefix: "dependency-with-ozc/",
              target: "npm/dependency-with-ozc@1.0.0/",
            },
          });

          const dependencyWithOzcsOzc =
            await graph.resolveDependencyByInstallationName(
              dependencyWithOzc.package,
              "@openzeppelin/contracts",
            );

          assert.deepEqual(dependencyWithOzcsOzc, {
            package: {
              name: "@openzeppelin/contracts",
              version: "4.7.0",
              rootFsPath: path.join(
                dependencyWithOzc.package.rootFsPath,
                "node_modules/@openzeppelin/contracts",
              ),
              inputSourceNameRoot: "npm/@openzeppelin/contracts@4.7.0",
              exports: undefined,
            },
            generatedRemapping: {
              context: dependencyWithOzc.package.inputSourceNameRoot + "/",
              prefix: "@openzeppelin/contracts/",
              target: "npm/@openzeppelin/contracts@4.7.0/",
            },
          });

          const dependencyWithPeerOzc =
            await graph.resolveDependencyByInstallationName(
              hhProjectPackage,
              "dependency-with-peer-ozc",
            );

          assert.deepEqual(dependencyWithPeerOzc, {
            package: {
              name: "with-peer-ozc",
              version: "1.2.3",
              rootFsPath: path.join(
                project.path,
                "node_modules/dependency-with-peer-ozc",
              ),
              inputSourceNameRoot: "npm/with-peer-ozc@1.2.3",
              exports: undefined,
            },
            generatedRemapping: {
              context: "project/",
              prefix: "dependency-with-peer-ozc/",
              target: "npm/with-peer-ozc@1.2.3/",
            },
          });

          const dependencyWithPeerOzcsOzc =
            await graph.resolveDependencyByInstallationName(
              dependencyWithPeerOzc.package,
              "@openzeppelin/contracts",
            );

          assert.equal(dependencyWithPeerOzcsOzc?.package, ozcFromRoot.package);
          assert.deepEqual(dependencyWithPeerOzcsOzc?.generatedRemapping, {
            context: dependencyWithPeerOzc.package.inputSourceNameRoot + "/",
            prefix: "@openzeppelin/contracts/",
            target: "npm/@openzeppelin/contracts@4.8.0/",
          });

          const dependencyWithTransitiveDependency =
            await graph.resolveDependencyByInstallationName(
              hhProjectPackage,
              "dependency-with-transitive-dependency",
            );

          assert.deepEqual(dependencyWithTransitiveDependency, {
            package: {
              name: "dependency-with-transitive-dependency",
              version: "1.0.0",
              rootFsPath: path.join(
                project.path,
                "node_modules/dependency-with-transitive-dependency",
              ),
              inputSourceNameRoot:
                "npm/dependency-with-transitive-dependency@1.0.0",
              exports: undefined,
            },
            generatedRemapping: {
              context: "project/",
              prefix: "dependency-with-transitive-dependency/",
              target: "npm/dependency-with-transitive-dependency@1.0.0/",
            },
          });

          const transitiveDependency =
            await graph.resolveDependencyByInstallationName(
              dependencyWithTransitiveDependency.package,
              "transitive-dependency",
            );

          assert.deepEqual(transitiveDependency, {
            package: {
              name: "transitive-dependency",
              version: "1.0.0",
              rootFsPath: path.join(
                dependencyWithTransitiveDependency.package.rootFsPath,
                "node_modules/transitive-dependency",
              ),
              inputSourceNameRoot: "npm/transitive-dependency@1.0.0",
              exports: undefined,
            },
            generatedRemapping: {
              context:
                dependencyWithTransitiveDependency.package.inputSourceNameRoot +
                "/",
              prefix: "transitive-dependency/",
              target: "npm/transitive-dependency@1.0.0/",
            },
          });

          // If we have a duplicated dependency, we return the same instance of
          // the package that we load first. Not that duplicated here means same
          // name and version, not just name. Normally npm would deduplicate it.
          const withDuplicatedDependency =
            await graph.resolveDependencyByInstallationName(
              hhProjectPackage,
              "with-duplicated-dependency",
            );

          assert.deepEqual(withDuplicatedDependency, {
            package: {
              name: "with-duplicated-dependency",
              version: "2.3.4",
              rootFsPath: path.join(
                project.path,
                "node_modules/with-duplicated-dependency",
              ),
              inputSourceNameRoot: "npm/with-duplicated-dependency@2.3.4",
              exports: undefined,
            },
            generatedRemapping: {
              context: "project/",
              prefix: "with-duplicated-dependency/",
              target: "npm/with-duplicated-dependency@2.3.4/",
            },
          });

          const ozcFromWithDuplicatedDependency =
            await graph.resolveDependencyByInstallationName(
              withDuplicatedDependency.package,
              "@openzeppelin/contracts",
            );

          assert.deepEqual(ozcFromWithDuplicatedDependency, {
            package: {
              name: "@openzeppelin/contracts",
              version: "4.8.0",
              rootFsPath: path.join(
                hhProjectPackage.rootFsPath,
                "node_modules/@openzeppelin/contracts",
              ),
              inputSourceNameRoot: "npm/@openzeppelin/contracts@4.8.0",
              exports: undefined,
            },
            generatedRemapping: {
              context:
                withDuplicatedDependency.package.inputSourceNameRoot + "/",
              prefix: "@openzeppelin/contracts/",
              target: "npm/@openzeppelin/contracts@4.8.0/",
            },
          });
          assert.equal(
            ozcFromWithDuplicatedDependency?.package,
            ozcFromRoot.package,
          );
        });
      });

      it("Returns undefined if the dependency is not installed", async () => {
        const template: TestProjectTemplate = {
          name: "not-installed-dependencies",
          version: "1.0.0",
          files: {},
          dependencies: {
            dep1: {
              name: "dep1",
              version: "1.2.0",
              files: {},
            },
            "@scope/dep2": {
              name: "@scope/dep2",
              version: "1.3.0",
              files: {},
            },
          },
        };

        const project = await useTestProjectTemplate(template);
        const graph = await RemappedNpmPackagesGraphImplementation.create(
          project.path,
        );
        const hhProjectPackage = graph.getHardhatProjectPackage();

        const dep1 = await graph.resolveDependencyByInstallationName(
          hhProjectPackage,
          "dep1",
        );
        assert.ok(dep1 !== undefined, "dep1 should exist");

        const dep2 = await graph.resolveDependencyByInstallationName(
          hhProjectPackage,
          "@scope/dep2",
        );
        assert.ok(dep2 !== undefined, "dep2 should exist");

        assert.equal(
          await graph.resolveDependencyByInstallationName(
            hhProjectPackage,
            "dep3",
          ),
          undefined,
        );

        assert.equal(
          await graph.resolveDependencyByInstallationName(
            hhProjectPackage,
            "@scope/nope",
          ),
          undefined,
        );

        assert.equal(
          await graph.resolveDependencyByInstallationName(dep1.package, "foo"),
          undefined,
        );

        assert.equal(
          await graph.resolveDependencyByInstallationName(
            dep1.package,
            "@scope/nope",
          ),
          undefined,
        );

        assert.equal(
          await graph.resolveDependencyByInstallationName(dep2.package, "foo"),
          undefined,
        );

        assert.equal(
          await graph.resolveDependencyByInstallationName(
            dep2.package,
            "@scope/nope",
          ),
          undefined,
        );
      });

      describe("Monorepo support", () => {
        let monorepoPath: string;
        let hhProjectPath: string;
        let monorepoDependencyPath: string;
        before(async () => {
          monorepoPath = await mkdtemp("hh3-solidity-resolver-test-monorepo");
          hhProjectPath = path.join(monorepoPath, "packages", "hh-project");
          monorepoDependencyPath = path.join(
            monorepoPath,
            "packages",
            "monorepo-dependency",
          );

          await ensureDir(path.join(hhProjectPath, "node_modules"));
          await ensureDir(path.join(monorepoDependencyPath, "node_modules"));

          await writeJsonFile(path.join(hhProjectPath, "package.json"), {
            name: "hh-project",
            version: "1.3.4",
            dependencies: {
              "monorepo-dependency": "workspace:*",
            },
          });

          await writeJsonFile(
            path.join(monorepoDependencyPath, "package.json"),
            {
              name: "monorepo-dependency",
              version: "1.2.3",
              dependencies: {
                "hh-project": "workspace:*",
              },
            },
          );

          await symlink(
            monorepoDependencyPath,
            path.join(hhProjectPath, "node_modules", "dependency"),
          );

          await symlink(
            hhProjectPath,
            path.join(monorepoDependencyPath, "node_modules", "main"),
          );
        });

        after(async () => {
          await remove(monorepoPath);
        });

        it("Should use `local` as version numbers of monorepo packages when creating their input source name roots", async () => {
          const graph =
            await RemappedNpmPackagesGraphImplementation.create(hhProjectPath);

          const hhProjectPackage = graph.getHardhatProjectPackage();

          assert.deepEqual(hhProjectPackage, {
            name: "hh-project",
            version: "1.3.4",
            rootFsPath: hhProjectPath,
            inputSourceNameRoot: "project",
            exports: undefined,
          });

          const monorepoDependency =
            await graph.resolveDependencyByInstallationName(
              hhProjectPackage,
              "dependency",
            );

          assert.deepEqual(monorepoDependency, {
            package: {
              name: "monorepo-dependency",
              version: "local",
              rootFsPath: monorepoDependencyPath,
              inputSourceNameRoot: "npm/monorepo-dependency@local",
              exports: undefined,
            },
            generatedRemapping: {
              context: "project/",
              prefix: "dependency/",
              target: "npm/monorepo-dependency@local/",
            },
          });
        });

        it("Should resolve to the same hh package if a monorepo package imports the hh package itself through a circular dependency", async () => {
          const graph =
            await RemappedNpmPackagesGraphImplementation.create(hhProjectPath);

          const hhProjectPackage = graph.getHardhatProjectPackage();

          const monorepoDependency =
            await graph.resolveDependencyByInstallationName(
              hhProjectPackage,
              "dependency",
            );

          assert.ok(
            monorepoDependency !== undefined,
            "dependency should exist",
          );

          const hhProject = await graph.resolveDependencyByInstallationName(
            monorepoDependency.package,
            "main",
          );

          assert.equal(
            hhProject?.package,
            hhProjectPackage,
            "hh-project should be the hh project",
          );

          assert.deepEqual(hhProject?.generatedRemapping, {
            context: "npm/monorepo-dependency@local/",
            prefix: "main/",
            target: "project/",
          });
        });
      });
    });

    describe("generateRemappingIntoNpmFile", () => {
      const template: TestProjectTemplate = {
        name: "generate-remapping-into-npm-file",
        version: "1.0.0",
        files: {},
        dependencies: {
          dep: {
            name: "dependency",
            version: "1.0.0",
            files: {},
          },
        },
      };

      it("Should generate a remapping into a npm file, as provided in the args", async () => {
        const project = await useTestProjectTemplate(template);
        const graph = await RemappedNpmPackagesGraphImplementation.create(
          project.path,
        );
        const hhProjectPackage = graph.getHardhatProjectPackage();

        const dep = await graph.resolveDependencyByInstallationName(
          hhProjectPackage,
          "dep",
        );

        assert.ok(dep !== undefined, "dep should exist");

        const fromRootToDepFile1Sol = await graph.generateRemappingIntoNpmFile(
          hhProjectPackage,
          "dep1/file.sol",
          "npm/dep1@1.2.3/src/file.sol",
        );

        assert.deepEqual(fromRootToDepFile1Sol, {
          context: "project/",
          prefix: "dep1/file.sol",
          target: "npm/dep1@1.2.3/src/file.sol",
        });

        const fromDepToFooFile2Sol = await graph.generateRemappingIntoNpmFile(
          dep.package,
          "foo/file.sol",
          "npm/foo@1.2.3/file2.sol",
        );

        assert.deepEqual(fromDepToFooFile2Sol, {
          context: dep.package.inputSourceNameRoot + "/",
          prefix: "foo/file.sol",
          target: "npm/foo@1.2.3/file2.sol",
        });
      });

      it("Should reuse the same remapping object if run twice", async () => {
        const project = await useTestProjectTemplate(template);
        const graph = await RemappedNpmPackagesGraphImplementation.create(
          project.path,
        );
        const hhProjectPackage = graph.getHardhatProjectPackage();

        const fromRootToDepFile1Sol = await graph.generateRemappingIntoNpmFile(
          hhProjectPackage,
          "dep1/file.sol",
          "npm/dep1@1.2.3/src/file.sol",
        );

        const fromRootToDepFile1Sol2 = await graph.generateRemappingIntoNpmFile(
          hhProjectPackage,
          "dep1/file.sol",
          "npm/dep1@1.2.3/src/file.sol",
        );

        assert.equal(fromRootToDepFile1Sol, fromRootToDepFile1Sol2);
      });

      it("Should validate that the target matches if run twice", async () => {
        const project = await useTestProjectTemplate(template);
        const graph = await RemappedNpmPackagesGraphImplementation.create(
          project.path,
        );
        const hhProjectPackage = graph.getHardhatProjectPackage();

        await graph.generateRemappingIntoNpmFile(
          hhProjectPackage,
          "dep1/file.sol",
          "npm/dep1@1.2.3/src/file.sol",
        );

        await assertRejectsWithHardhatError(
          graph.generateRemappingIntoNpmFile(
            hhProjectPackage,
            "dep1/file.sol",
            "npm/dep1@1.2.3/src/no-no.sol",
          ),
          HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
          {
            message:
              "Trying to generate different remappings for the same direct import into an npm file",
          },
        );
      });
    });

    describe("selectBestUserRemapping", () => {
      describe("Remappings loading", () => {
        it("should load all the remappings.txt files in a package when it tries to select its first best user remapping", async () => {
          const template: TestProjectTemplate = {
            name: "load-all-remappings-txt-files",
            version: "1.0.0",
            files: {
              "remappings.txt": `foo/=bar/`,
              "lib/submodule/remappings.txt": `context/:prefix/=target/`,
              "contracts/A.sol": `import "dep1/B.sol";`,
            },
            dependencies: {
              dep1: {
                name: "dep1",
                version: "1.2.3",
                files: {
                  "B.sol": `import "dep2/C.sol";`,
                  "remappings.txt": `foo/=bar/`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(template);

          const expectedRemappings = {
            project: [
              {
                type: UserRemappingType.LOCAL,
                context: "project/lib/submodule/context/",
                prefix: "prefix/",
                target: "project/lib/submodule/target/",
                originalFormat: `context/:prefix/=target/`,
                source: path.join(project.path, "lib/submodule/remappings.txt"),
              },
              {
                type: UserRemappingType.LOCAL,
                context: "project/",
                prefix: "foo/",
                target: "project/bar/",
                originalFormat: `foo/=bar/`,
                source: path.join(project.path, "remappings.txt"),
              },
            ],
            // No remappings loaded for dep1, as we aren't selecting any from it
          };

          // When no remapping matches, we should load them anyways
          const firstMap = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );

          const firstHhProjectPackage = firstMap.getHardhatProjectPackage();
          const firstFile: ProjectResolvedFile = {
            type: ResolvedFileType.PROJECT_FILE,
            fsPath: path.join(project.path, "contracts/A.sol"),
            content: {
              text: `import "dep1/B.sol";`,
              importPaths: ["dep1/B.sol"],
              versionPragmas: [],
            },
            inputSourceName: "project/contracts/A.sol",
            package: firstHhProjectPackage,
          };

          assert.deepEqual(firstMap.toJSON().userRemappingsPerPackage, {});

          const firstBestRemapping = await firstMap.selectBestUserRemapping(
            firstFile,
            "./A.sol",
          );

          assert.deepEqual(firstBestRemapping, {
            success: true,
            value: undefined,
          });

          assert.deepEqual(
            firstMap.toJSON().userRemappingsPerPackage,
            expectedRemappings,
          );

          // When a remapping matches, we should load them too
          const secondMap = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );

          const secondHhProjectPackage = secondMap.getHardhatProjectPackage();
          const secondFile: ProjectResolvedFile = {
            ...firstFile,
            package: secondHhProjectPackage,
          };

          assert.deepEqual(secondMap.toJSON().userRemappingsPerPackage, {});

          const secondBestRemapping = await secondMap.selectBestUserRemapping(
            secondFile,
            "foo/B.sol",
          );

          assert.deepEqual(secondBestRemapping, {
            success: true,
            value: expectedRemappings.project[1],
          });

          assert.deepEqual(
            secondMap.toJSON().userRemappingsPerPackage,
            expectedRemappings,
          );
        });

        it("Should validate the remappings when loading them", async () => {
          // We test this on on a dependency remapping
          const template: TestProjectTemplate = {
            name: "validate-remappings-when-loading-them",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `import "dep1/B.sol";`,
            },
            dependencies: {
              dep1: {
                name: "dep1",
                version: "1.2.3",
                files: {
                  "B.sol": `import "dep2/C.sol";`,
                  "remappings.txt": `fooasd/`,
                  "lib/submodule/remappings.txt": `context/:prefix/=target`,
                },
              },
            },
          };

          const project = await useTestProjectTemplate(template);
          const graph = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );

          const hhProjectPackage = graph.getHardhatProjectPackage();
          const dep1 = await graph.resolveDependencyByInstallationName(
            hhProjectPackage,
            "dep1",
          );

          assert.ok(dep1 !== undefined, "dep1 should exist");

          const dep1Package = dep1.package;

          const dep1BSol: NpmPackageResolvedFile = {
            type: ResolvedFileType.NPM_PACKAGE_FILE,
            fsPath: path.join(dep1Package.rootFsPath, "B.sol"),
            content: {
              text: `import "dep2/C.sol";`,
              importPaths: ["dep2/C.sol"],
              versionPragmas: [],
            },
            inputSourceName: `${dep1Package.inputSourceNameRoot}/B.sol`,
            package: dep1Package,
          };

          const result = await graph.selectBestUserRemapping(
            dep1BSol,
            "dep2/C.sol",
          );

          assert.deepEqual(result, {
            success: false,
            error: [
              {
                type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
                source: path.join(
                  project.path,
                  "node_modules/dep1/remappings.txt",
                ),
                remapping: `fooasd/`,
              },
            ],
          });
        });

        it("should treat remappings with target starting in `node_modules/` as npm remappings, not loading them if not necessary", async () => {
          const template: TestProjectTemplate = {
            name: "treat-remappings-with-target-starting-in-node_modules-as-npm-remappings",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `import "d/B.sol";`,
              "remappings.txt": `foo/=bar/
d/=node_modules/dep1/src/
f/=node_modules/not-installed/src/`,
            },
            dependencies: {
              dep1: {
                name: "dep1",
                version: "1.2.3",
                files: {
                  "src/B.sol": ``,
                  // Present but not loaded
                  "remappings.txt": `d/=src/`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(template);

          const graph = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );

          const hhProjectPackage = graph.getHardhatProjectPackage();
          const contractsASol: ProjectResolvedFile = {
            type: ResolvedFileType.PROJECT_FILE,
            fsPath: path.join(project.path, "contracts/A.sol"),
            content: {
              text: `import "dep1/B.sol";`,
              importPaths: ["dep1/B.sol"],
              versionPragmas: [],
            },
            inputSourceName: "project/contracts/A.sol",
            package: hhProjectPackage,
          };

          const bestRemapping = await graph.selectBestUserRemapping(
            contractsASol,
            "nope",
          );

          assert.deepEqual(bestRemapping, {
            success: true,
            value: undefined,
          });

          assert.deepEqual(graph.toJSON().userRemappingsPerPackage, {
            project: [
              {
                type: UserRemappingType.LOCAL,
                context: "project/",
                prefix: "foo/",
                target: "project/bar/",
                originalFormat: `foo/=bar/`,
                source: path.join(project.path, "remappings.txt"),
              },
              {
                type: "UNRESOLVED_NPM",
                installationName: "dep1",
                context: "project/",
                prefix: "d/",
                target: "node_modules/dep1/src/",
                originalFormat: `d/=node_modules/dep1/src/`,
                source: path.join(project.path, "remappings.txt"),
              },
              {
                type: "UNRESOLVED_NPM",
                installationName: "not-installed",
                context: "project/",
                prefix: "f/",
                target: "node_modules/not-installed/src/",
                originalFormat: `f/=node_modules/not-installed/src/`,
                source: path.join(project.path, "remappings.txt"),
              },
            ],
          });
        });

        it("Should resolve npm remappings when it is the best user remapping", async () => {
          const template: TestProjectTemplate = {
            name: "load-npm-remappings-when-it-is-the-best-user-remapping",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `import "d/B.sol";`,
              "remappings.txt": `foo/=bar/
d/=node_modules/dep1/src/
f/=node_modules/not-installed/src/`,
            },
            dependencies: {
              dep1: {
                name: "dep1",
                version: "1.2.3",
                files: {
                  "src/B.sol": ``,
                  // Present but not loaded
                  "remappings.txt": `d/=src/`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(template);

          const graph = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );

          const hhProjectPackage = graph.getHardhatProjectPackage();
          const contractsASol: ProjectResolvedFile = {
            type: ResolvedFileType.PROJECT_FILE,
            fsPath: path.join(project.path, "contracts/A.sol"),
            content: {
              text: `import "dep1/B.sol";`,
              importPaths: ["dep1/B.sol"],
              versionPragmas: [],
            },
            inputSourceName: "project/contracts/A.sol",
            package: hhProjectPackage,
          };

          const bestRemapping = await graph.selectBestUserRemapping(
            contractsASol,
            "d/B.sol",
          );

          assert.deepEqual(bestRemapping, {
            success: true,
            value: {
              type: UserRemappingType.NPM,
              context: "project/",
              source: path.join(project.path, "remappings.txt"),
              prefix: "d/",
              target: "npm/dep1@1.2.3/src/",
              originalFormat: `d/=node_modules/dep1/src/`,
              targetNpmPackage: {
                installationName: "dep1",
                package: {
                  name: "dep1",
                  version: "1.2.3",
                  rootFsPath: path.join(project.path, "node_modules/dep1"),
                  inputSourceNameRoot: "npm/dep1@1.2.3",
                  exports: undefined,
                },
              },
            },
          });

          assert.deepEqual(graph.toJSON().userRemappingsPerPackage, {
            project: [
              {
                type: UserRemappingType.LOCAL,
                context: "project/",
                prefix: "foo/",
                target: "project/bar/",
                originalFormat: `foo/=bar/`,
                source: path.join(project.path, "remappings.txt"),
              },
              bestRemapping.value,
              {
                type: "UNRESOLVED_NPM",
                installationName: "not-installed",
                context: "project/",
                prefix: "f/",
                target: "node_modules/not-installed/src/",
                originalFormat: `f/=node_modules/not-installed/src/`,
                source: path.join(project.path, "remappings.txt"),
              },
            ],
            // While a remapping pointing to d1 is loaded and resolved, d1's
            // remappings aren't
          });
        });

        it("Should fail if npm remappings is the best user remapping, but it's not installed", async () => {
          const template: TestProjectTemplate = {
            name: "failed-on-uninstalled-npm-remapping-when-used",
            version: "1.0.0",
            files: {
              "contracts/A.sol": `import "d/B.sol";`,
              "remappings.txt": `foo/=bar/
d/=node_modules/dep1/src/
f/=node_modules/not-installed/src/`,
            },
            dependencies: {
              dep1: {
                name: "dep1",
                version: "1.2.3",
                files: {
                  "src/B.sol": ``,
                  // Present but not loaded
                  "remappings.txt": `d/=src/`,
                },
              },
            },
          };

          await using project = await useTestProjectTemplate(template);

          const graph = await RemappedNpmPackagesGraphImplementation.create(
            project.path,
          );

          const hhProjectPackage = graph.getHardhatProjectPackage();
          const contractsASol: ProjectResolvedFile = {
            type: ResolvedFileType.PROJECT_FILE,
            fsPath: path.join(project.path, "contracts/A.sol"),
            content: {
              text: `import "dep1/B.sol";`,
              importPaths: ["dep1/B.sol"],
              versionPragmas: [],
            },
            inputSourceName: "project/contracts/A.sol",
            package: hhProjectPackage,
          };

          const bestRemapping = await graph.selectBestUserRemapping(
            contractsASol,
            "f/C.sol",
          );

          assert.deepEqual(bestRemapping, {
            success: false,
            error: [
              {
                type: UserRemappingErrorType.REMAPPING_TO_UNINSTALLED_PACKAGE,
                remapping: `f/=node_modules/not-installed/src/`,
                source: path.join(project.path, "remappings.txt"),
              },
            ],
          });

          // The graph should be the same
          assert.deepEqual(graph.toJSON().userRemappingsPerPackage, {
            project: [
              {
                type: UserRemappingType.LOCAL,
                context: "project/",
                prefix: "foo/",
                target: "project/bar/",
                originalFormat: `foo/=bar/`,
                source: path.join(project.path, "remappings.txt"),
              },
              {
                type: "UNRESOLVED_NPM",
                installationName: "dep1",
                context: "project/",
                prefix: "d/",
                target: "node_modules/dep1/src/",
                originalFormat: `d/=node_modules/dep1/src/`,
                source: path.join(project.path, "remappings.txt"),
              },
              {
                type: "UNRESOLVED_NPM",
                installationName: "not-installed",
                context: "project/",
                prefix: "f/",
                target: "node_modules/not-installed/src/",
                originalFormat: `f/=node_modules/not-installed/src/`,
                source: path.join(project.path, "remappings.txt"),
              },
            ],
          });
        });

        describe("Special cases", () => {
          it("should ignore any remapping of the shape `prefix/=node_modules/prefix/", async () => {
            const template: TestProjectTemplate = {
              name: "ignore-remappings-of-the-shape-prefix-node_modules-prefix",
              version: "1.0.0",
              files: {
                "contracts/A.sol": `import "d/B.sol";`,
                "remappings.txt": `foo/=bar/
d/=node_modules/d/
context/:prefix/=node_modules/prefix/`,
              },
            };

            await using project = await useTestProjectTemplate(template);

            const graph = await RemappedNpmPackagesGraphImplementation.create(
              project.path,
            );

            const hhProjectPackage = graph.getHardhatProjectPackage();
            const contractsASol: ProjectResolvedFile = {
              type: ResolvedFileType.PROJECT_FILE,
              fsPath: path.join(project.path, "contracts/A.sol"),
              content: {
                text: ``,
                importPaths: [],
                versionPragmas: [],
              },
              inputSourceName: "project/contracts/A.sol",
              package: hhProjectPackage,
            };

            const bestRemapping = await graph.selectBestUserRemapping(
              contractsASol,
              "nope/B.sol",
            );

            assert.deepEqual(bestRemapping, {
              success: true,
              value: undefined,
            });

            assert.deepEqual(graph.toJSON().userRemappingsPerPackage, {
              project: [
                {
                  type: UserRemappingType.LOCAL,
                  context: "project/",
                  prefix: "foo/",
                  target: "project/bar/",
                  originalFormat: `foo/=bar/`,
                  source: path.join(project.path, "remappings.txt"),
                },
              ],
            });
          });

          it("Should return an invalid syntax error if the target starts with `node_modules/` but it's not a valid npm package", async () => {
            const template: TestProjectTemplate = {
              name: "invalid-npm-package-target",
              version: "1.0.0",
              files: {
                "contracts/A.sol": ``,
                "remappings.txt": `foo/=node_modules/@scope/`,
              },
            };
            await using project = await useTestProjectTemplate(template);

            const graph = await RemappedNpmPackagesGraphImplementation.create(
              project.path,
            );

            const hhProjectPackage = graph.getHardhatProjectPackage();
            const contractsASol: ProjectResolvedFile = {
              type: ResolvedFileType.PROJECT_FILE,
              fsPath: path.join(project.path, "contracts/A.sol"),
              content: {
                text: ``,
                importPaths: [],
                versionPragmas: [],
              },
              inputSourceName: "project/contracts/A.sol",
              package: hhProjectPackage,
            };

            const bestRemapping = await graph.selectBestUserRemapping(
              contractsASol,
              "nope/B.sol",
            );

            assert.deepEqual(bestRemapping, {
              success: false,
              error: [
                {
                  type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
                  source: path.join(project.path, "remappings.txt"),
                  remapping: `foo/=node_modules/@scope/`,
                },
              ],
            });
          });

          it("Should not modify the context nor target of remappings starting with npm/", async () => {
            const template: TestProjectTemplate = {
              name: "respect-npmslash-fragments-in-remappings",
              version: "1.0.0",
              files: {
                "contracts/A.sol": ``,
                "remappings.txt": `npm/dep@1.2.3/:foo/=bar/
context/:foo/=npm/bar@1.3.4/src/`,
              },
            };

            await using project = await useTestProjectTemplate(template);

            const graph = await RemappedNpmPackagesGraphImplementation.create(
              project.path,
            );

            const hhProjectPackage = graph.getHardhatProjectPackage();
            const contractsASol: ProjectResolvedFile = {
              type: ResolvedFileType.PROJECT_FILE,
              fsPath: path.join(project.path, "contracts/A.sol"),
              content: {
                text: ``,
                importPaths: [],
                versionPragmas: [],
              },
              inputSourceName: "project/contracts/A.sol",
              package: hhProjectPackage,
            };

            const bestRemapping = await graph.selectBestUserRemapping(
              contractsASol,
              "nope/B.sol",
            );

            assert.deepEqual(bestRemapping, {
              success: true,
              value: undefined,
            });

            assert.deepEqual(graph.toJSON().userRemappingsPerPackage, {
              project: [
                {
                  type: UserRemappingType.LOCAL,
                  context: "npm/dep@1.2.3/",
                  prefix: "foo/",
                  target: "project/bar/",
                  originalFormat: `npm/dep@1.2.3/:foo/=bar/`,
                  source: path.join(project.path, "remappings.txt"),
                },
                {
                  type: UserRemappingType.LOCAL,
                  context: "project/context/",
                  prefix: "foo/",
                  target: "npm/bar@1.3.4/src/",
                  originalFormat: `context/:foo/=npm/bar@1.3.4/src/`,
                  source: path.join(project.path, "remappings.txt"),
                },
              ],
            });
          });

          it("Should add a trailing slash to the prefix and target if they don't have it", async () => {
            const template: TestProjectTemplate = {
              name: "add-trailing-slash-to-prefix-and-target",
              version: "1.0.0",
              files: {
                "contracts/A.sol": `A`,
                "remappings.txt": `contr:foo=bar
contr:to-npm=node_modules/dep/contracts`,
              },
              dependencies: {
                dep: {
                  name: "dep",
                  version: "1.2.3",
                  files: {
                    "contracts/A.sol": `A`,
                  },
                },
              },
            };

            const project = await useTestProjectTemplate(template);
            const graph = await RemappedNpmPackagesGraphImplementation.create(
              project.path,
            );
            const hhProjectPackage = graph.getHardhatProjectPackage();

            const contractsASol: ProjectResolvedFile = {
              type: ResolvedFileType.PROJECT_FILE,
              fsPath: path.join(project.path, "contracts/A.sol"),
              content: {
                text: `import "dep1/B.sol";`,
                importPaths: ["dep1/B.sol"],
                versionPragmas: [],
              },
              inputSourceName: "project/contracts/A.sol",
              package: hhProjectPackage,
            };

            const fooRemappingResult = await graph.selectBestUserRemapping(
              contractsASol,
              "foo/B.sol",
            );
            assert.deepEqual(fooRemappingResult, {
              success: true,
              value: {
                type: UserRemappingType.LOCAL,
                context: "project/contr",
                prefix: "foo/",
                target: "project/bar/",
                originalFormat: `contr:foo=bar`,
                source: path.join(project.path, "remappings.txt"),
              },
            });

            const fooRemappingWithoutSlashResult =
              await graph.selectBestUserRemapping(contractsASol, "foo");
            assert.deepEqual(fooRemappingWithoutSlashResult, {
              success: true,
              value: undefined,
            });

            const toNpmRemappingResult = await graph.selectBestUserRemapping(
              contractsASol,
              "to-npm/B.sol",
            );
            assert.deepEqual(toNpmRemappingResult, {
              success: true,
              value: {
                type: UserRemappingType.NPM,
                context: "project/contr",
                prefix: "to-npm/",
                target: "npm/dep@1.2.3/contracts/",
                originalFormat: `contr:to-npm=node_modules/dep/contracts`,
                source: path.join(project.path, "remappings.txt"),
                targetNpmPackage: {
                  installationName: "dep",
                  package: {
                    name: "dep",
                    version: "1.2.3",
                    rootFsPath: path.join(project.path, "node_modules/dep"),
                    inputSourceNameRoot: "npm/dep@1.2.3",
                    exports: undefined,
                  },
                },
              },
            });

            const toNpmRemappingWithoutSlashResult =
              await graph.selectBestUserRemapping(contractsASol, "to-npm");
            assert.deepEqual(toNpmRemappingWithoutSlashResult, {
              success: true,
              value: undefined,
            });
          });
        });
      });
    });
  });
});

describe("isResolvedUserRemapping", () => {
  it("Should return true if the remapping is a resolved user remapping", () => {
    const resolvedNpmRemapping: ResolvedUserRemapping = {
      type: UserRemappingType.NPM,
      context: "context",
      prefix: "prefix",
      target: "target",
      originalFormat: "originalFormat",
      source: "source",
      targetNpmPackage: {
        installationName: "installationName",
        package: {
          name: "name",
          version: "version",
          rootFsPath: "rootFsPath",
          inputSourceNameRoot: "inputSourceNameRoot",
          exports: undefined,
        },
      },
    };

    assert.ok(
      isResolvedUserRemapping(resolvedNpmRemapping),
      "Should be true for a resolved npm user remapping",
    );

    const localRemapping: ResolvedUserRemapping = {
      type: UserRemappingType.LOCAL,
      context: "context",
      prefix: "prefix",
      target: "target",
      originalFormat: "originalFormat",
      source: "source",
    };

    assert.ok(
      isResolvedUserRemapping(localRemapping),
      "Should be true for a local user remapping",
    );
  });

  it("Should return false for a plain remapping", () => {
    const plainRemapping: Remapping = {
      context: "context",
      prefix: "prefix",
      target: "target",
    };

    assert.ok(
      !isResolvedUserRemapping(plainRemapping),
      "Should be false for a plain remapping",
    );
  });
});
