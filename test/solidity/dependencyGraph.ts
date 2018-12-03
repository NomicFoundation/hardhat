import { DependencyGraph } from "../../src/solidity/dependencyGraph";
import { ResolvedFile, Resolver } from "../../src/solidity/resolver";
import * as fs from "fs";
import { assert } from "chai";

function assertDeps(
  graph: DependencyGraph,
  file: ResolvedFile,
  ...deps: ResolvedFile[]
) {
  assert.isTrue(graph.dependenciesPerFile.has(file));
  const resolvedDeps = graph.dependenciesPerFile.get(file);

  if (resolvedDeps === undefined) {
    throw Error("This should never happen. Just making TS happy.");
  }

  assert.equal(resolvedDeps.size, deps.length);
  assert.includeMembers(Array.from(resolvedDeps), deps);
}

function assertResolvedFiles(graph: DependencyGraph, ...files: ResolvedFile[]) {
  const resolvedFiles = graph.getResolvedFiles();

  assert.equal(resolvedFiles.length, files.length);
  assert.includeMembers(resolvedFiles, files);
}

describe("Dependency Graph", () => {
  let resolver: Resolver;
  let projectRoot: string;
  let fileWithoutDependencies: ResolvedFile;
  let fileWithoutDependencies2: ResolvedFile;
  let fileWithoutDependencies3: ResolvedFile;
  let dependsOnWDAndW2: ResolvedFile;
  let dependsOnWD: ResolvedFile;
  let loop1: ResolvedFile;
  let loop2: ResolvedFile;
  let dependsOnLoop2: ResolvedFile;

  before("Mock some resolved files", () => {
    projectRoot = fs.realpathSync(".");

    fileWithoutDependencies = new ResolvedFile(
      "contracts/WD.sol",
      projectRoot + "/contracts/WD.sol",
      "no dependecy",
      new Date()
    );

    fileWithoutDependencies2 = new ResolvedFile(
      "contracts/WD2.sol",
      projectRoot + "/contracts/WD2.sol",
      "no dependecy",
      new Date()
    );

    fileWithoutDependencies3 = new ResolvedFile(
      "contracts/WD3.sol",
      projectRoot + "/contracts/WD3.sol",
      "no dependecy",
      new Date()
    );

    dependsOnWDAndW2 = new ResolvedFile(
      "contracts/dependsOnWDAndW2.sol",
      projectRoot + "/contracts/dependsOnWDAndW2.sol",
      'import "./WD.sol"; import "./WD2.sol";',
      new Date()
    );

    dependsOnWD = new ResolvedFile(
      "contracts/dependsOnWD.sol",
      projectRoot + "/contracts/dependsOnWD.sol",
      'import "./WD.sol";',
      new Date()
    );

    loop1 = new ResolvedFile(
      "contracts/loop1.sol",
      projectRoot + "/contracts/loop1.sol",
      'import "./loop2.sol";',
      new Date()
    );

    loop2 = new ResolvedFile(
      "contracts/loop2.sol",
      projectRoot + "/contracts/loop2.sol",
      'import "./loop1.sol";',
      new Date()
    );

    dependsOnLoop2 = new ResolvedFile(
      "contracts/dependsOnLoop2.sol",
      projectRoot + "/contracts/dependsOnLoop2.sol",
      'import "./loop2.sol";',
      new Date()
    );

    resolver = new Resolver(projectRoot);
    resolver.resolveImport = async (from: ResolvedFile, imported: string) => {
      switch (imported) {
        case "./WD.sol":
          return fileWithoutDependencies;
        case "./WD2.sol":
          return fileWithoutDependencies2;
        case "./loop1.sol":
          return loop1;
        case "./loop2.sol":
          return loop2;

        default:
          throw new Error(imported + " is not mocked");
      }
    };
  });

  it("should give an empty graph if there's no entry point", async () => {
    const graph = await DependencyGraph.createFromResolvedFiles(resolver, []);
    assert.isEmpty(graph.dependenciesPerFile);
  });

  it("should give a graph with a single node if the only entry point has no deps", async () => {
    const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
      fileWithoutDependencies
    ]);

    assertResolvedFiles(graph, fileWithoutDependencies);
    assertDeps(graph, fileWithoutDependencies);
  });

  it("should work with multiple entry points without deps", async () => {
    const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
      fileWithoutDependencies,
      fileWithoutDependencies2
    ]);
    assertResolvedFiles(
      graph,
      fileWithoutDependencies,
      fileWithoutDependencies2
    );
    assertDeps(graph, fileWithoutDependencies);
    assertDeps(graph, fileWithoutDependencies2);
  });

  it("should work with an entry point with deps", async () => {
    const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
      dependsOnWDAndW2
    ]);
    assertResolvedFiles(
      graph,
      fileWithoutDependencies,
      fileWithoutDependencies2,
      dependsOnWDAndW2
    );
    assertDeps(graph, fileWithoutDependencies);
    assertDeps(graph, fileWithoutDependencies2);
    assertDeps(
      graph,
      dependsOnWDAndW2,
      fileWithoutDependencies,
      fileWithoutDependencies2
    );
  });

  it("should work with the same file being reachable from multiple entry pints", async () => {
    const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
      dependsOnWDAndW2,
      fileWithoutDependencies
    ]);

    assertResolvedFiles(
      graph,
      fileWithoutDependencies,
      fileWithoutDependencies2,
      dependsOnWDAndW2
    );
    assertDeps(graph, fileWithoutDependencies);
    assertDeps(graph, fileWithoutDependencies2);
    assertDeps(
      graph,
      dependsOnWDAndW2,
      fileWithoutDependencies,
      fileWithoutDependencies2
    );

    const graph2 = await DependencyGraph.createFromResolvedFiles(resolver, [
      dependsOnWDAndW2,
      dependsOnWD
    ]);

    assertResolvedFiles(
      graph2,
      fileWithoutDependencies,
      fileWithoutDependencies2,
      dependsOnWDAndW2,
      dependsOnWD
    );
    assertDeps(graph2, fileWithoutDependencies);
    assertDeps(graph2, fileWithoutDependencies2);
    assertDeps(
      graph2,
      dependsOnWDAndW2,
      fileWithoutDependencies,
      fileWithoutDependencies2
    );
    assertDeps(graph2, dependsOnWD, fileWithoutDependencies);
  });

  it("should work with an isolated file", async () => {
    const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
      dependsOnWDAndW2,
      fileWithoutDependencies3
    ]);

    assertResolvedFiles(
      graph,
      fileWithoutDependencies,
      fileWithoutDependencies2,
      dependsOnWDAndW2,
      fileWithoutDependencies3
    );
    assertDeps(graph, fileWithoutDependencies);
    assertDeps(graph, fileWithoutDependencies2);
    assertDeps(graph, fileWithoutDependencies3);
    assertDeps(
      graph,
      dependsOnWDAndW2,
      fileWithoutDependencies,
      fileWithoutDependencies2
    );
  });

  it("should work with cyclic dependencies", async () => {
    const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
      dependsOnLoop2,
      fileWithoutDependencies3
    ]);

    assertResolvedFiles(
      graph,
      loop1,
      loop2,
      dependsOnLoop2,
      fileWithoutDependencies3
    );
    assertDeps(graph, loop1, loop2);
    assertDeps(graph, loop2, loop1);
    assertDeps(graph, dependsOnLoop2, loop2);
    assertDeps(graph, fileWithoutDependencies3);
  });
});
