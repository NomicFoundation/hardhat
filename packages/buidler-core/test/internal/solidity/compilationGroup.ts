import { assert } from "chai";
import * as fs from "fs";
import path from "path";
import semver from "semver";

import { SolidityFilesCache } from "../../../src/builtin-tasks/utils/solidity-files-cache";
import {
  CompilationGroup,
  createCompilationGroups,
} from "../../../src/internal/solidity/compilationGroup";
import { DependencyGraph } from "../../../src/internal/solidity/dependencyGraph";
import {
  ResolvedFile,
  Resolver,
} from "../../../src/internal/solidity/resolver";

const defaultOptimizer = {
  enabled: false,
  runs: 200,
};

const optimizerEnabled = {
  enabled: true,
  runs: 200,
};

const solc054 = { version: "0.5.4", optimizer: defaultOptimizer };
const solc055 = { version: "0.5.5", optimizer: defaultOptimizer };
const solc065 = { version: "0.6.5", optimizer: defaultOptimizer };
const solc066 = { version: "0.6.6", optimizer: defaultOptimizer };

const solcConfig055 = {
  compilers: [solc055],
};
const solcConfig055and066 = {
  compilers: [solc055, solc066],
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

const sortByVersion = (a: CompilationGroup, b: CompilationGroup) => {
  return semver.lt(a.getVersion(), b.getVersion())
    ? -1
    : semver.lt(b.getVersion(), a.getVersion())
    ? 1
    : 0;
};

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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("single file with overrides", function () {
    it("different version", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([[FooMock, []]]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc054,
          },
        },
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group054, group055] = compilationGroups;

      assert.equal(group055.getVersion(), "0.5.5");
      assert.isTrue(group055.isEmpty());

      assert.equal(group054.getVersion(), "0.5.4");
      assert.sameMembers(group054.getResolvedFiles(), [Foo]);
      assert.isTrue(group054.emitsArtifacts(Foo));
    });

    it("same version, different options", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([[FooMock, []]]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: { ...solc055, optimizer: optimizerEnabled },
          },
        },
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [groupWithoutOptimizer, groupWithOptimizer] = compilationGroups;

      assert.equal(groupWithoutOptimizer.getVersion(), "0.5.5");
      assert.isFalse(groupWithoutOptimizer.solidityConfig.optimizer.enabled);
      assert.isTrue(groupWithoutOptimizer.isEmpty());

      assert.equal(groupWithOptimizer.getVersion(), "0.5.5");
      assert.isTrue(groupWithOptimizer.solidityConfig.optimizer.enabled);
      assert.sameMembers(groupWithOptimizer.getResolvedFiles(), [Foo]);
      assert.isTrue(groupWithOptimizer.emitsArtifacts(Foo));
    });

    it("same config in override", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"], "new");
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([[FooMock, []]]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: { ...solc055 }, // force different reference
          },
        },
        solidityFilesCache
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });

    it("with overrides", async function () {
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
        {
          ...solcConfig055,
          overrides: {
            [Bar.globalName]: solc054,
          },
        },
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group054, group055] = compilationGroups;

      assert.equal(group054.getVersion(), "0.5.4");
      assert.sameMembers(group054.getResolvedFiles(), [Bar]);
      assert.isTrue(group054.emitsArtifacts(Bar));

      assert.equal(group055.getVersion(), "0.5.5");
      assert.sameMembers(group055.getResolvedFiles(), [Foo]);
      assert.isTrue(group055.emitsArtifacts(Foo));
    });
  });

  describe("two files without dependencies, different versions", function () {
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));

      assert.equal(group06.getVersion(), "0.6.6");
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));

      assert.equal(group06.getVersion(), "0.6.6");
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert.equal(group06.getVersion(), "0.6.6");
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("with overrides", async function () {
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
        {
          ...solcConfig055and066,
          overrides: {
            [Foo.globalName]: solc054,
            [Bar.globalName]: solc065,
          },
        },
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 4);

      const [group054, group055, group065, group066] = compilationGroups;

      assert.equal(group054.getVersion(), "0.5.4");
      assert.sameMembers(group054.getResolvedFiles(), [Foo]);
      assert.isTrue(group054.emitsArtifacts(Foo));

      assert.equal(group055.getVersion(), "0.5.5");
      assert.isTrue(group055.isEmpty());

      assert.equal(group065.getVersion(), "0.6.5");
      assert.sameMembers(group065.getResolvedFiles(), [Bar]);
      assert.isTrue(group065.emitsArtifacts(Bar));

      assert.equal(group066.getVersion(), "0.6.6");
      assert.isTrue(group066.isEmpty());
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });

    it("the importer has an override", async function () {
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
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc054,
          },
        },
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group054, group055] = compilationGroups;

      assert.equal(group054.getVersion(), "0.5.4");
      assert.sameMembers(group054.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group054.emitsArtifacts(Foo));
      assert.isFalse(group054.emitsArtifacts(Bar));

      assert.equal(group055.getVersion(), "0.5.5");
      assert.sameMembers(group055.getResolvedFiles(), [Bar]);
      assert.isTrue(group055.emitsArtifacts(Bar));
    });

    it("the imported has an override", async function () {
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
        {
          ...solcConfig055,
          overrides: {
            [Bar.globalName]: solc054,
          },
        },
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group054, group055] = compilationGroups;

      assert.equal(group054.getVersion(), "0.5.4");
      assert.sameMembers(group054.getResolvedFiles(), [Bar]);
      assert.isTrue(group054.emitsArtifacts(Bar));

      assert.equal(group055.getVersion(), "0.5.5");
      assert.sameMembers(group055.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group055.emitsArtifacts(Foo));
      assert.isFalse(group055.emitsArtifacts(Bar));
    });

    it("both are overridden", async function () {
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
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc054,
            [Bar.globalName]: solc054,
          },
        },
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group054, group055] = compilationGroups;

      assert.equal(group054.getVersion(), "0.5.4");
      assert.sameMembers(group054.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group054.emitsArtifacts(Foo));
      assert.isTrue(group054.emitsArtifacts(Bar));

      assert.equal(group055.getVersion(), "0.5.5");
      assert.isTrue(group055.isEmpty());
    });
  });

  describe("two files, one imports the other, different versions", function () {
    it("both new", async function () {
      const FooMock = new MockFile("Foo", [">=0.5.0"], "new");
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
        solcConfig055and066,
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("importer changed", async function () {
      const FooMock = new MockFile("Foo", [">=0.5.0"], "modified");
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
        solcConfig055and066,
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Bar));

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("imported changed", async function () {
      const FooMock = new MockFile("Foo", [">=0.5.0"], "not-modified");
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
        solcConfig055and066,
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", [">=0.5.0"], "not-modified");
      const BarMock = new MockFile("Bar", ["^0.5.0"], "not-modified");
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        [FooMock, [BarMock]],
        [BarMock, []],
      ]);

      const compilationGroups = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });

    it("one is overriden", async function () {
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
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc054,
          },
        },
        solidityFilesCache
      ).sort(sortByVersion);

      assert.lengthOf(compilationGroups, 2);

      const [group054, group055] = compilationGroups;

      assert.equal(group054.getVersion(), "0.5.4");
      assert.sameMembers(group054.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group054.emitsArtifacts(Foo));
      assert.isFalse(group054.emitsArtifacts(Bar));

      assert.equal(group055.getVersion(), "0.5.5");
      assert.sameMembers(group055.getResolvedFiles(), [Foo, Bar]);
      assert.isFalse(group055.emitsArtifacts(Foo));
      assert.isTrue(group055.emitsArtifacts(Bar));
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Qux));

      assert.equal(group06.getVersion(), "0.6.6");
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Qux));

      assert.equal(group06.getVersion(), "0.6.6");
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert.equal(group06.getVersion(), "0.6.6");
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Qux));

      assert.equal(group06.getVersion(), "0.6.6");
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

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("the imported is overriden", async function () {
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
        {
          ...solcConfig055and066,
          overrides: {
            [Qux.globalName]: solc055,
          },
        },
        solidityFilesCache
      );

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Qux]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Qux));

      assert.equal(group06.getVersion(), "0.6.6");
      assert.sameMembers(group06.getResolvedFiles(), [Bar, Qux]);
      assert.isTrue(group06.emitsArtifacts(Bar));
      assert.isFalse(group06.emitsArtifacts(Qux));
    });
  });
});
