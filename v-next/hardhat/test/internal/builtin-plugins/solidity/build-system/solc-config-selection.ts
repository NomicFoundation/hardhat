import type { SolidityBuildProfileConfig } from "../../../../../src/types/config.js";
import type { ProjectResolvedFile } from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { DependencyGraphImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import { ProjectResolvedFileImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/resolved-file.js";
import { SolcConfigSelector } from "../../../../../src/internal/builtin-plugins/solidity/build-system/solc-config-selection.js";
import { CompilationJobCreationErrorReason } from "../../../../../src/types/solidity.js";

function createProjectResolvedFile(
  sourceName: string,
  versionPragmas: string[],
): ProjectResolvedFile {
  return new ProjectResolvedFileImplementation({
    sourceName,
    fsPath: path.join(process.cwd(), sourceName),
    content: {
      text: "",
      importPaths: [],
      versionPragmas,
    },
  });
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
    };
    root = createProjectResolvedFile("root.sol", ["^0.8.0"]);
    dependencyGraph = new DependencyGraphImplementation();
    dependencyGraph.addRootFile(root.sourceName, root);
  });

  describe("selectBestSolcConfigForSingleRootGraph", () => {
    it("should throw when given a subgraph of size greater than 1", () => {
      dependencyGraph.addRootFile(
        "otherRoot",
        createProjectResolvedFile(
          "other-root.sol",
          root.content.versionPragmas,
        ),
      );
      const selector = new SolcConfigSelector(
        buildProfileName,
        buildProfile,
        dependencyGraph,
      );

      assertRejectsWithHardhatError(
        async () => {
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);
        },
        HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR,
        {
          message: "This method only works for single root graphs",
        },
      );
    });

    it("should throw when given a subgraph of size 0", () => {
      const emptyDependencyGraph = new DependencyGraphImplementation();

      const selector = new SolcConfigSelector(
        buildProfileName,
        buildProfile,
        emptyDependencyGraph,
      );

      assertRejectsWithHardhatError(
        async () => {
          selector.selectBestSolcConfigForSingleRootGraph(emptyDependencyGraph);
        },
        HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR,
        {
          message: "This method only works for single root graphs",
        },
      );
    });

    describe("with a compiler override", () => {
      it("should return the compiler if it satisfies the version range ", () => {
        buildProfile.overrides[root.sourceName] = {
          version: "0.8.0",
          settings: {},
        };

        const selector = new SolcConfigSelector(
          buildProfileName,
          buildProfile,
          dependencyGraph,
        );
        const config =
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

        assert.deepEqual(config, buildProfile.overrides[root.sourceName]);
      });

      describe("if it does not satisfy the version range", () => {
        it("should return incompatible override error if it does not satisfy the root version range", () => {
          buildProfile.overrides[root.sourceName] = {
            version: "0.7.0",
            settings: {},
          };

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
            dependencyGraph,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            formattedReason:
              "An override with incompatible solc version was found for this file.",
          });
        });

        it("should return import of incompatible file error if dependency version range clashes with the root version range", () => {
          buildProfile.overrides[root.sourceName] = {
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
            dependencyGraph,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.IMPORT_OF_INCOMPATIBLE_FILE,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dependency.fsPath],
            formattedReason: `Following these imports leads to an incompatible solc version pragma that no version can satisfy:\n  * ${root.sourceName}\n  * ${dependency.sourceName}\n`,
          });
        });

        it("should return no compatible solc version error otherwise", () => {
          buildProfile.overrides[root.sourceName] = {
            version: "0.8.0",
            settings: {},
          };

          const dependency1 = createProjectResolvedFile("dependency1.sol", [
            "^0.8.1",
          ]);
          const dependency2 = createProjectResolvedFile("dependency2.sol", [
            "^0.8.2",
          ]);
          dependencyGraph.addDependency(root, dependency1);
          dependencyGraph.addDependency(root, dependency2);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
            dependencyGraph,
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

    describe("without a compiler override", () => {
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

        const selector = new SolcConfigSelector(
          buildProfileName,
          buildProfile,
          dependencyGraph,
        );
        const config =
          selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

        assert.deepEqual(config, buildProfile.compilers[2]);
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
            dependencyGraph,
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

        it("should return import of incompatible file error if dependency version range clashes with the root version range", () => {
          buildProfile.compilers.push({
            version: "0.8.0",
            settings: {},
          });

          const dependency = createProjectResolvedFile("dependency.sol", [
            "^0.7.0",
          ]);
          dependencyGraph.addDependency(root, dependency);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
            dependencyGraph,
          );
          const config =
            selector.selectBestSolcConfigForSingleRootGraph(dependencyGraph);

          assert.deepEqual(config, {
            reason:
              CompilationJobCreationErrorReason.IMPORT_OF_INCOMPATIBLE_FILE,
            rootFilePath: root.fsPath,
            buildProfile: buildProfileName,
            incompatibleImportPath: [dependency.fsPath],
            formattedReason: `Following these imports leads to an incompatible solc version pragma that no version can satisfy:\n  * ${root.sourceName}\n  * ${dependency.sourceName}\n`,
          });
        });

        it("should return no compatible solc version error otherwise", () => {
          buildProfile.compilers.push({
            version: "0.8.0",
            settings: {},
          });

          const dependency1 = createProjectResolvedFile("dependency1.sol", [
            "^0.8.1",
          ]);
          const dependency2 = createProjectResolvedFile("dependency2.sol", [
            "^0.8.2",
          ]);
          dependencyGraph.addDependency(root, dependency1);
          dependencyGraph.addDependency(root, dependency2);

          const selector = new SolcConfigSelector(
            buildProfileName,
            buildProfile,
            dependencyGraph,
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
});
