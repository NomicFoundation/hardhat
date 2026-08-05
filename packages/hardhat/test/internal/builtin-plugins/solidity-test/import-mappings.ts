import type {
  NpmPackageResolvedFile,
  ProjectResolvedFile,
  ResolvedNpmPackage,
} from "../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { buildDependencyGraph } from "../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph-building.js";
import { DependencyGraphImplementation } from "../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import { readSourceFileFactory } from "../../../../src/internal/builtin-plugins/solidity/build-system/read-source-file.js";
import { buildImportMappings } from "../../../../src/internal/builtin-plugins/solidity-test/import-mappings.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-initialization.js";
import { ResolvedFileType } from "../../../../src/types/solidity.js";
import hardhatConfig from "../../../fixture-projects/solidity-test-inline-config/hardhat.config.js";

const projectPackage: ResolvedNpmPackage = {
  name: "hardhat-project",
  version: "1.2.3",
  rootFsPath: "/project/",
  inputSourceNameRoot: "project",
};

const forgeStdPackage: ResolvedNpmPackage = {
  name: "forge-std",
  version: "1.9.4",
  rootFsPath: "/project/node_modules/forge-std/",
  inputSourceNameRoot: "npm/forge-std@1.9.4",
};

function createProjectFile(relativePath: string): ProjectResolvedFile {
  return {
    type: ResolvedFileType.PROJECT_FILE,
    inputSourceName: `project/${relativePath}`,
    fsPath: `/project/${relativePath}`,
    content: { text: "", importPaths: [], versionPragmas: [] },
    package: projectPackage,
  };
}

function createForgeStdFile(relativePath: string): NpmPackageResolvedFile {
  return {
    type: ResolvedFileType.NPM_PACKAGE_FILE,
    inputSourceName: `npm/forge-std@1.9.4/${relativePath}`,
    fsPath: `/project/node_modules/forge-std/${relativePath}`,
    content: { text: "", importPaths: [], versionPragmas: [] },
    package: forgeStdPackage,
  };
}

describe("buildImportMappings", () => {
  it("should map every file's input source name to its fs path", () => {
    const graph = new DependencyGraphImplementation();
    const root = createProjectFile("contracts/Foo.t.sol");
    const dependency = createProjectFile("contracts/Foo.sol");
    graph.addRootFile("contracts/Foo.t.sol", root);
    graph.addDependency(root, dependency);

    const importMappings = buildImportMappings(graph);

    assert.deepEqual(importMappings, {
      "project/contracts/Foo.t.sol": "/project/contracts/Foo.t.sol",
      "project/contracts/Foo.sol": "/project/contracts/Foo.sol",
    });
  });

  it("should reconstruct the as-written import path from a remapped dependency edge", () => {
    const graph = new DependencyGraphImplementation();
    const root = createProjectFile("contracts/Foo.t.sol");
    const dependency = createForgeStdFile("src/Test.sol");
    graph.addRootFile("contracts/Foo.t.sol", root);
    graph.addDependency(
      root,
      dependency,
      "project/:forge-std/=npm/forge-std@1.9.4/",
    );

    const importMappings = buildImportMappings(graph);

    assert.equal(
      importMappings["forge-std/src/Test.sol"],
      "/project/node_modules/forge-std/src/Test.sol",
    );
  });

  it("should skip remappings whose target is not a prefix of the dependency's input source name", () => {
    const graph = new DependencyGraphImplementation();
    const root = createProjectFile("contracts/Foo.t.sol");
    const dependency = createForgeStdFile("src/Test.sol");
    graph.addRootFile("contracts/Foo.t.sol", root);
    graph.addDependency(root, dependency, "other/=npm/other@1.0.0/");

    const importMappings = buildImportMappings(graph);

    assert.deepEqual(Object.keys(importMappings).toSorted(), [
      "npm/forge-std@1.9.4/src/Test.sol",
      "project/contracts/Foo.t.sol",
    ]);
  });

  it("should skip unparsable remapping strings", () => {
    const graph = new DependencyGraphImplementation();
    const root = createProjectFile("contracts/Foo.t.sol");
    const dependency = createForgeStdFile("src/Test.sol");
    graph.addRootFile("contracts/Foo.t.sol", root);
    graph.addDependency(root, dependency, "not-a-remapping");

    const importMappings = buildImportMappings(graph);

    assert.deepEqual(Object.keys(importMappings).toSorted(), [
      "npm/forge-std@1.9.4/src/Test.sol",
      "project/contracts/Foo.t.sol",
    ]);
  });

  it("should reconstruct one import path per remapping on the same edge", () => {
    const graph = new DependencyGraphImplementation();
    const root = createProjectFile("contracts/Foo.t.sol");
    const dependency = createForgeStdFile("src/Test.sol");
    graph.addRootFile("contracts/Foo.t.sol", root);
    graph.addDependency(
      root,
      dependency,
      "forge-std/=npm/forge-std@1.9.4/src/",
    );
    graph.addDependency(
      root,
      dependency,
      "forge-std/src/=npm/forge-std@1.9.4/src/",
    );

    const importMappings = buildImportMappings(graph);

    assert.equal(
      importMappings["forge-std/Test.sol"],
      "/project/node_modules/forge-std/src/Test.sol",
    );
    assert.equal(
      importMappings["forge-std/src/Test.sol"],
      "/project/node_modules/forge-std/src/Test.sol",
    );
  });

  // Unlike the tests above, this one uses the real resolver, so it catches
  // changes to the remapping format that the hand-built graphs would miss.
  describe("with a dependency graph built from a real project", () => {
    useFixtureProject("solidity-test-inline-config");

    it("should map a non-relative npm import as written to its fs path", async () => {
      const hre = await createHardhatRuntimeEnvironment(hardhatConfig);
      const rootFilePath = path.join(
        process.cwd(),
        "test/valid/InlineConfig.t.sol",
      );

      const dependencyGraph = await buildDependencyGraph(
        [rootFilePath],
        process.cwd(),
        readSourceFileFactory(hre.hooks),
        hre.hooks,
      );

      const importMappings = buildImportMappings(dependencyGraph);

      assert.equal(
        importMappings["dependency/src/BaseTest.sol"],
        path.join(process.cwd(), "node_modules/dependency/src/BaseTest.sol"),
      );
    });
  });
});
