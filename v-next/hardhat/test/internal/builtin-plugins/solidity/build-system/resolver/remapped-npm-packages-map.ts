import type { TestProjectTemplate } from "./helpers.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import { RemappedNpmPackagesMap } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/remapped-npm-packages-map.js";
import { UserRemappingErrorType } from "../../../../../../src/types/solidity.js";

import { useTestProjectTemplate } from "./helpers.js";

describe.only("RemappedNpmPackagesMap", () => {
  describe("Map intialization", () => {
    describe("Without dependencies and remappings", () => {
      it("Should initialize a map with the right hardhat project package", async () => {
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

        const result = await RemappedNpmPackagesMap.create(project.path);
        assert.equal(result.success, true);
        const map = result.value;

        assert.equal(map.hardhatProjectPackage.rootFsPath, project.path);
        assert.equal(map.hardhatProjectPackage.rootSourceName, "project");
        assert.equal(map.hardhatProjectPackage.name, template.name);
        assert.equal(map.hardhatProjectPackage.version, template.version);
        assert.deepEqual(map.hardhatProjectPackage.exports, template.exports);
        assert.deepEqual(map.getUserRemappings(map.hardhatProjectPackage), []);

        await using projectWithOutPackageExports = await useTestProjectTemplate(
          {
            ...template,
            exports: undefined,
          },
        );

        const result2 = await RemappedNpmPackagesMap.create(
          projectWithOutPackageExports.path,
        );
        assert.equal(result2.success, true);
        const map2 = result2.value;
        assert.equal(
          map2.hardhatProjectPackage.rootFsPath,
          projectWithOutPackageExports.path,
        );
        assert.equal(map2.hardhatProjectPackage.exports, undefined);
      });
    });

    describe("Remappings loading", () => {
      describe("Validation", () => {
        it("Should fail if the remappings.txt file has invalid syntax", async () => {
          const template: TestProjectTemplate = {
            name: "invalid-remappings-syntax",
            version: "1.2.4",
            files: {
              "contracts/A.sol": "contract A {}",
              "remappings.txt": "invalid syntax",
            },
          };

          await using project = await useTestProjectTemplate(template);

          let result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, false);
          assert.deepEqual(result.error, [
            {
              type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
              source: path.join(project.path, "remappings.txt"),
              remapping: "invalid syntax",
            },
          ]);

          await writeUtf8File(
            path.join(project.path, "remappings.txt"),
            `foo/=bar/
asd`,
          );
          result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, false);
          assert.deepEqual(result.error, [
            {
              type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
              source: path.join(project.path, "remappings.txt"),
              remapping: "asd",
            },
          ]);
        });

        it("Should fail if the prefix doesn't end in /", async () => {
          const template: TestProjectTemplate = {
            name: "prefix-no-slash",
            version: "1.2.4",
            files: {
              "remappings.txt": "foo=bar/",
            },
          };

          await using project = await useTestProjectTemplate(template);

          const result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, false);
          assert.deepEqual(result.error, [
            {
              type: UserRemappingErrorType.ILLEGAL_REMAPPING_WIHTOUT_SLASH_ENDINGS,
              source: path.join(project.path, "remappings.txt"),
              remapping: "foo=bar/",
            },
          ]);
        });

        it("Should fail if the target doesn't end in /", async () => {
          const template: TestProjectTemplate = {
            name: "target-no-slash",
            version: "1.2.4",
            files: {
              "remappings.txt": "foo/=bar",
            },
          };

          await using project = await useTestProjectTemplate(template);

          const result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, false);
          assert.deepEqual(result.error, [
            {
              type: UserRemappingErrorType.ILLEGAL_REMAPPING_WIHTOUT_SLASH_ENDINGS,
              source: path.join(project.path, "remappings.txt"),
              remapping: "foo/=bar",
            },
          ]);
        });

        it("Should fail if it has a context and it doesn't end in /", async () => {
          const template: TestProjectTemplate = {
            name: "context-no-slash",
            version: "1.2.4",
            files: {
              "remappings.txt": "asd:foo/=bar/",
            },
          };

          await using project = await useTestProjectTemplate(template);

          const result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, false);
          assert.deepEqual(result.error, [
            {
              type: UserRemappingErrorType.ILLEGAL_REMAPPING_WIHTOUT_SLASH_ENDINGS,
              source: path.join(project.path, "remappings.txt"),
              remapping: "asd:foo/=bar/",
            },
          ]);
        });
      });

      it("Should ignore empty lines, trim with spaces and tabs, and ignore comments and give the right results", async () => {
        const template: TestProjectTemplate = {
          name: "empty-lines-and-comments",
          version: "1.2.4",
          files: {
            "remappings.txt": `#  foo/=bar/ 
              
 # foo/=bar2/ 

 #  context/:prefix/=target/ 
`,
          },
        };

        await using project = await useTestProjectTemplate(template);

        const result = await RemappedNpmPackagesMap.create(project.path);
        assert.equal(result.success, true);
        const map = result.value;

        assert.deepEqual(map.getUserRemappings(map.hardhatProjectPackage), []);
      });

      describe("With remappings.txt in the root", () => {
        it("Should update the remappings fragments according to the root source name and the path to the remappings.txt file", async () => {
          const template: TestProjectTemplate = {
            name: "top-level-remappings",
            version: "1.2.4",
            files: {
              "remappings.txt": `  foo/=bar/ 
              
 # foo/=bar2/ 

   context/:prefix/=target/ 
`,
            },
          };

          await using project = await useTestProjectTemplate(template);

          const result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, true);
          const map = result.value;

          assert.deepEqual(map.getUserRemappings(map.hardhatProjectPackage), [
            {
              context: "project/",
              prefix: "foo/",
              target: "project/bar/",
              originalFormat: "foo/=bar/",
              source: path.join(project.path, "remappings.txt"),
            },
            {
              context: "project/context/",
              prefix: "prefix/",
              target: "project/target/",
              originalFormat: "context/:prefix/=target/",
              source: path.join(project.path, "remappings.txt"),
            },
          ]);
        });
      });

      describe("With remappings.txt in other directories", () => {
        it("Should also validate and report their errors", async () => {
          const template: TestProjectTemplate = {
            name: "nested-remappings-errors",
            version: "1.2.4",
            files: {
              "lib/submodule/remappings.txt": `foo/=bar`,
            },
          };

          await using project = await useTestProjectTemplate(template);

          const result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, false);
          assert.deepEqual(result.error, [
            {
              type: UserRemappingErrorType.ILLEGAL_REMAPPING_WIHTOUT_SLASH_ENDINGS,
              // The path should be correct here, not the project root's remappings
              source: path.join(project.path, "lib/submodule/remappings.txt"),
              remapping: "foo/=bar",
            },
          ]);
        });

        it("Should update the remappings fragments according to the root source name and the path to the remappings.txt file", async () => {
          const template: TestProjectTemplate = {
            name: "nested-remappings",
            version: "1.2.4",
            files: {
              "lib/submodule/remappings.txt": `  foo/=bar/ 
              
 # foo/=bar2/ 

   context/:prefix/=target/ 
`,
            },
          };

          await using project = await useTestProjectTemplate(template);

          const result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, true);
          const map = result.value;

          assert.deepEqual(map.getUserRemappings(map.hardhatProjectPackage), [
            {
              context: "project/lib/submodule/",
              prefix: "foo/",
              target: "project/lib/submodule/bar/",
              originalFormat: "foo/=bar/",
              source: path.join(project.path, "lib/submodule/remappings.txt"),
            },
            {
              context: "project/lib/submodule/context/",
              prefix: "prefix/",
              target: "project/lib/submodule/target/",
              originalFormat: "context/:prefix/=target/",
              source: path.join(project.path, "lib/submodule/remappings.txt"),
            },
          ]);
        });

        it("Should merge the top level and the nested remappings", async () => {
          const template: TestProjectTemplate = {
            name: "merge-nested-remappings",
            version: "1.2.4",
            files: {
              "remappings.txt": `foo/=bar/`,
              "lib/submodule/remappings.txt": `context/:prefix/=target/`,
              "lib/submodule2/remappings.txt": `context/:prefix/=target/`,
            },
          };

          await using project = await useTestProjectTemplate(template);

          const result = await RemappedNpmPackagesMap.create(project.path);
          assert.equal(result.success, true);
          const map = result.value;

          assert.deepEqual(map.getUserRemappings(map.hardhatProjectPackage), [
            {
              context: "project/lib/submodule/context/",
              prefix: "prefix/",
              target: "project/lib/submodule/target/",
              originalFormat: "context/:prefix/=target/",
              source: path.join(project.path, "lib/submodule/remappings.txt"),
            },
            {
              context: "project/lib/submodule2/context/",
              prefix: "prefix/",
              target: "project/lib/submodule2/target/",
              originalFormat: "context/:prefix/=target/",
              source: path.join(project.path, "lib/submodule2/remappings.txt"),
            },
            {
              context: "project/",
              prefix: "foo/",
              target: "project/bar/",
              originalFormat: "foo/=bar/",
              source: path.join(project.path, "remappings.txt"),
            },
          ]);
        });
      });

      describe("With npm remappings", () => {
        describe("In the project", () => {
          describe("Validation", () => {
            it("Should fail if the npm remapping has invaid syntax", async () => {
              const template: TestProjectTemplate = {
                name: "invalid-npm-remapping-syntax",
                version: "1.2.4",
                files: {
                  "remappings.txt": `foo/=node_modules/@only-scope/`,
                },
              };

              await using project = await useTestProjectTemplate(template);
              const result = await RemappedNpmPackagesMap.create(project.path);
              assert.equal(result.success, false);
              assert.deepEqual(result.error, [
                {
                  type: UserRemappingErrorType.REMAPPING_WITH_INVALID_SYNTAX,
                  source: path.join(project.path, "remappings.txt"),
                  remapping: "foo/=node_modules/@only-scope/",
                },
              ]);
            });
          });

          it("Should ignore the node_modules/ prfix and treat the rest as an npm path", async () => {
            const template: TestProjectTemplate = {
              name: "npm-remappings-target-prefix",
              version: "1.2.4",
              files: {
                "remappings.txt": `@uniswap/core/=node_modules/@uniswap/core/src/
no-scope/=node_modules/no-scope/src/`,
              },
              dependencies: {
                "@uniswap/core": {
                  name: "@uniswap/core",
                  version: "1.0.0",
                  files: {
                    "src/A.sol": "contract A {}",
                  },
                },
                "no-scope": {
                  name: "no-scope",
                  version: "1.2.0",
                  files: {
                    "src/B.sol": "contract B {}",
                  },
                },
              },
            };

            await using project = await useTestProjectTemplate(template);

            const result = await RemappedNpmPackagesMap.create(project.path);
            assert.equal(result.success, true);
            const map = result.value;

            assert.deepEqual(map.getUserRemappings(map.hardhatProjectPackage), [
              {
                context: "project/",
                prefix: "@uniswap/core/",
                target: "npm/@uniswap/core@1.0.0/src/",
                originalFormat:
                  "@uniswap/core/=node_modules/@uniswap/core/src/",
                source: path.join(project.path, "remappings.txt"),
                targetNpmPackage: {
                  installationName: "@uniswap/core",
                  package: {
                    name: "@uniswap/core",
                    version: "1.0.0",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/@uniswap/core",
                    ),
                    rootSourceName: "npm/@uniswap/core@1.0.0",
                    exports: undefined,
                  },
                },
              },
              {
                context: "project/",
                prefix: "no-scope/",
                target: "npm/no-scope@1.2.0/src/",
                originalFormat: "no-scope/=node_modules/no-scope/src/",
                source: path.join(project.path, "remappings.txt"),
                targetNpmPackage: {
                  installationName: "no-scope",
                  package: {
                    name: "no-scope",
                    version: "1.2.0",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/no-scope",
                    ),
                    rootSourceName: "npm/no-scope@1.2.0",
                    exports: undefined,
                  },
                },
              },
            ]);
          });

          it("should ignore any npm remappings that is of the shape prefix/=node_modules/prefix/", async () => {
            const template: TestProjectTemplate = {
              name: "ignore-nop-npm-remappings",
              version: "1.2.4",
              files: {
                "remappings.txt": `foo/=node_modules/foo/`,
              },
            };

            await using project = await useTestProjectTemplate(template);

            const result = await RemappedNpmPackagesMap.create(project.path);
            assert.equal(result.success, true);
            const map = result.value;

            assert.deepEqual(
              map.getUserRemappings(map.hardhatProjectPackage),
              [],
            );
          });

          it("should support dependencies installed with a different name than the one declared in the package.json file", async () => {
            const template: TestProjectTemplate = {
              name: "different-installation-name",
              version: "1.2.4",
              files: {
                "remappings.txt": `
scoped-package/=node_modules/scoped-package/src/
top-scope-name/=node_modules/@top-scope/name/src/
nope/=node_modules/no-scope/
`,
              },
              dependencies: {
                "scoped-package": {
                  name: "@scope/name",
                  version: "1.2.0",
                  files: {
                    "src/A.sol": "contract A {}",
                  },
                },
                "@top-scope/name": {
                  name: "other-name",
                  version: "1.3.0",
                  files: {
                    "src/B.sol": "contract B {}",
                  },
                },
                "no-scope": {
                  name: "no-scope-2",
                  version: "1.4.0",
                  files: {
                    "src/C.sol": "contract C {}",
                  },
                  exports: {
                    "./*.sol": "./src/*.sol",
                  },
                },
              },
            };

            await using project = await useTestProjectTemplate(template);

            const result = await RemappedNpmPackagesMap.create(project.path);
            assert.equal(result.success, true);
            const map = result.value;

            assert.deepEqual(map.getUserRemappings(map.hardhatProjectPackage), [
              {
                context: "project/",
                prefix: "scoped-package/",
                target: "npm/@scope/name@1.2.0/src/",
                originalFormat:
                  "scoped-package/=node_modules/scoped-package/src/",
                source: path.join(project.path, "remappings.txt"),
                targetNpmPackage: {
                  installationName: "scoped-package",
                  package: {
                    name: "@scope/name",
                    version: "1.2.0",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/scoped-package",
                    ),
                    rootSourceName: "npm/@scope/name@1.2.0",
                    exports: undefined,
                  },
                },
              },
              {
                context: "project/",
                prefix: "top-scope-name/",
                target: "npm/other-name@1.3.0/src/",
                originalFormat:
                  "top-scope-name/=node_modules/@top-scope/name/src/",
                source: path.join(project.path, "remappings.txt"),
                targetNpmPackage: {
                  installationName: "@top-scope/name",
                  package: {
                    name: "other-name",
                    version: "1.3.0",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/@top-scope/name",
                    ),
                    rootSourceName: "npm/other-name@1.3.0",
                    exports: undefined,
                  },
                },
              },
              {
                context: "project/",
                prefix: "nope/",
                target: "npm/no-scope-2@1.4.0/",
                originalFormat: "nope/=node_modules/no-scope/",
                source: path.join(project.path, "remappings.txt"),
                targetNpmPackage: {
                  installationName: "no-scope",
                  package: {
                    name: "no-scope-2",
                    version: "1.4.0",
                    rootFsPath: path.join(
                      project.path,
                      "node_modules/no-scope",
                    ),
                    rootSourceName: "npm/no-scope-2@1.4.0",
                    exports: {
                      "./*.sol": "./src/*.sol",
                    },
                  },
                },
              },
            ]);
          });

          it("Should resolve each npm package once, reusing the same instance of the package and the remappings", async () => {
            const template: TestProjectTemplate = {
              name: "resuse-project",
              version: "1.2.4",
              files: {
                "remappings.txt": `dep1/=node_modules/dep1/src/

dep1bis/=node_modules/dep1/src/`,
                "lib/submodule/remappings.txt": `dep1/=node_modules/dep1/src2/`,
              },
              dependencies: {
                dep1: {
                  name: "dep1",
                  version: "1.2.0",
                  files: {
                    "src/A.sol": "contract A {}",
                  },
                },
              },
            };

            await using project = await useTestProjectTemplate(template);

            const result = await RemappedNpmPackagesMap.create(project.path);
            assert.equal(result.success, true);
            const map = result.value;

            const expectedPackage = {
              name: "dep1",
              version: "1.2.0",
              rootFsPath: path.join(project.path, "node_modules/dep1"),
              rootSourceName: "npm/dep1@1.2.0",
              exports: undefined,
            };

            const remappings = map.getUserRemappings(map.hardhatProjectPackage);

            assert.deepEqual(remappings, [
              {
                context: "project/lib/submodule/",
                prefix: "dep1/",
                target: "npm/dep1@1.2.0/src2/",
                originalFormat: "dep1/=node_modules/dep1/src2/",
                source: path.join(project.path, "lib/submodule/remappings.txt"),
                targetNpmPackage: {
                  installationName: "dep1",
                  package: expectedPackage,
                },
              },
              {
                context: "project/",
                prefix: "dep1/",
                target: "npm/dep1@1.2.0/src/",
                originalFormat: "dep1/=node_modules/dep1/src/",
                source: path.join(project.path, "remappings.txt"),
                targetNpmPackage: {
                  installationName: "dep1",
                  package: expectedPackage,
                },
              },
              {
                context: "project/",
                prefix: "dep1bis/",
                target: "npm/dep1@1.2.0/src/",
                originalFormat: "dep1bis/=node_modules/dep1/src/",
                source: path.join(project.path, "remappings.txt"),
                targetNpmPackage: {
                  installationName: "dep1",
                  package: expectedPackage,
                },
              },
            ]);

            assert.equal(
              remappings[0].targetNpmPackage.package,
              remappings[1].targetNpmPackage.package,
            );

            assert.equal(
              remappings[1].targetNpmPackage.package,
              remappings[2].targetNpmPackage.package,
            );

            assert.equal(
              remappings[0],
              map.getUserRemappings(map.hardhatProjectPackage)[0],
            );

            assert.equal(
              remappings[1],
              map.getUserRemappings(map.hardhatProjectPackage)[1],
            );

            assert.equal(
              remappings[2],
              map.getUserRemappings(map.hardhatProjectPackage)[2],
            );
          });
        });

        describe("With npm remappings in a dependency", () => {});
      });
    });
  });
});
