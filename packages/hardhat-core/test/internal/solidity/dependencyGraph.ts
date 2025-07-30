import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";

import { DependencyGraph } from "../../../src/internal/solidity/dependencyGraph";
import { Parser } from "../../../src/internal/solidity/parse";
import {
  ResolvedFile,
  Resolver,
} from "../../../src/internal/solidity/resolver";
import * as taskTypes from "../../../src/types/builtin-tasks";
import {
  getFixtureProjectPath,
  useFixtureProject,
} from "../../helpers/project";

import { getRealPathSync } from "../../../src/internal/util/fs-utils";
import { createMockData, MockFile } from "./helpers";

function assertDeps(
  graph: taskTypes.DependencyGraph,
  file: ResolvedFile,
  ...deps: ResolvedFile[]
) {
  assert.includeMembers(graph.getResolvedFiles(), [file]);
  const resolvedDeps = graph.getDependencies(file);

  if (resolvedDeps === undefined) {
    throw Error("This should never happen. Just making TS happy.");
  }

  assert.equal(resolvedDeps.length, deps.length);
  assert.includeMembers(Array.from(resolvedDeps), deps);
}

function assertResolvedFiles(
  graph: taskTypes.DependencyGraph,
  ...files: ResolvedFile[]
) {
  const resolvedFiles = graph.getResolvedFiles();

  assert.equal(resolvedFiles.length, files.length);
  assert.includeMembers(resolvedFiles, files);
}

describe("Dependency Graph", function () {
  describe("createFromResolvedFiles", function () {
    let resolver: Resolver;
    let projectRoot: string;
    let fileWithoutDependencies: ResolvedFile;
    let fileWithoutDependencies2: ResolvedFile;
    let fileWithoutDependencies3: ResolvedFile;
    let dependsOnWDAndW2: ResolvedFile;
    let dependsOnWD: ResolvedFile;
    let loop1: ResolvedFile;
    let loop2: ResolvedFile;

    before("Mock some resolved files", function () {
      projectRoot = getRealPathSync(".");

      fileWithoutDependencies = new ResolvedFile(
        "contracts/WD.sol",
        path.join(projectRoot, "contracts", "WD.sol"),
        { rawContent: "no dependency", imports: [], versionPragmas: [] },
        "<content-hash-wd>",
        new Date()
      );

      fileWithoutDependencies2 = new ResolvedFile(
        "contracts/WD2.sol",
        path.join(projectRoot, "contracts", "WD2.sol"),
        { rawContent: "no dependency", imports: [], versionPragmas: [] },
        "<content-hash-wd2>",
        new Date()
      );

      fileWithoutDependencies3 = new ResolvedFile(
        "contracts/WD3.sol",
        path.join(projectRoot, "contracts", "WD3.sol"),
        { rawContent: "no dependency", imports: [], versionPragmas: [] },
        "<content-hash-wd3>",
        new Date()
      );

      dependsOnWDAndW2 = new ResolvedFile(
        "contracts/dependsOnWDAndW2.sol",
        path.join(projectRoot, "contracts", "dependsOnWDAndW2.sol"),
        {
          rawContent: 'import "./WD.sol"; import "./WD2.sol";',
          imports: ["./WD.sol", "./WD2.sol"],
          versionPragmas: [],
        },
        "<content-hash-wd4>",
        new Date()
      );

      dependsOnWD = new ResolvedFile(
        "contracts/dependsOnWD.sol",
        path.join(projectRoot, "contracts", "dependsOnWD.sol"),
        {
          rawContent: 'import "./WD.sol";',
          imports: ["./WD.sol"],
          versionPragmas: [],
        },
        "<content-hash-depends-on-wd>",
        new Date()
      );

      loop1 = new ResolvedFile(
        "contracts/loop1.sol",
        path.join(projectRoot, "contracts", "loop1.sol"),
        {
          rawContent: 'import "./loop2.sol";',
          imports: ["./loop2.sol"],
          versionPragmas: [],
        },
        "<content-hash-loop1>",
        new Date()
      );

      loop2 = new ResolvedFile(
        "contracts/loop2.sol",
        path.join(projectRoot, "contracts", "loop2.sol"),
        {
          rawContent: 'import "./loop1.sol";',
          imports: ["./loop1.sol"],
          versionPragmas: [],
        },
        "<content-hash-loop2>",
        new Date()
      );

      resolver = new Resolver(
        projectRoot,
        new Parser(),
        {},
        (absolutePath: string) =>
          fsExtra.readFile(absolutePath, { encoding: "utf8" }),
        async (sourceName: string) => sourceName
      );
      resolver.resolveImport = async (_: ResolvedFile, imported: string) => {
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
            throw new Error(`${imported} is not mocked`);
        }
      };
    });

    it("should give an empty graph if there's no entry point", async function () {
      const graph = await DependencyGraph.createFromResolvedFiles(resolver, []);
      assert.isEmpty(graph.getResolvedFiles());
    });

    it("should give a graph with a single node if the only entry point has no deps", async function () {
      const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
        fileWithoutDependencies,
      ]);

      assertResolvedFiles(graph, fileWithoutDependencies);
      assertDeps(graph, fileWithoutDependencies);
    });

    it("should work with multiple entry points without deps", async function () {
      const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
        fileWithoutDependencies,
        fileWithoutDependencies2,
      ]);
      assertResolvedFiles(
        graph,
        fileWithoutDependencies,
        fileWithoutDependencies2
      );
      assertDeps(graph, fileWithoutDependencies);
      assertDeps(graph, fileWithoutDependencies2);
    });

    it("should work with an entry point with deps", async function () {
      const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
        dependsOnWDAndW2,
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

    it("should work with the same file being reachable from multiple entry pints", async function () {
      const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
        dependsOnWDAndW2,
        fileWithoutDependencies,
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
        dependsOnWD,
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

    it("should work with an isolated file", async function () {
      const graph = await DependencyGraph.createFromResolvedFiles(resolver, [
        dependsOnWDAndW2,
        fileWithoutDependencies3,
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

    describe("Cyclic dependencies", function () {
      const PROJECT = "cyclic-dependencies-project";
      useFixtureProject(PROJECT);

      let localResolver: Resolver;
      before("Get project root", async function () {
        localResolver = new Resolver(
          await getFixtureProjectPath(PROJECT),
          new Parser(),
          {},
          (absolutePath: string) =>
            fsExtra.readFile(absolutePath, { encoding: "utf8" }),
          async (sourceName: string) => sourceName
        );
      });

      it("should work with cyclic dependencies", async () => {
        const fileA = await localResolver.resolveSourceName("contracts/A.sol");
        const fileB = await localResolver.resolveSourceName("contracts/B.sol");

        const graph = await DependencyGraph.createFromResolvedFiles(
          localResolver,
          [fileA]
        );

        const graphFiles = Array.from(graph.getResolvedFiles());
        graphFiles.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));

        assert.equal(graphFiles.length, 2);

        const [graphsA, graphsB] = graphFiles;
        assert.deepEqual(graphsA, fileA);
        assert.deepEqual(graphsB, fileB);

        assert.equal(graph.getDependencies(graphsA).length, 1);

        const graphsADep = Array.from(
          graph.getDependencies(graphsA)!.values()
        )[0];
        assert.deepEqual(graphsADep, fileB);

        assert.equal(graph.getDependencies(graphsB).length, 1);

        const graphsBDep = graph.getDependencies(graphsB)[0];
        assert.deepEqual(graphsBDep, fileA);
      });
    });
  });

  describe("getConnectedComponents", function () {
    it("single file", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [graph, [Foo]] = await createMockData([{ file: FooMock }]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [Foo]);
    });

    it("two independent files", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [graph, [Foo, Bar]] = await createMockData([
        { file: FooMock },
        { file: BarMock },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 2);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [Foo]);
      assert.sameMembers(connectedComponents[1].getResolvedFiles(), [Bar]);
    });

    it("one file imports another one", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [graph, [Foo, Bar]] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [Foo, Bar]);
    });

    it("one file imports a library", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const LibMock = new MockFile("Lib", ["^0.5.0"], "SomeLibrary");
      const [graph, [Foo, Lib]] = await createMockData([
        { file: FooMock, dependencies: [LibMock] },
        { file: LibMock },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [Foo, Lib]);
    });

    it("two files loop", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [graph, [Foo, Bar]] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock, dependencies: [FooMock] },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [Foo, Bar]);
    });

    it("three files sequential import", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [graph, [Foo, Bar, Qux]] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock, dependencies: [QuxMock] },
        { file: QuxMock },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [
        Foo,
        Bar,
        Qux,
      ]);
    });

    it("three files, Foo->Bar and Qux", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [graph, [Foo, Bar, Qux]] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock },
        { file: QuxMock },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 2);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [Foo, Bar]);
      assert.sameMembers(connectedComponents[1].getResolvedFiles(), [Qux]);
    });

    it("three files loop", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [graph, [Foo, Bar, Qux]] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock, dependencies: [QuxMock] },
        { file: QuxMock, dependencies: [FooMock] },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [
        Foo,
        Bar,
        Qux,
      ]);
    });

    it("three files, one imports the other two", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [graph, [Foo, Bar, Qux]] = await createMockData([
        { file: FooMock, dependencies: [BarMock, QuxMock] },
        { file: BarMock },
        { file: QuxMock },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [
        Foo,
        Bar,
        Qux,
      ]);
    });

    it("three files, two files import the same one", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [graph, [Foo, Bar, Qux]] = await createMockData([
        { file: FooMock, dependencies: [QuxMock] },
        { file: BarMock, dependencies: [QuxMock] },
        { file: QuxMock },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [
        Foo,
        Bar,
        Qux,
      ]);
    });

    it("four files, Foo1->Foo2 and Bar1<->Bar2", async function () {
      const Foo1Mock = new MockFile("Foo1", ["^0.5.0"]);
      const Foo2Mock = new MockFile("Foo2", ["^0.5.0"]);
      const Bar1Mock = new MockFile("Bar1", ["^0.5.0"]);
      const Bar2Mock = new MockFile("Bar2", ["^0.5.0"]);
      const [graph, [Foo1, Foo2, Bar1, Bar2]] = await createMockData([
        { file: Foo1Mock, dependencies: [Foo2Mock] },
        { file: Foo2Mock },
        { file: Bar1Mock, dependencies: [Bar2Mock] },
        { file: Bar2Mock, dependencies: [Bar1Mock] },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 2);
      assert.sameMembers(connectedComponents[0].getResolvedFiles(), [
        Foo1,
        Foo2,
      ]);
      assert.sameMembers(connectedComponents[1].getResolvedFiles(), [
        Bar1,
        Bar2,
      ]);
    });

    it("five files, three layers, 2-1-2", async function () {
      const Layer1AMock = new MockFile("Layer1A", ["^0.5.0"]);
      const Layer1BMock = new MockFile("Layer1B", ["^0.5.0"]);
      const Layer2Mock = new MockFile("Layer2", ["^0.5.0"]);
      const Layer3AMock = new MockFile("Layer3A", ["^0.5.0"]);
      const Layer3BMock = new MockFile("Layer3B", ["^0.5.0"]);
      const [graph, resolvedFiles] = await createMockData([
        { file: Layer1AMock, dependencies: [Layer2Mock] },
        { file: Layer1BMock, dependencies: [Layer2Mock] },
        { file: Layer2Mock, dependencies: [Layer3AMock, Layer3BMock] },
        { file: Layer3AMock, dependencies: [] },
        { file: Layer3BMock, dependencies: [] },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(
        connectedComponents[0].getResolvedFiles(),
        resolvedFiles
      );
    });

    it("six files, three layers, 2-2-2", async function () {
      const Layer1AMock = new MockFile("Layer1A", ["^0.5.0"]);
      const Layer1BMock = new MockFile("Layer1B", ["^0.5.0"]);
      const Layer2AMock = new MockFile("Layer2A", ["^0.5.0"]);
      const Layer2BMock = new MockFile("Layer2B", ["^0.5.0"]);
      const Layer3AMock = new MockFile("Layer3A", ["^0.5.0"]);
      const Layer3BMock = new MockFile("Layer3B", ["^0.5.0"]);
      const [graph, resolvedFiles] = await createMockData([
        { file: Layer1AMock, dependencies: [Layer2AMock, Layer2BMock] },
        { file: Layer1BMock, dependencies: [Layer2AMock, Layer2BMock] },
        { file: Layer2AMock, dependencies: [Layer3AMock, Layer3BMock] },
        { file: Layer2BMock, dependencies: [Layer3AMock, Layer3BMock] },
        { file: Layer3AMock, dependencies: [] },
        { file: Layer3BMock, dependencies: [] },
      ]);

      const connectedComponents = graph.getConnectedComponents();

      assert.lengthOf(connectedComponents, 1);
      assert.sameMembers(
        connectedComponents[0].getResolvedFiles(),
        resolvedFiles
      );
    });
  });
});
