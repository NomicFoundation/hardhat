import type { ProjectResolvedFile } from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { DependencyGraphImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import { ProjectResolvedFileImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/resolved-file.js";

function createProjectResolvedFile(sourceName: string): ProjectResolvedFile {
  return new ProjectResolvedFileImplementation({
    sourceName,
    fsPath: path.join(process.cwd(), sourceName),
    content: {
      text: "",
      importPaths: [],
      versionPragmas: [],
    },
  });
}

describe("DependencyGraphImplementation", () => {
  let dependencyGraph: DependencyGraphImplementation;

  beforeEach(() => {
    dependencyGraph = new DependencyGraphImplementation();
  });

  describe("addRootFile", () => {
    it("should add the file to the list of files", () => {
      const files = [];

      for (let i = 0; i < 10; i++) {
        const file = createProjectResolvedFile(`file${i}.sol`);
        dependencyGraph.addRootFile(file.sourceName, file);
        files.push(file);
      }

      for (const file of files) {
        assert.ok(
          dependencyGraph.hasFile(file),
          `hasFile should return true for file ${file.sourceName}`,
        );
        assert.equal(
          dependencyGraph.getFileBySourceName(file.sourceName),
          file,
        );
      }
    });

    it("should add a mapping between the public source name and the root", () => {
      const files = [];

      for (let i = 0; i < 10; i++) {
        const file = createProjectResolvedFile(`file${i}.sol`);
        dependencyGraph.addRootFile(file.sourceName, file);
        files.push(file);
      }

      const roots = dependencyGraph.getRoots();

      assert.equal(roots.size, files.length);
      for (const file of files) {
        assert.ok(
          roots.has(file.sourceName),
          `getRoots should return a map with ${file.sourceName} key`,
        );
        assert.equal(roots.get(file.sourceName), file);
      }
    });

    it("should throw if the file was already added", () => {
      const file = createProjectResolvedFile("file.sol");
      dependencyGraph.addRootFile(file.sourceName, file);

      assertThrowsHardhatError(
        () => {
          dependencyGraph.addRootFile(file.sourceName, file);
        },
        HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR,
        {
          message: `File ${file.sourceName} already present`,
        },
      );
    });
  });

  describe("addDependency", () => {
    it("throw if the upstream dependency is not present in the graph", () => {
      const upstreamDependency = createProjectResolvedFile("upstream.sol");
      const downstreamDependency = createProjectResolvedFile("downstream.sol");

      assertThrowsHardhatError(
        () => {
          dependencyGraph.addDependency(
            upstreamDependency,
            downstreamDependency,
          );
        },
        HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR,
        {
          message: "File `from` from not present",
        },
      );
    });

    it("should add the downstream dependency to the list of files if it doesn't exist yet", () => {
      const upstreamDependency = createProjectResolvedFile("upstream.sol");
      const downstreamDependency = createProjectResolvedFile("downstream.sol");

      dependencyGraph.addRootFile(
        upstreamDependency.sourceName,
        upstreamDependency,
      );

      assert.ok(
        !dependencyGraph.hasFile(downstreamDependency),
        `hasFile should return false for file ${downstreamDependency.sourceName}`,
      );

      dependencyGraph.addDependency(upstreamDependency, downstreamDependency);

      assert.ok(
        dependencyGraph.hasFile(downstreamDependency),
        `hasFile should return true for file ${downstreamDependency.sourceName}`,
      );
    });

    it("should add the downsteam dependency to the list of dependencies of the upstream dependency", () => {
      const upstreamDependency = createProjectResolvedFile("upstream.sol");
      const downstreamDependency = createProjectResolvedFile("downstream.sol");

      dependencyGraph.addRootFile(
        upstreamDependency.sourceName,
        upstreamDependency,
      );
      dependencyGraph.addRootFile(
        downstreamDependency.sourceName,
        downstreamDependency,
      );

      assert.ok(
        !dependencyGraph
          .getDependencies(upstreamDependency)
          .has(downstreamDependency),
        `getDependencies should return false for file ${downstreamDependency.sourceName}`,
      );

      dependencyGraph.addDependency(upstreamDependency, downstreamDependency);

      assert.ok(
        dependencyGraph
          .getDependencies(upstreamDependency)
          .has(downstreamDependency),
        `getDependencies should return true for file ${downstreamDependency.sourceName}`,
      );
    });
  });

  describe("getRoots", () => {
    it("should return a mapping from public source names to roots", () => {
      const root1 = createProjectResolvedFile("root1.sol");
      const root2 = createProjectResolvedFile("root2.sol");
      const dependency1 = createProjectResolvedFile("dependency1.sol");
      const dependency2 = createProjectResolvedFile("dependency2.sol");

      dependencyGraph.addRootFile(root1.sourceName, root1);
      dependencyGraph.addRootFile(root2.sourceName, root2);
      dependencyGraph.addDependency(root1, dependency1);
      dependencyGraph.addDependency(root2, dependency2);

      const roots = dependencyGraph.getRoots();

      assert.equal(roots.size, 2);
      assert.ok(
        roots.has(root1.sourceName),
        `getRoots should return a map with ${root1.sourceName} key`,
      );
      assert.equal(roots.get(root1.sourceName), root1);
      assert.ok(
        roots.has(root2.sourceName),
        `getRoots should return a map with ${root2.sourceName} key`,
      );
      assert.equal(roots.get(root2.sourceName), root2);
      assert.ok(
        !roots.has(dependency1.sourceName),
        `getRoots should return a map without ${dependency1.sourceName} key`,
      );
      assert.ok(
        !roots.has(dependency2.sourceName),
        `getRoots should return a map without ${dependency2.sourceName} key`,
      );
    });
  });

  describe("getAllFiles", () => {
    it("should return the list of all added files", () => {
      const root1 = createProjectResolvedFile("root1.sol");
      const root2 = createProjectResolvedFile("root2.sol");
      const dependency1 = createProjectResolvedFile("dependency1.sol");
      const dependency2 = createProjectResolvedFile("dependency2.sol");

      dependencyGraph.addRootFile(root1.sourceName, root1);
      dependencyGraph.addRootFile(root2.sourceName, root2);
      dependencyGraph.addDependency(root1, dependency1);
      dependencyGraph.addDependency(root2, dependency2);

      const files = Array.from(dependencyGraph.getAllFiles());

      assert.equal(files.length, 4);
      assert.ok(
        files.includes(root1),
        `getAllFiles should return ${root1.sourceName}`,
      );
      assert.ok(
        files.includes(root2),
        `getAllFiles should return ${root2.sourceName}`,
      );
      assert.ok(
        files.includes(dependency1),
        `getAllFiles should return ${dependency1.sourceName}`,
      );
      assert.ok(
        files.includes(dependency2),
        `getAllFiles should return ${dependency2.sourceName}`,
      );
    });
  });

  describe("hasFile", () => {
    it("should return true for files that were previously added", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      dependencyGraph.addRootFile(root.sourceName, root);
      dependencyGraph.addDependency(root, dependency);

      assert.ok(
        dependencyGraph.hasFile(root),
        `hasFile should return true for file ${root.sourceName}`,
      );
      assert.ok(
        dependencyGraph.hasFile(dependency),
        `hasFile should return true for file ${dependency.sourceName}`,
      );
    });

    it("should return false for files that were not added before", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      assert.ok(
        !dependencyGraph.hasFile(root),
        `hasFile should return false for file ${root.sourceName}`,
      );
      assert.ok(
        !dependencyGraph.hasFile(dependency),
        `hasFile should return false for file ${dependency.sourceName}`,
      );
    });
  });

  describe("getDependencies", () => {
    it("should return the list of dependencies for a given file if it exists", () => {
      const root = createProjectResolvedFile("root.sol");

      dependencyGraph.addRootFile(root.sourceName, root);

      const dependencies = [];
      for (let i = 0; i < 10; i++) {
        const dependency = createProjectResolvedFile(`dependency${i}.sol`);
        dependencyGraph.addDependency(root, dependency);
        dependencies.push(dependency);
      }

      const actualDependencies = dependencyGraph.getDependencies(root);

      assert.equal(actualDependencies.size, 10);
      for (const dependency of dependencies) {
        assert.ok(
          actualDependencies.has(dependency),
          `getDependencies should return a set with ${dependency.sourceName} element`,
        );
      }
    });

    it("should return an empty set for files that were not added before", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependencies = dependencyGraph.getDependencies(root);

      assert.equal(dependencies.size, 0);
    });
  });

  describe("getFileBySourceName", () => {
    it("should return the file by its' source name if the file was previously added", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      dependencyGraph.addRootFile(root.sourceName, root);
      dependencyGraph.addDependency(root, dependency);

      const rootFile = dependencyGraph.getFileBySourceName(root.sourceName);
      const dependencyFile = dependencyGraph.getFileBySourceName(
        dependency.sourceName,
      );

      assert.equal(rootFile, root);
      assert.equal(dependencyFile, dependency);
    });

    it("should return undefined if a file was not added before", () => {
      const file = dependencyGraph.getFileBySourceName("root.sol");

      assert.equal(file, undefined);
    });
  });

  describe("getSubgraph", () => {
    it("should return a subgraph of the graph that contains only the given file as a root", () => {
      const root1 = createProjectResolvedFile("root1.sol");
      const root2 = createProjectResolvedFile("root2.sol");
      const dependency1 = createProjectResolvedFile("dependency1.sol");
      const dependency2 = createProjectResolvedFile("dependency2.sol");
      const transitiveDependency1 = createProjectResolvedFile(
        "transitiveDependency1.sol",
      );
      const transitiveDependency2 = createProjectResolvedFile(
        "transitiveDependency2.sol",
      );
      const transitiveDependency3 = createProjectResolvedFile(
        "transitiveDependency3.sol",
      );
      const nestedTransitiveDependency1 = createProjectResolvedFile(
        "nestedTransitiveDependency1.sol",
      );
      const nestedTransitiveDependency2 = createProjectResolvedFile(
        "nestedTransitiveDependency2.sol",
      );

      dependencyGraph.addRootFile(root1.sourceName, root1);
      dependencyGraph.addRootFile(root2.sourceName, root2);
      dependencyGraph.addDependency(root1, dependency1);
      dependencyGraph.addDependency(root2, dependency2);
      dependencyGraph.addDependency(dependency1, transitiveDependency1);
      dependencyGraph.addDependency(dependency1, transitiveDependency2);
      dependencyGraph.addDependency(dependency2, transitiveDependency2);
      dependencyGraph.addDependency(dependency2, transitiveDependency3);
      dependencyGraph.addDependency(
        transitiveDependency1,
        nestedTransitiveDependency1,
      );
      dependencyGraph.addDependency(
        transitiveDependency2,
        nestedTransitiveDependency1,
      );
      dependencyGraph.addDependency(
        transitiveDependency2,
        nestedTransitiveDependency2,
      );
      dependencyGraph.addDependency(
        transitiveDependency3,
        nestedTransitiveDependency2,
      );

      const subgraph = dependencyGraph.getSubgraph(root1.sourceName);

      const roots = subgraph.getRoots();
      assert.equal(roots.size, 1);
      assert.ok(
        roots.has(root1.sourceName),
        `getRoots should return a map with ${root1.sourceName} key`,
      );
      assert.ok(
        !roots.has(root2.sourceName),
        `getRoots should return a map without ${root2.sourceName} key`,
      );

      const files = Array.from(subgraph.getAllFiles());
      assert.equal(files.length, 6);
      assert.ok(
        files.includes(root1),
        `getAllFiles should include ${root1.sourceName}`,
      );
      assert.ok(
        !files.includes(root2),
        `getAllFiles should not include ${root2.sourceName}`,
      );
      assert.ok(
        files.includes(dependency1),
        `getAllFiles should include ${dependency1.sourceName}`,
      );
      assert.ok(
        !files.includes(dependency2),
        `getAllFiles should not include ${dependency2.sourceName}`,
      );
      assert.ok(
        files.includes(transitiveDependency1),
        `getAllFiles should include ${transitiveDependency1.sourceName}`,
      );
      assert.ok(
        files.includes(transitiveDependency2),
        `getAllFiles should include ${transitiveDependency2.sourceName}`,
      );
      assert.ok(
        !files.includes(transitiveDependency3),
        `getAllFiles should not include ${transitiveDependency3.sourceName}`,
      );
      assert.ok(
        files.includes(nestedTransitiveDependency1),
        `getAllFiles should include ${nestedTransitiveDependency1.sourceName}`,
      );
      assert.ok(
        files.includes(nestedTransitiveDependency2),
        `getAllFiles should include ${nestedTransitiveDependency2.sourceName}`,
      );
    });

    it("should throw if a file was not added before", () => {
      assertThrowsHardhatError(
        () => {
          dependencyGraph.getSubgraph("root.sol");
        },
        HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR,
        {
          message: "We should have a root for every root public source name",
        },
      );
    });
  });

  describe("merge", () => {
    it("should return an empty graph if input graphs are empty", () => {
      const otherDependencyGraph = new DependencyGraphImplementation();
      const mergedGraph = dependencyGraph.merge(otherDependencyGraph);

      assert.equal(mergedGraph.getRoots().size, 0);
      assert.equal(Array.from(mergedGraph.getAllFiles()).length, 0);
    });

    it("should return a copy of the first graph if the second graph is empty", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      const otherDependencyGraph = new DependencyGraphImplementation();

      dependencyGraph.addRootFile(root.sourceName, root);
      dependencyGraph.addDependency(root, dependency);

      const mergedGraph = dependencyGraph.merge(otherDependencyGraph);

      const roots = mergedGraph.getRoots();
      assert.equal(roots.size, 1);
      assert.ok(
        roots.has(root.sourceName),
        `getRoots should return a map with ${root.sourceName} key`,
      );
      assert.equal(roots.get(root.sourceName), root);

      const files = Array.from(mergedGraph.getAllFiles());
      assert.equal(files.length, 2);
      assert.ok(
        files.includes(root),
        `getAllFiles should include ${root.sourceName}`,
      );
      assert.ok(
        files.includes(dependency),
        `getAllFiles should include ${dependency.sourceName}`,
      );
    });

    it("should return a copy of the second graph if the first graph is empty", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      const otherDependencyGraph = new DependencyGraphImplementation();

      otherDependencyGraph.addRootFile(root.sourceName, root);
      otherDependencyGraph.addDependency(root, dependency);

      const mergedGraph = dependencyGraph.merge(otherDependencyGraph);

      const roots = mergedGraph.getRoots();
      assert.equal(roots.size, 1);
      assert.ok(
        roots.has(root.sourceName),
        `getRoots should return a map with ${root.sourceName} key`,
      );
      assert.equal(roots.get(root.sourceName), root);

      const files = Array.from(mergedGraph.getAllFiles());
      assert.equal(files.length, 2);
      assert.ok(
        files.includes(root),
        `getAllFiles should include ${root.sourceName}`,
      );
      assert.ok(
        files.includes(dependency),
        `getAllFiles should include ${dependency.sourceName}`,
      );
    });

    it("should merge two graphs", () => {
      const root1 = createProjectResolvedFile("root1.sol");
      const root2 = createProjectResolvedFile("root2.sol");

      const otherDependencyGraph = new DependencyGraphImplementation();

      dependencyGraph.addRootFile(root1.sourceName, root1);
      otherDependencyGraph.addRootFile(root2.sourceName, root2);

      const mergedGraph = dependencyGraph.merge(otherDependencyGraph);

      const roots = mergedGraph.getRoots();
      assert.equal(roots.size, 2);
      assert.ok(
        roots.has(root1.sourceName),
        `getRoots should return a map with ${root1.sourceName} key`,
      );
      assert.equal(roots.get(root1.sourceName), root1);
      assert.ok(
        roots.has(root2.sourceName),
        `getRoots should return a map with ${root2.sourceName} key`,
      );
      assert.equal(roots.get(root2.sourceName), root2);

      const files = Array.from(mergedGraph.getAllFiles());
      assert.equal(files.length, 2);
      assert.ok(
        files.includes(root1),
        `getAllFiles should include ${root1.sourceName}`,
      );
      assert.ok(
        files.includes(root2),
        `getAllFiles should include ${root2.sourceName}`,
      );
    });
  });
});
