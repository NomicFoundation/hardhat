import type { Return } from "../../../../../src/types/utils.js";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { DependencyGraphImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import {
  ResolvedFileType,
  type ProjectResolvedFile,
  type ResolvedNpmPackage,
} from "../../../../../src/types/solidity.js";

const testHardhatProjectNpmPackage: ResolvedNpmPackage = {
  name: "hardhat-project",
  version: "1.2.3",
  rootFsPath: "/Users/root/",
  inputSourceNameRoot: "project",
};

function createProjectResolvedFile(
  inputSourceName: string,
): ProjectResolvedFile {
  return {
    type: ResolvedFileType.PROJECT_FILE,
    inputSourceName,
    fsPath: path.join(process.cwd(), inputSourceName),
    content: {
      text: "",
      importPaths: [],
      versionPragmas: [],
    },
    package: testHardhatProjectNpmPackage,
  };
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
        dependencyGraph.addRootFile(file.inputSourceName, file);
        files.push(file);
      }

      for (const file of files) {
        assert.ok(
          dependencyGraph.hasFile(file),
          `hasFile should return true for file ${file.inputSourceName}`,
        );
        assert.equal(
          dependencyGraph.getFileByInputSourceName(file.inputSourceName),
          file,
        );
      }
    });

    it("should add a mapping between the user source name and the root", () => {
      const files = [];

      for (let i = 0; i < 10; i++) {
        const file = createProjectResolvedFile(`file${i}.sol`);
        dependencyGraph.addRootFile(file.inputSourceName, file);
        files.push(file);
      }

      const roots = dependencyGraph.getRoots();

      assert.equal(roots.size, files.length);
      for (const file of files) {
        assert.ok(
          roots.has(file.inputSourceName),
          `getRoots should return a map with ${file.inputSourceName} key`,
        );
        assert.equal(roots.get(file.inputSourceName), file);
      }
    });

    it("should throw if the file was already added", () => {
      const file = createProjectResolvedFile("file.sol");
      dependencyGraph.addRootFile(file.inputSourceName, file);

      assertThrowsHardhatError(
        () => {
          dependencyGraph.addRootFile(file.inputSourceName, file);
        },
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message: `File ${file.inputSourceName} already present`,
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
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message: "File `from` from not present",
        },
      );
    });

    it("should add the downstream dependency to the list of files if it doesn't exist yet", () => {
      const upstreamDependency = createProjectResolvedFile("upstream.sol");
      const downstreamDependency = createProjectResolvedFile("downstream.sol");

      dependencyGraph.addRootFile(
        upstreamDependency.inputSourceName,
        upstreamDependency,
      );

      assert.ok(
        !dependencyGraph.hasFile(downstreamDependency),
        `hasFile should return false for file ${downstreamDependency.inputSourceName}`,
      );

      dependencyGraph.addDependency(upstreamDependency, downstreamDependency);

      assert.ok(
        dependencyGraph.hasFile(downstreamDependency),
        `hasFile should return true for file ${downstreamDependency.inputSourceName}`,
      );
    });

    it("should add the downsteam dependency to the list of dependencies of the upstream dependency", () => {
      const upstreamDependency = createProjectResolvedFile("upstream.sol");
      const downstreamDependency = createProjectResolvedFile("downstream.sol");
      dependencyGraph.addRootFile(
        upstreamDependency.inputSourceName,
        upstreamDependency,
      );
      dependencyGraph.addRootFile(
        downstreamDependency.inputSourceName,
        downstreamDependency,
      );
      assert.ok(
        !dependencyGraph
          .getDependencies(upstreamDependency)
          .values()
          .some((dep) => dep.file === downstreamDependency),
        `getDependencies should return false for file ${downstreamDependency.inputSourceName}`,
      );
      dependencyGraph.addDependency(upstreamDependency, downstreamDependency);
      assert.ok(
        dependencyGraph
          .getDependencies(upstreamDependency)
          .values()
          .some((dep) => dep.file === downstreamDependency),
        `getDependencies should return true for file ${downstreamDependency.inputSourceName}`,
      );
    });

    it("Should accumulate all the remappings added for an edge", () => {
      const a = createProjectResolvedFile("a.sol");
      const b = createProjectResolvedFile("b.sol");

      dependencyGraph.addRootFile(a.inputSourceName, a);
      dependencyGraph.addRootFile(b.inputSourceName, b);
      dependencyGraph.addDependency(a, b);
      dependencyGraph.addDependency(a, b, "ab1");
      dependencyGraph.addDependency(a, b, "ab2");
      dependencyGraph.addDependency(a, b);
      dependencyGraph.addDependency(a, b, "ab3");

      dependencyGraph.addDependency(b, a);
      dependencyGraph.addDependency(b, a, "ba1");
      dependencyGraph.addDependency(b, a);
      dependencyGraph.addDependency(b, a, "ba2");

      assert.ok(
        dependencyGraph
          .getDependencies(a)
          .values()
          .some(
            (dep) =>
              dep.file === b &&
              dep.remappings.size === 3 &&
              dep.remappings.has("ab1") &&
              dep.remappings.has("ab2") &&
              dep.remappings.has("ab3"),
          ),
        "Should have the right edge",
      );

      assert.ok(
        dependencyGraph
          .getDependencies(b)
          .values()
          .some(
            (dep) =>
              dep.file === a &&
              dep.remappings.size === 2 &&
              dep.remappings.has("ba1") &&
              dep.remappings.has("ba2"),
          ),
        "Should have the right edge",
      );
    });
  });

  describe("getRoots", () => {
    it("should return a mapping from user source names to roots", () => {
      const root1 = createProjectResolvedFile("root1.sol");
      const root2 = createProjectResolvedFile("root2.sol");
      const dependency1 = createProjectResolvedFile("dependency1.sol");
      const dependency2 = createProjectResolvedFile("dependency2.sol");

      dependencyGraph.addRootFile(root1.inputSourceName, root1);
      dependencyGraph.addRootFile(root2.inputSourceName, root2);
      dependencyGraph.addDependency(root1, dependency1);
      dependencyGraph.addDependency(root2, dependency2);

      const roots = dependencyGraph.getRoots();

      assert.equal(roots.size, 2);
      assert.ok(
        roots.has(root1.inputSourceName),
        `getRoots should return a map with ${root1.inputSourceName} key`,
      );
      assert.equal(roots.get(root1.inputSourceName), root1);
      assert.ok(
        roots.has(root2.inputSourceName),
        `getRoots should return a map with ${root2.inputSourceName} key`,
      );
      assert.equal(roots.get(root2.inputSourceName), root2);
      assert.ok(
        !roots.has(dependency1.inputSourceName),
        `getRoots should return a map without ${dependency1.inputSourceName} key`,
      );
      assert.ok(
        !roots.has(dependency2.inputSourceName),
        `getRoots should return a map without ${dependency2.inputSourceName} key`,
      );
    });
  });

  describe("getAllFiles", () => {
    it("should return the list of all added files", () => {
      const root1 = createProjectResolvedFile("root1.sol");
      const root2 = createProjectResolvedFile("root2.sol");
      const dependency1 = createProjectResolvedFile("dependency1.sol");
      const dependency2 = createProjectResolvedFile("dependency2.sol");

      dependencyGraph.addRootFile(root1.inputSourceName, root1);
      dependencyGraph.addRootFile(root2.inputSourceName, root2);
      dependencyGraph.addDependency(root1, dependency1);
      dependencyGraph.addDependency(root2, dependency2);

      const files = Array.from(dependencyGraph.getAllFiles());

      assert.equal(files.length, 4);
      assert.ok(
        files.includes(root1),
        `getAllFiles should return ${root1.inputSourceName}`,
      );
      assert.ok(
        files.includes(root2),
        `getAllFiles should return ${root2.inputSourceName}`,
      );
      assert.ok(
        files.includes(dependency1),
        `getAllFiles should return ${dependency1.inputSourceName}`,
      );
      assert.ok(
        files.includes(dependency2),
        `getAllFiles should return ${dependency2.inputSourceName}`,
      );
    });
  });

  describe("hasFile", () => {
    it("should return true for files that were previously added", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      dependencyGraph.addRootFile(root.inputSourceName, root);
      dependencyGraph.addDependency(root, dependency);

      assert.ok(
        dependencyGraph.hasFile(root),
        `hasFile should return true for file ${root.inputSourceName}`,
      );
      assert.ok(
        dependencyGraph.hasFile(dependency),
        `hasFile should return true for file ${dependency.inputSourceName}`,
      );
    });

    it("should return false for files that were not added before", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      assert.ok(
        !dependencyGraph.hasFile(root),
        `hasFile should return false for file ${root.inputSourceName}`,
      );
      assert.ok(
        !dependencyGraph.hasFile(dependency),
        `hasFile should return false for file ${dependency.inputSourceName}`,
      );
    });
  });

  describe("getDependencies", () => {
    it("should return a set of dependencies for a given file if it exists", () => {
      const root = createProjectResolvedFile("root.sol");
      dependencyGraph.addRootFile(root.inputSourceName, root);
      const dependencies = [];
      for (let i = 0; i < 10; i++) {
        const dependency = createProjectResolvedFile(`dependency${i}.sol`);
        dependencyGraph.addDependency(root, dependency, `dependency${i}.sol`);
        dependencies.push(dependency);
      }
      const actualDependencies = dependencyGraph.getDependencies(root);
      assert.equal(actualDependencies.size, 10);
      for (const dependency of dependencies) {
        assert.ok(
          actualDependencies
            .values()
            .some(
              (dep) =>
                dep.file === dependency &&
                dep.remappings.size === 1 &&
                dep.remappings.has(dependency.inputSourceName),
            ),
          `getDependencies should return a set with ${dependency.inputSourceName} element and the remapping used`,
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
    it("should return the file by its' input source name if the file was previously added", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      dependencyGraph.addRootFile(root.inputSourceName, root);
      dependencyGraph.addDependency(root, dependency);

      const rootFile = dependencyGraph.getFileByInputSourceName(
        root.inputSourceName,
      );
      const dependencyFile = dependencyGraph.getFileByInputSourceName(
        dependency.inputSourceName,
      );

      assert.equal(rootFile, root);
      assert.equal(dependencyFile, dependency);
    });

    it("should return undefined if a file was not added before", () => {
      const file = dependencyGraph.getFileByInputSourceName("root.sol");

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

      dependencyGraph.addRootFile(root1.inputSourceName, root1);
      dependencyGraph.addRootFile(root2.inputSourceName, root2);
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

      dependencyGraph.addDependency(
        dependency1,
        transitiveDependency1,
        "remapping1",
      );
      dependencyGraph.addDependency(
        dependency1,
        transitiveDependency1,
        "remapping2",
      );

      const subgraph = dependencyGraph.getSubgraph(root1.inputSourceName);

      const roots = subgraph.getRoots();
      assert.equal(roots.size, 1);
      assert.ok(
        roots.has(root1.inputSourceName),
        `getRoots should return a map with ${root1.inputSourceName} key`,
      );
      assert.ok(
        !roots.has(root2.inputSourceName),
        `getRoots should return a map without ${root2.inputSourceName} key`,
      );

      const files = Array.from(subgraph.getAllFiles());
      assert.equal(files.length, 6);
      assert.ok(
        files.includes(root1),
        `getAllFiles should include ${root1.inputSourceName}`,
      );
      assert.ok(
        !files.includes(root2),
        `getAllFiles should not include ${root2.inputSourceName}`,
      );
      assert.ok(
        files.includes(dependency1),
        `getAllFiles should include ${dependency1.inputSourceName}`,
      );
      assert.ok(
        !files.includes(dependency2),
        `getAllFiles should not include ${dependency2.inputSourceName}`,
      );
      assert.ok(
        files.includes(transitiveDependency1),
        `getAllFiles should include ${transitiveDependency1.inputSourceName}`,
      );
      assert.ok(
        files.includes(transitiveDependency2),
        `getAllFiles should include ${transitiveDependency2.inputSourceName}`,
      );
      assert.ok(
        !files.includes(transitiveDependency3),
        `getAllFiles should not include ${transitiveDependency3.inputSourceName}`,
      );
      assert.ok(
        files.includes(nestedTransitiveDependency1),
        `getAllFiles should include ${nestedTransitiveDependency1.inputSourceName}`,
      );
      assert.ok(
        files.includes(nestedTransitiveDependency2),
        `getAllFiles should include ${nestedTransitiveDependency2.inputSourceName}`,
      );

      // it should keep the remappings of the edges
      assert.ok(
        subgraph
          .getDependencies(dependency1)
          .values()
          .some(
            (dep) =>
              dep.file === transitiveDependency1 &&
              dep.remappings.size === 2 &&
              dep.remappings.has("remapping1") &&
              dep.remappings.has("remapping2"),
          ),
        `subgraphs should preserve the remappings of the edges`,
      );
    });

    it("should throw if a file was not added before", () => {
      assertThrowsHardhatError(
        () => {
          dependencyGraph.getSubgraph("root.sol");
        },
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message: "We should have a root for every root user source name",
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

      dependencyGraph.addRootFile(root.inputSourceName, root);
      dependencyGraph.addDependency(root, dependency);

      const mergedGraph = dependencyGraph.merge(otherDependencyGraph);

      const roots = mergedGraph.getRoots();
      assert.equal(roots.size, 1);
      assert.ok(
        roots.has(root.inputSourceName),
        `getRoots should return a map with ${root.inputSourceName} key`,
      );
      assert.equal(roots.get(root.inputSourceName), root);

      const files = Array.from(mergedGraph.getAllFiles());
      assert.equal(files.length, 2);
      assert.ok(
        files.includes(root),
        `getAllFiles should include ${root.inputSourceName}`,
      );
      assert.ok(
        files.includes(dependency),
        `getAllFiles should include ${dependency.inputSourceName}`,
      );
    });

    it("should return a copy of the second graph if the first graph is empty", () => {
      const root = createProjectResolvedFile("root.sol");
      const dependency = createProjectResolvedFile("dependency.sol");

      const otherDependencyGraph = new DependencyGraphImplementation();

      otherDependencyGraph.addRootFile(root.inputSourceName, root);
      otherDependencyGraph.addDependency(root, dependency);

      const mergedGraph = dependencyGraph.merge(otherDependencyGraph);

      const roots = mergedGraph.getRoots();
      assert.equal(roots.size, 1);
      assert.ok(
        roots.has(root.inputSourceName),
        `getRoots should return a map with ${root.inputSourceName} key`,
      );
      assert.equal(roots.get(root.inputSourceName), root);

      const files = Array.from(mergedGraph.getAllFiles());
      assert.equal(files.length, 2);
      assert.ok(
        files.includes(root),
        `getAllFiles should include ${root.inputSourceName}`,
      );
      assert.ok(
        files.includes(dependency),
        `getAllFiles should include ${dependency.inputSourceName}`,
      );
    });

    it("should merge two graphs", () => {
      const root1 = createProjectResolvedFile("root1.sol");
      const root2 = createProjectResolvedFile("root2.sol");

      const otherDependencyGraph = new DependencyGraphImplementation();

      dependencyGraph.addRootFile(root1.inputSourceName, root1);
      otherDependencyGraph.addRootFile(root2.inputSourceName, root2);

      const mergedGraph = dependencyGraph.merge(otherDependencyGraph);

      const roots = mergedGraph.getRoots();
      assert.equal(roots.size, 2);
      assert.ok(
        roots.has(root1.inputSourceName),
        `getRoots should return a map with ${root1.inputSourceName} key`,
      );
      assert.equal(roots.get(root1.inputSourceName), root1);
      assert.ok(
        roots.has(root2.inputSourceName),
        `getRoots should return a map with ${root2.inputSourceName} key`,
      );
      assert.equal(roots.get(root2.inputSourceName), root2);

      const files = Array.from(mergedGraph.getAllFiles());
      assert.equal(files.length, 2);
      assert.ok(
        files.includes(root1),
        `getAllFiles should include ${root1.inputSourceName}`,
      );
      assert.ok(
        files.includes(root2),
        `getAllFiles should include ${root2.inputSourceName}`,
      );
    });

    it("Should merge the remappings of the edges", () => {
      const a = createProjectResolvedFile("a.sol");
      const b = createProjectResolvedFile("b.sol");
      const c = createProjectResolvedFile("c.sol");
      const d = createProjectResolvedFile("d.sol");
      const e = createProjectResolvedFile("e.sol");

      dependencyGraph.addRootFile(a.inputSourceName, a);
      dependencyGraph.addRootFile(b.inputSourceName, b);
      dependencyGraph.addRootFile(c.inputSourceName, c);

      dependencyGraph.addDependency(a, b);
      dependencyGraph.addDependency(a, c, "ac1");
      dependencyGraph.addDependency(a, c, "ac2");
      dependencyGraph.addDependency(b, c, "bc1");

      const otherDependencyGraph = new DependencyGraphImplementation();
      otherDependencyGraph.addRootFile(b.inputSourceName, b);
      otherDependencyGraph.addRootFile(c.inputSourceName, c);
      otherDependencyGraph.addRootFile(d.inputSourceName, d);
      otherDependencyGraph.addRootFile(e.inputSourceName, e);

      otherDependencyGraph.addDependency(b, c, "bc1");
      otherDependencyGraph.addDependency(b, c, "bc2");
      otherDependencyGraph.addDependency(b, d, "bd1");
      otherDependencyGraph.addDependency(c, d, "cd1");

      const mergedGraph = dependencyGraph.merge(otherDependencyGraph);

      const expectedJson: Return<typeof mergedGraph.toJSON> = {
        fileByInputSourceName: {
          [a.inputSourceName]: a,
          [b.inputSourceName]: b,
          [c.inputSourceName]: c,
          [d.inputSourceName]: d,
          [e.inputSourceName]: e,
        },
        rootByUserSourceName: {
          [a.inputSourceName]: a.inputSourceName,
          [b.inputSourceName]: b.inputSourceName,
          [c.inputSourceName]: c.inputSourceName,
          [d.inputSourceName]: d.inputSourceName,
          [e.inputSourceName]: e.inputSourceName,
        },
        dependencies: {
          [a.inputSourceName]: {
            [b.inputSourceName]: [],
            [c.inputSourceName]: ["ac1", "ac2"],
          },
          [b.inputSourceName]: {
            [c.inputSourceName]: ["bc1", "bc2"],
            [d.inputSourceName]: ["bd1"],
          },
          [c.inputSourceName]: {
            [d.inputSourceName]: ["cd1"],
          },
          [d.inputSourceName]: {},
          [e.inputSourceName]: {},
        },
      };

      assert.deepEqual(mergedGraph.toJSON(), expectedJson);
    });
  });
});
