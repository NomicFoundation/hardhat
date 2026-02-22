import type { SolidityBuildProfileConfig } from "../../../../../src/types/config.js";
import type {
  ProjectResolvedFile,
  ResolvedNpmPackage,
} from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { DependencyGraphImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import { SolcConfigSelector } from "../../../../../src/internal/builtin-plugins/solidity/build-system/solc-config-selection.js";
import {
  CompilationJobCreationErrorReason,
  ResolvedFileType,
} from "../../../../../src/types/solidity.js";

const testHardhatProjectNpmPackage: ResolvedNpmPackage = {
  name: "hardhat-project",
  version: "1.2.3",
  rootFsPath: "/Users/root/",
  inputSourceNameRoot: "project",
};

function createProjectResolvedFile(
  relativePath: string,
  versionPragmas: string[],
): ProjectResolvedFile {
  return {
    type: ResolvedFileType.PROJECT_FILE,
    inputSourceName: relativePath,
    fsPath: path.join(process.cwd(), relativePath),
    content: {
      text: "",
      importPaths: [],
      versionPragmas,
    },
    package: testHardhatProjectNpmPackage,
  };
}

describe("SolcConfigSelector", () => {
  const buildProfileName: string = "default";

  let buildProfile: SolidityBuildProfileConfig;
  let root: ProjectResolvedFile;
  let dependencyGraph: DependencyGraphImplementation;

  beforeEach(() => {
    buildProfile = {
      compilers: [],
      overrides: {},
      isolated: false,
      preferWasm: false,
    };
    root = createProjectResolvedFile("root.sol", ["^0.8.0"]);
    dependencyGraph = new DependencyGraphImplementation();
    dependencyGraph.addRootFile(root.inputSourceName, root);
  });

  describe("selectBestSolcConfigForSingleRootGraph", () => {
    it("should throw when given a subgraph of size greater than 1", async () => {
      dependencyGraph.addRootFile(
        "otherRoot",
        createProjectResolvedFile(
          "other-root.sol",
          root.content.versionPragmas,
        ),
      );
      const selector = new SolcConfigSelector(buildProfileName, buildProfile);

      await assertRejectsWithHardhatError(
        async () => {
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);
        },
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message: "This method only works for single root graphs",
        },
      );
    });

    it("should throw when given a subgraph of size 0", async () => {
      const emptyDependencyGraph = new DependencyGraphImplementation();

      const selector = new SolcConfigSelector(buildProfileName, buildProfile);

      await assertRejectsWithHardhatError(
        async () => {
          selector.selectBestSolcConfigForSingleRootGraph(emptyDependencyGraph);
        },
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message: "This method only works for single root graphs",
        },
      );
    });

    describe("with a compiler override", () => {
      it("should return the compiler if it satisfies the version range ", () => {
        buildProfile.overrides[root.inputSourceName] = {
          version: "0.8.0",
          settings: {},
        };

        const selector = new SolcConfigSelector(buildProfileName, buildProfile);
        const config =
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

        assert.deepEqual(config, buildProfile.overrides[root.inputSourceName]);
      });

      it("should return the compiler if it satisfies the version range of root and dependencies", () => {
        buildProfile.overrides[root.inputSourceName] = {
          version: "0.8.5",
          settings: {},
        };

        const dependency = createProjectResolvedFile("dependency.sol", [
          ">=0.8.0",
        ]);
        dependencyGraph.addDependency(root, dependency);

        const selector = new SolcConfigSelector(buildProfileName, buildProfile);
        const config =
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

        assert.deepEqual(config, buildProfile.overrides[root.inputSourceName]);
      });

      describe("if it does not satisfy the version range", () => {
        it("should return incompatible override error if it does not satisfy the root version range", () => {
          buildProfile.overrides[root.inputSourceName] = {
            version: "0.7.0",
            settings: {},
          };

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            formattedReason:
              "An override with incompatible solc version was found for this file.",
          });
        });

        it("should return overridden version incompatible with dependency error if dependency pragmas are incompatible with the override version", () => {
          buildProfile.overrides[root.inputSourceName] = {
            version: "0.8.0",
            settings: {},
          };

          const dependency = createProjectResolvedFile("dependency.sol", [
            "^0.7.0",
          ]);
          dependencyGraph.addDependency(root, dependency);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.OVERRIDDEN_SOLC_VERSION_INCOMPATIBLE_WITH_DEPENDENCY,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dependency.fsPath],
            formattedReason: `The compiler version override is incompatible with a dependency of this file:\n  * .${path.sep}${path.relative(process.cwd(), root.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dependency.fsPath)}`,
          });
        });

        it("should return overridden version incompatible with dependency error for a transitive dependency", () => {
          buildProfile.overrides[root.inputSourceName] = {
            version: "0.8.0",
            settings: {},
          };

          const dep1 = createProjectResolvedFile("dep1.sol", ["^0.8.0"]);
          const dep2 = createProjectResolvedFile("dep2.sol", ["^0.7.0"]);
          dependencyGraph.addDependency(root, dep1);
          dependencyGraph.addDependency(dep1, dep2);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.OVERRIDDEN_SOLC_VERSION_INCOMPATIBLE_WITH_DEPENDENCY,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dep1.fsPath, dep2.fsPath],
            formattedReason: `The compiler version override is incompatible with a dependency of this file:\n  * .${path.sep}${path.relative(process.cwd(), root.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dep1.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dep2.fsPath)}`,
          });
        });
      });
    });

    describe("without a compiler override", () => {
      it("should return the config of the max satisfying compiler for a root with no dependencies", () => {
        buildProfile.compilers.push({
          version: "0.8.0",
          settings: {},
        });

        const selector = new SolcConfigSelector(buildProfileName, buildProfile);
        const config =
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

        assert.deepEqual(config, buildProfile.compilers[0]);
      });

      it("should return the config of the max satisfying compiler if it exists", () => {
        buildProfile.compilers.push({
          version: "0.8.0",
          settings: {},
        });
        buildProfile.compilers.push({
          version: "0.8.1",
          settings: {},
        });
        buildProfile.compilers.push({
          version: "0.8.2",
          settings: {},
        });
        buildProfile.compilers.push({
          version: "0.8.3",
          settings: {},
        });

        const dependency1 = createProjectResolvedFile("dependency1.sol", [
          "<=0.8.2",
        ]);
        const dependency2 = createProjectResolvedFile("dependency2.sol", [
          ">=0.8.1",
        ]);
        dependencyGraph.addDependency(root, dependency1);
        dependencyGraph.addDependency(root, dependency2);

        const selector = new SolcConfigSelector(buildProfileName, buildProfile);
        const config =
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

        assert.deepEqual(config, buildProfile.compilers[2]);
      });

      it("should handle multiple version pragmas per file", () => {
        root = createProjectResolvedFile("root.sol", [">=0.8.0", "<0.8.5"]);
        dependencyGraph = new DependencyGraphImplementation();
        dependencyGraph.addRootFile(root.inputSourceName, root);

        buildProfile.compilers.push({
          version: "0.8.4",
          settings: {},
        });

        const dependency = createProjectResolvedFile("dependency.sol", [
          ">=0.8.3",
        ]);
        dependencyGraph.addDependency(root, dependency);

        const selector = new SolcConfigSelector(buildProfileName, buildProfile);
        const config =
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

        assert.deepEqual(config, buildProfile.compilers[0]);
      });

      describe("if it does not satisfy the version range", () => {
        it("should return no compatible root solc version error if it does not satisfy the root version range", () => {
          buildProfile.compilers.push({
            version: "0.7.0",
            settings: {},
          });

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_ROOT,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            formattedReason:
              "No solc version enabled in this profile is compatible with this file.",
          });
        });

        it("should return no compatible solc version with dependency error if dependency pragmas are unsatisfiable by any configured compiler", () => {
          buildProfile.compilers.push({
            version: "0.8.0",
            settings: {},
          });

          const dependency = createProjectResolvedFile("dependency.sol", [
            "0.8.1",
          ]);
          dependencyGraph.addDependency(root, dependency);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_DEPENDENCY,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dependency.fsPath],
            formattedReason: `No solc version enabled in this profile is compatible with a dependency of this file:\n  * .${path.sep}${path.relative(process.cwd(), root.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dependency.fsPath)}`,
          });
        });

        it("should return no compatible solc version with dependency error for a transitive dependency", () => {
          buildProfile.compilers.push({
            version: "0.8.0",
            settings: {},
          });

          const dep1 = createProjectResolvedFile("dep1.sol", ["^0.8.0"]);
          const dep2 = createProjectResolvedFile("dep2.sol", ["0.8.99"]);
          dependencyGraph.addDependency(root, dep1);
          dependencyGraph.addDependency(dep1, dep2);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_WITH_DEPENDENCY,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dep1.fsPath, dep2.fsPath],
            formattedReason: `No solc version enabled in this profile is compatible with a dependency of this file:\n  * .${path.sep}${path.relative(process.cwd(), root.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dep1.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dep2.fsPath)}`,
          });
        });

        it("should return import of incompatible file error if dependency version range clashes with the root version range", () => {
          buildProfile.compilers.push({
            version: "0.8.0",
            settings: {},
          });
          buildProfile.compilers.push({
            version: "0.7.0",
            settings: {},
          });

          const dependency = createProjectResolvedFile("dependency.sol", [
            "^0.7.0",
          ]);
          dependencyGraph.addDependency(root, dependency);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.IMPORT_OF_INCOMPATIBLE_FILE,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dependency.fsPath],
            formattedReason: `Following these imports leads to an incompatible solc version pragma that no version can satisfy:\n  * .${path.sep}${path.relative(process.cwd(), root.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dependency.fsPath)}`,
          });
        });

        it("should return import of incompatible file error for a transitive dependency chain", () => {
          buildProfile.compilers.push({
            version: "0.7.0",
            settings: {},
          });
          buildProfile.compilers.push({
            version: "0.8.0",
            settings: {},
          });

          const dep1 = createProjectResolvedFile("dep1.sol", [
            ">=0.7.0",
            "<=0.8.5",
          ]);
          const dep2 = createProjectResolvedFile("dep2.sol", ["^0.7.0"]);
          dependencyGraph.addDependency(root, dep1);
          dependencyGraph.addDependency(dep1, dep2);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.IMPORT_OF_INCOMPATIBLE_FILE,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dep1.fsPath, dep2.fsPath],
            formattedReason: `Following these imports leads to an incompatible solc version pragma that no version can satisfy:\n  * .${path.sep}${path.relative(process.cwd(), root.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dep1.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dep2.fsPath)}`,
          });
        });

        it("should return no compatible solc version for transitive import path error if combined range is valid but no compiler satisfies it", () => {
          buildProfile.compilers.push({
            version: "0.8.0",
            settings: {},
          });
          buildProfile.compilers.push({
            version: "0.8.4",
            settings: {},
          });

          const dep1 = createProjectResolvedFile("dep1.sol", ["<=0.8.3"]);
          const dep2 = createProjectResolvedFile("dep2.sol", [">=0.8.2"]);
          dependencyGraph.addDependency(root, dep1);
          dependencyGraph.addDependency(dep1, dep2);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOR_TRANSITIVE_IMPORT_PATH,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dep1.fsPath, dep2.fsPath],
            formattedReason: `No solc version enabled in this profile is compatible with this file and this import path:\n  * .${path.sep}${path.relative(process.cwd(), root.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dep1.fsPath)}\n  * .${path.sep}${path.relative(process.cwd(), dep2.fsPath)}`,
          });
        });

        it("should return no compatible solc version error otherwise", () => {
          buildProfile.compilers.push({
            version: "0.8.0",
            settings: {},
          });
          buildProfile.compilers.push({
            version: "0.8.1",
            settings: {},
          });
          buildProfile.compilers.push({
            version: "0.8.2",
            settings: {},
          });

          const dependency1 = createProjectResolvedFile("dependency1.sol", [
            "^0.8.1",
          ]);
          const dependency2 = createProjectResolvedFile("dependency2.sol", [
            "^0.8.2",
          ]);
          const dependency3 = createProjectResolvedFile("dependency3.sol", [
            "0.8.0",
          ]);
          dependencyGraph.addDependency(root, dependency1);
          dependencyGraph.addDependency(root, dependency2);
          dependencyGraph.addDependency(root, dependency3);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            formattedReason:
              "No solc version enabled in this profile is compatible with this file and all of its dependencies.",
          });
        });
      });
    });
  });

  describe("Edge cases", () => {
    it("Should still return an error in the presence of cycles", () => {
      const dependency1 = createProjectResolvedFile("dependency1.sol", [
        ">0.8.0",
      ]);

      const dependency2 = createProjectResolvedFile("dependency2.sol", [
        "<0.8.1",
      ]);

      dependencyGraph.addDependency(root, dependency1);
      dependencyGraph.addDependency(dependency1, dependency2);
      dependencyGraph.addDependency(dependency2, dependency1);

      const selector = new SolcConfigSelector(buildProfileName, {
        compilers: [
          { version: "0.8.1", settings: {} },
          { version: "0.8.0", settings: {} },
        ],
        overrides: {},
        isolated: false,
        preferWasm: false,
      });

      const configOrError =
        selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

      assert.ok("reason" in configOrError, "Error expected");
      assert.equal(
        configOrError.reason,
        CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOR_TRANSITIVE_IMPORT_PATH,
      );
    });

    it("Should skip already-visited nodes when a cycle is fully traversed without early error return", () => {
      // Graph:
      //           root
      //          /    \
      //         A      C
      //        / \
      //        \ /
      //         B
      //
      // The [root, A, B] are compatible with 0.8.1, and [root, C] with 0.8.0,
      // so the cycle is fully analyzed, and we only fial for the general case.
      const depA = createProjectResolvedFile("depA.sol", ["^0.8.1"]);
      const depB = createProjectResolvedFile("depB.sol", ["^0.8.0"]);
      const depC = createProjectResolvedFile("depC.sol", ["0.8.0"]);

      dependencyGraph.addDependency(root, depA);
      dependencyGraph.addDependency(root, depC);
      dependencyGraph.addDependency(depA, depB);
      dependencyGraph.addDependency(depB, depA);

      const selector = new SolcConfigSelector(buildProfileName, {
        compilers: [
          { version: "0.8.0", settings: {} },
          { version: "0.8.1", settings: {} },
        ],
        overrides: {},
        isolated: false,
        preferWasm: false,
      });

      const configOrError =
        selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

      assert.deepEqual(configOrError, {
        reason:
          CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
        rootFilePath: root.fsPath,
        buildProfile: buildProfileName,
        formattedReason:
          "No solc version enabled in this profile is compatible with this file and all of its dependencies.",
      });
    });
  });
});
