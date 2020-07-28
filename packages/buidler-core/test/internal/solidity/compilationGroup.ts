import { assert } from "chai";
import * as fs from "fs";
import path from "path";

import { SolidityFilesCache } from "../../../src/builtin-tasks/utils/solidity-files-cache";
import { createCompilationGroups } from "../../../src/internal/solidity/compilationGroup";
import { DependencyGraph } from "../../../src/internal/solidity/dependencyGraph";
import {
  ResolvedFile,
  Resolver,
} from "../../../src/internal/solidity/resolver";

const defaultOptimizer = {
  enabled: false,
  runs: 200,
};

const solcConfig055 = {
  compilers: [{ version: "0.5.5", optimizer: defaultOptimizer }],
};
const solcConfig066 = {
  compilers: [{ version: "0.6.6", optimizer: defaultOptimizer }],
};
const solcConfig055and066 = {
  compilers: [
    { version: "0.5.5", optimizer: defaultOptimizer },
    { version: "0.6.6", optimizer: defaultOptimizer },
  ],
};

const projectRoot = fs.realpathSync(".");

class MockFile {
  public readonly globalName: string;
  public readonly absolutePath: string;

  constructor(
    public name: string,
    public versionPragmas: string[],
    public readonly modified: "new" | "modified" | "not-modified"
  ) {
    this.globalName = `contracts/${name}.sol`;
    this.absolutePath = path.join(projectRoot, "contracts", `${name}.sol`);
  }
}

async function createMockData(
  filesAndDependencies: Array<[MockFile, MockFile[]]>
): Promise<[DependencyGraph, SolidityFilesCache, ResolvedFile[]]> {
  const dependencies = new Map<MockFile, MockFile[]>(filesAndDependencies);

  const solidityFilesCache: SolidityFilesCache = {};
  const mockFileToResolvedFile: Map<MockFile, ResolvedFile> = new Map();

  const importsMap = new Map<string, ResolvedFile>();

  const resolvedFiles = [...dependencies.keys()].map((mockFile) => {
    const resolvedFile = new ResolvedFile(
      mockFile.globalName,
      mockFile.absolutePath,
      {
        rawContent: "mock file",
        imports: (dependencies.get(mockFile) ?? []).map(
          (dependency) => `./${dependency.name}.sol`
        ),
        versionPragmas: mockFile.versionPragmas,
      },
      new Date()
    );

    mockFileToResolvedFile.set(mockFile, resolvedFile);
    importsMap.set(`./${mockFile.name}.sol`, resolvedFile);

    if (mockFile.modified === "not-modified") {
      solidityFilesCache[mockFile.absolutePath] = {
        lastModificationDate: resolvedFile.lastModificationDate.valueOf(),
      };
    } else if (mockFile.modified === "modified") {
      solidityFilesCache[mockFile.absolutePath] = {
        lastModificationDate:
          resolvedFile.lastModificationDate.valueOf() - 1000,
      };
    }

    return resolvedFile;
  });

  const resolver = new Resolver(projectRoot);
  resolver.resolveImport = async (from: ResolvedFile, imported: string) => {
    const importedFile = importsMap.get(imported);
    if (importedFile === undefined) {
      throw new Error(`${imported} is not mocked`);
    }

    return importedFile;
  };

  const dependencyGraph = await DependencyGraph.createFromResolvedFiles(
    resolver,
    resolvedFiles
  );

  return [dependencyGraph, solidityFilesCache, resolvedFiles];
}

describe("Compilation groups", function () {
  describe("single file", function () {
    it("new file", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([[FooMock, []]]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });

    it("modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([[FooMock, []]]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });

    it("not modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("two files without dependencies, same versions", function () {
    it("both new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        [FooMock, []],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("first one modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache, [Foo]] = await createMockData(
        [
          [FooMock, []],
          [BarMock, []],
        ]
      );

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });

    it("second one modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [, Bar],
      ] = await createMockData([
        [FooMock, []],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Bar]);
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("none modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, []],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("two files without depenencies, different versions", function () {
    it("both new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        [FooMock, []],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));

      assert(group06.getVersion() === "0.6.6");
      assert.sameMembers(group06.getResolvedFiles(), [Bar]);
      assert.isTrue(group06.emitsArtifacts(Bar));
    });

    it("first one modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache, [Foo]] = await createMockData(
        [
          [FooMock, []],
          [BarMock, []],
        ]
      );

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));

      assert(group06.getVersion() === "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("second one modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [, Bar],
      ] = await createMockData([
        [FooMock, []],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert(group06.getVersion() === "0.6.6");
      assert.sameMembers(group06.getResolvedFiles(), [Bar]);
      assert.isTrue(group06.emitsArtifacts(Bar));
    });

    it("none modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, []],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert(group06.getVersion() === "0.6.6");
      assert.isTrue(group06.isEmpty());
    });
  });

  describe("two files, one imports the other", function () {
    it("both new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("the importer changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Bar));
    });

    it("the imported changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("two files, import loop", function () {
    it("both new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("the first one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("the second one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("three files, sequential import", function () {
    it("all new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "new");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isTrue(group05.emitsArtifacts(Qux));
    });

    it("first one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Bar));
      assert.isFalse(group05.emitsArtifacts(Qux));
    });

    it("second one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isFalse(group05.emitsArtifacts(Qux));
    });

    it("third one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isTrue(group05.emitsArtifacts(Qux));
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("three files, loop import", function () {
    it("all new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "new");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isTrue(group05.emitsArtifacts(Qux));
    });

    it("first one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isTrue(group05.emitsArtifacts(Qux));
    });

    it("second one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isTrue(group05.emitsArtifacts(Qux));
    });

    it("third one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isTrue(group05.emitsArtifacts(Qux));
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, [QuxMock]],
        [QuxMock, [FooMock]],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("three files, one imports the other two", function () {
    it("all new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "new");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock, QuxMock]],
        [BarMock, []],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isTrue(group05.emitsArtifacts(Qux));
    });

    it("the importer changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock, QuxMock]],
        [BarMock, []],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Bar));
      assert.isFalse(group05.emitsArtifacts(Qux));
    });

    it("the first imported one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock, QuxMock]],
        [BarMock, []],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
      assert.isFalse(group05.emitsArtifacts(Qux));
    });

    it("the second imported one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [BarMock, QuxMock]],
        [BarMock, []],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Bar));
      assert.isTrue(group05.emitsArtifacts(Qux));
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const QuxMock = new MockFile("Qux", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, [BarMock, QuxMock]],
        [BarMock, []],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      assert(compilationGroups.length === 1);

      const [group05] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("two files with different versions depend on the same one", function () {
    it("all new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "new");
      const QuxMock = new MockFile("Qux", [">=0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [QuxMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Qux));

      assert(group06.getVersion() === "0.6.6");
      assert.sameMembers(group06.getResolvedFiles(), [Bar, Qux]);
      assert.isTrue(group06.emitsArtifacts(Bar));
      assert.isTrue(group06.emitsArtifacts(Qux));
    });

    it("first importer changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "modified");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "not-modified");
      const QuxMock = new MockFile("Qux", [">=0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, , Qux],
      ] = await createMockData([
        [FooMock, [QuxMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Qux));

      assert(group06.getVersion() === "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("second importer changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "modified");
      const QuxMock = new MockFile("Qux", [">=0.5.0"], "not-modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [, Bar, Qux],
      ] = await createMockData([
        [FooMock, [QuxMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert(group06.getVersion() === "0.6.6");
      assert.sameMembers(group06.getResolvedFiles(), [Bar, Qux]);
      assert.isTrue(group06.emitsArtifacts(Bar));
      assert.isFalse(group06.emitsArtifacts(Qux));
    });

    it("imported changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "not-modified");
      const QuxMock = new MockFile("Qux", [">=0.5.0"], "modified");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        [FooMock, [QuxMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Qux));

      assert(group06.getVersion() === "0.6.6");
      assert.sameMembers(group06.getResolvedFiles(), [Bar, Qux]);
      assert.isTrue(group06.emitsArtifacts(Bar));
      assert.isTrue(group06.emitsArtifacts(Qux));
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.6.0"], "not-modified");
      const QuxMock = new MockFile("Qux", [">=0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, [QuxMock]],
        [BarMock, [QuxMock]],
        [QuxMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      assert(compilationGroups.length === 2);

      const [group05, group06] = compilationGroups;

      assert(group05.getVersion() === "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert(group06.getVersion() === "0.6.6");
      assert.isTrue(group06.isEmpty());
    });
  });
});
