import type {
  NpmPackageResolvedFile,
  ProjectResolvedFile,
  ResolvedNpmPackage,
} from "../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DependencyGraphImplementation } from "../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import { buildImportMappings } from "../../../../src/internal/builtin-plugins/solidity-test/import-mappings.js";
import { ResolvedFileType } from "../../../../src/types/solidity.js";

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
});
