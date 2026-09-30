import type {
  NpmPackageResolvedFile,
  ProjectResolvedFile,
  ResolvedNpmPackage,
} from "../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DependencyGraphImplementation } from "../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import { collectImportMappings } from "../../../../src/internal/builtin-plugins/solidity-test/import-mappings.js";
import { ResolvedFileType } from "../../../../src/types/solidity.js";

const PROJECT_PACKAGE: ResolvedNpmPackage = {
  name: "hardhat-project",
  version: "1.2.3",
  rootFsPath: "/project",
  inputSourceNameRoot: "project",
};

function createProjectFile(
  sourcePath: string,
  importPaths: string[] = [],
): ProjectResolvedFile {
  return {
    type: ResolvedFileType.PROJECT_FILE,
    inputSourceName: `project/${sourcePath}`,
    fsPath: `/project/${sourcePath}`,
    content: { text: "", importPaths, versionPragmas: [] },
    package: PROJECT_PACKAGE,
  };
}

function createNpmFile(
  packageName: string,
  version: string,
  subPath: string,
  importPaths: string[] = [],
): NpmPackageResolvedFile {
  return {
    type: ResolvedFileType.NPM_PACKAGE_FILE,
    inputSourceName: `npm/${packageName}@${version}/${subPath}`,
    fsPath: `/project/node_modules/${packageName}/${subPath}`,
    content: { text: "", importPaths, versionPragmas: [] },
    package: {
      name: packageName,
      version,
      rootFsPath: `/project/node_modules/${packageName}`,
      inputSourceNameRoot: `npm/${packageName}@${version}`,
    },
  };
}

function npmRemapping(
  context: string,
  packageName: string,
  version: string,
): string {
  return `${context}:${packageName}/=npm/${packageName}@${version}/`;
}

describe("collectImportMappings", () => {
  it("maps a package import to the file it resolves to", () => {
    const test = createProjectFile("test/Foo.t.sol", [
      "forge-std/src/Test.sol",
    ]);
    const forgeStd = createNpmFile("forge-std", "1.9.4", "src/Test.sol");

    const dependencyGraph = new DependencyGraphImplementation();
    dependencyGraph.addRootFile("test/Foo.t.sol", test);
    dependencyGraph.addDependency(
      test,
      forgeStd,
      npmRemapping("project/", "forge-std", "1.9.4"),
    );

    assert.deepEqual(collectImportMappings(dependencyGraph), {
      "forge-std/src/Test.sol": "/project/node_modules/forge-std/src/Test.sol",
    });
  });

  it("leaves out relative imports, which need no mapping", () => {
    const test = createProjectFile("test/Foo.t.sol", [
      "./Helper.sol",
      "../contracts/Foo.sol",
    ]);
    const helper = createProjectFile("test/Helper.sol");
    const foo = createProjectFile("contracts/Foo.sol");

    const dependencyGraph = new DependencyGraphImplementation();
    dependencyGraph.addRootFile("test/Foo.t.sol", test);
    dependencyGraph.addDependency(test, helper);
    dependencyGraph.addDependency(test, foo);

    assert.deepEqual(collectImportMappings(dependencyGraph), {});
  });

  it("maps the imports of the files the test imports too", () => {
    const test = createProjectFile("test/Foo.t.sol", [
      "forge-std/src/Test.sol",
    ]);
    const forgeStd = createNpmFile("forge-std", "1.9.4", "src/Test.sol", [
      "forge-std/src/Vm.sol",
    ]);
    const vm = createNpmFile("forge-std", "1.9.4", "src/Vm.sol");

    const dependencyGraph = new DependencyGraphImplementation();
    dependencyGraph.addRootFile("test/Foo.t.sol", test);
    dependencyGraph.addDependency(
      test,
      forgeStd,
      npmRemapping("project/", "forge-std", "1.9.4"),
    );
    dependencyGraph.addDependency(
      forgeStd,
      vm,
      npmRemapping("npm/forge-std@1.9.4/", "forge-std", "1.9.4"),
    );

    assert.deepEqual(collectImportMappings(dependencyGraph), {
      "forge-std/src/Test.sol": "/project/node_modules/forge-std/src/Test.sol",
      "forge-std/src/Vm.sol": "/project/node_modules/forge-std/src/Vm.sol",
    });
  });

  it("keeps the first file when an import path resolves to several", () => {
    const first = createProjectFile("test/First.t.sol", ["dep/Dep.sol"]);
    const second = createProjectFile("test/Second.t.sol", ["dep/Dep.sol"]);
    const firstDep = createNpmFile("dep", "1.0.0", "Dep.sol");
    const secondDep = createNpmFile("dep", "2.0.0", "Dep.sol");
    secondDep.fsPath = "/project/node_modules/other/node_modules/dep/Dep.sol";

    const dependencyGraph = new DependencyGraphImplementation();
    dependencyGraph.addRootFile("test/First.t.sol", first);
    dependencyGraph.addRootFile("test/Second.t.sol", second);
    dependencyGraph.addDependency(
      first,
      firstDep,
      npmRemapping("project/test/First.t.sol", "dep", "1.0.0"),
    );
    dependencyGraph.addDependency(
      second,
      secondDep,
      npmRemapping("project/test/Second.t.sol", "dep", "2.0.0"),
    );

    assert.deepEqual(collectImportMappings(dependencyGraph), {
      "dep/Dep.sol": "/project/node_modules/dep/Dep.sol",
    });
  });

  it("leaves out an import that resolves to no dependency", () => {
    const test = createProjectFile("test/Foo.t.sol", ["unmapped/Foo.sol"]);

    const dependencyGraph = new DependencyGraphImplementation();
    dependencyGraph.addRootFile("test/Foo.t.sol", test);

    assert.deepEqual(collectImportMappings(dependencyGraph), {});
  });

  it("maps an import written as the input source name of its file", () => {
    const test = createProjectFile("test/Foo.t.sol", [
      "npm/forge-std@1.9.4/src/Test.sol",
    ]);
    const forgeStd = createNpmFile("forge-std", "1.9.4", "src/Test.sol");

    const dependencyGraph = new DependencyGraphImplementation();
    dependencyGraph.addRootFile("test/Foo.t.sol", test);
    dependencyGraph.addDependency(test, forgeStd);

    assert.deepEqual(collectImportMappings(dependencyGraph), {
      "npm/forge-std@1.9.4/src/Test.sol":
        "/project/node_modules/forge-std/src/Test.sol",
    });
  });
});
