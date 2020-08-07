import { assert } from "chai";
import { either } from "fp-ts";
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
import { SolcConfig } from "../../../src/types";

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
const solcConfig065and066 = {
  compilers: [solc065, solc066],
};
const solcConfig066 = {
  compilers: [solc066],
};

const projectRoot = fs.realpathSync(".");

class MockFile {
  public readonly globalName: string;
  public readonly absolutePath: string;

  constructor(public name: string, public versionPragmas: string[]) {
    this.globalName = `contracts/${name}.sol`;
    this.absolutePath = path.join(projectRoot, "contracts", `${name}.sol`);
  }
}

async function createMockData(
  files: Array<{
    file: MockFile;
    dependencies?: MockFile[];
    modified?: "new" | "not-modified" | "modified";
    lastSolcConfig?: SolcConfig;
  }>
): Promise<[DependencyGraph, SolidityFilesCache, ResolvedFile[]]> {
  const filesMap = new Map<
    MockFile,
    {
      dependencies: MockFile[];
      lastSolcConfig?: SolcConfig;
      modified: "new" | "not-modified" | "modified";
    }
  >();

  for (const { file, dependencies, modified, lastSolcConfig } of files) {
    const isModified = modified ?? "new";
    if (isModified !== "new" && lastSolcConfig === undefined) {
      throw new Error("lastSolcConfig has to be specified");
    }
    filesMap.set(file, {
      dependencies: dependencies ?? [],
      modified: isModified,
      lastSolcConfig,
    });
  }

  const solidityFilesCache: SolidityFilesCache = {};
  const mockFileToResolvedFile: Map<MockFile, ResolvedFile> = new Map();

  const importsMap = new Map<string, ResolvedFile>();

  const resolvedFiles = [...filesMap.keys()].map((mockFile) => {
    const resolvedFile = new ResolvedFile(
      mockFile.globalName,
      mockFile.absolutePath,
      {
        rawContent: "mock file",
        imports: filesMap
          .get(mockFile)!
          .dependencies.map((dependency) => `./${dependency.name}.sol`),
        versionPragmas: mockFile.versionPragmas,
      },
      new Date()
    );

    mockFileToResolvedFile.set(mockFile, resolvedFile);
    importsMap.set(`./${mockFile.name}.sol`, resolvedFile);

    if (filesMap.get(mockFile)!.modified === "not-modified") {
      solidityFilesCache[mockFile.absolutePath] = {
        lastModificationDate: resolvedFile.lastModificationDate.valueOf(),
        solcConfig: filesMap.get(mockFile)!.lastSolcConfig!,
      };
    } else if (filesMap.get(mockFile)!.modified === "modified") {
      solidityFilesCache[mockFile.absolutePath] = {
        lastModificationDate:
          resolvedFile.lastModificationDate.valueOf() - 1000,
        solcConfig: filesMap.get(mockFile)!.lastSolcConfig!,
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

function assertIsRight<LeftT, RightT>(
  eitherValue: either.Either<LeftT, RightT>
): RightT {
  if (eitherValue.isLeft()) {
    assert.fail("The given either is not Right");
  }
  return eitherValue.value;
}

function assertIsLeft<LeftT, RightT>(
  eitherValue: either.Either<LeftT, RightT>
): LeftT {
  if (eitherValue.isRight()) {
    assert.fail("The given either is not Left");
  }
  return eitherValue.value;
}

describe("Compilation groups", function () {
  describe("single file", function () {
    it("new file", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([{ file: FooMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult);

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });

    it("modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache, [Foo]] = await createMockData(
        [
          {
            file: FooMock,
            dependencies: [],
            modified: "modified",
            lastSolcConfig: solc055,
          },
        ]
      );

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult);

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });

    it("not modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        { file: FooMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult);

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("single file with overrides", function () {
    it("different version", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([{ file: FooMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc054,
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 2);

      const [group054, group055] = compilationGroups;

      assert.equal(group055.getVersion(), "0.5.5");
      assert.isTrue(group055.isEmpty());

      assert.equal(group054.getVersion(), "0.5.4");
      assert.sameMembers(group054.getResolvedFiles(), [Foo]);
      assert.isTrue(group054.emitsArtifacts(Foo));
    });

    it("same version, different options", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([{ file: FooMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: { ...solc055, optimizer: optimizerEnabled },
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([{ file: FooMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: { ...solc055 }, // force different reference
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });
  });

  describe("single file, not compilable", function () {
    it("single compiler doesn't match", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([{ file: FooMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig066,
        solidityFilesCache
      );

      const nonCompilableFiles = assertIsLeft(compilationGroupsResult);

      assert.sameMembers(nonCompilableFiles, [Foo]);
    });

    it("no compilers match", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([{ file: FooMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig065and066,
        solidityFilesCache
      );

      const nonCompilableFiles = assertIsLeft(compilationGroupsResult);

      assert.sameMembers(nonCompilableFiles, [Foo]);
    });

    it("compiler matches but override doesn't", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([{ file: FooMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc066,
          },
        },
        solidityFilesCache
      );

      const nonCompilableFiles = assertIsLeft(compilationGroupsResult);

      assert.sameMembers(nonCompilableFiles, [Foo]);
    });
  });

  describe("two files without dependencies, same versions", function () {
    it("both new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([{ file: FooMock }, { file: BarMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("first one modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache, [Foo]] = await createMockData(
        [
          { file: FooMock, modified: "modified", lastSolcConfig: solc055 },
          { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
        ]
      );

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });

    it("second one modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [, Bar],
      ] = await createMockData([
        { file: FooMock, modified: "not-modified", lastSolcConfig: solc055 },
        { file: BarMock, modified: "modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Bar]);
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("none modified", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        { file: FooMock, modified: "not-modified", lastSolcConfig: solc055 },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });

    it("with overrides", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([{ file: FooMock }, { file: BarMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Bar.globalName]: solc054,
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([{ file: FooMock }, { file: BarMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const [dependencyGraph, solidityFilesCache, [Foo]] = await createMockData(
        [
          { file: FooMock, modified: "modified", lastSolcConfig: solc055 },
          { file: BarMock, modified: "not-modified", lastSolcConfig: solc066 },
        ]
      );

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [, Bar],
      ] = await createMockData([
        { file: FooMock, modified: "not-modified", lastSolcConfig: solc055 },
        { file: BarMock, modified: "modified", lastSolcConfig: solc066 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        { file: FooMock, modified: "not-modified", lastSolcConfig: solc055 },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc066 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("with overrides", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([{ file: FooMock }, { file: BarMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055and066,
          overrides: {
            [Foo.globalName]: solc054,
            [Bar.globalName]: solc065,
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("the importer changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isFalse(group05.emitsArtifacts(Bar));
    });

    it("the imported changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });

    it("the importer has an override", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc054,
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Bar.globalName]: solc054,
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc054,
            [Bar.globalName]: solc054,
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", [">=0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", [">=0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", [">=0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", [">=0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock, dependencies: [FooMock] },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("the first one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [FooMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("the second one changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [FooMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo, Bar]);
      assert.isTrue(group05.emitsArtifacts(Foo));
      assert.isTrue(group05.emitsArtifacts(Bar));
    });

    it("none changed", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [FooMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });

    it("one is overriden", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock, dependencies: [FooMock] },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055,
          overrides: {
            [Foo.globalName]: solc054,
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

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

  describe("two files, not compilable", function () {
    it("first one doesn't compile", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([{ file: FooMock }, { file: BarMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig066,
        solidityFilesCache
      );

      const nonCompilableFiles = assertIsLeft(compilationGroupsResult);

      assert.sameMembers(nonCompilableFiles, [Foo]);
    });

    it("second one doesn't compile", async function () {
      const FooMock = new MockFile("Foo", ["^0.6.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [, Bar],
      ] = await createMockData([{ file: FooMock }, { file: BarMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig066,
        solidityFilesCache
      );

      const nonCompilableFiles = assertIsLeft(compilationGroupsResult);

      assert.sameMembers(nonCompilableFiles, [Bar]);
    });

    it("both don't compile", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar],
      ] = await createMockData([{ file: FooMock }, { file: BarMock }]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig066,
        solidityFilesCache
      );

      const nonCompilableFiles = assertIsLeft(compilationGroupsResult);

      assert.sameMembers(nonCompilableFiles, [Foo, Bar]);
    });

    it("one file imports an incompatible dependency", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const nonCompilableFiles = assertIsLeft(compilationGroupsResult);

      assert.sameMembers(nonCompilableFiles, [Foo]);
    });
  });

  describe("three files, sequential import", function () {
    it("all new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock, dependencies: [QuxMock] },
        { file: QuxMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: QuxMock, modified: "modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("three files, loop import", function () {
    it("all new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock] },
        { file: BarMock, dependencies: [QuxMock] },
        { file: QuxMock, dependencies: [FooMock] },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: QuxMock,
          dependencies: [FooMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        {
          file: QuxMock,
          dependencies: [FooMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: QuxMock,
          dependencies: [FooMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: QuxMock,
          dependencies: [FooMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("three files, one imports the other two", function () {
    it("all new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        { file: FooMock, dependencies: [BarMock, QuxMock] },
        { file: BarMock },
        { file: QuxMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock, QuxMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock, QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "modified", lastSolcConfig: solc055 },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock, QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
        { file: QuxMock, modified: "modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.5.0"]);
      const QuxMock = new MockFile("Qux", ["^0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        {
          file: FooMock,
          dependencies: [BarMock, QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        { file: BarMock, modified: "not-modified", lastSolcConfig: solc055 },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());
    });
  });

  describe("two files with different versions depend on the same one", function () {
    it("all new", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const QuxMock = new MockFile("Qux", [">=0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        { file: FooMock, dependencies: [QuxMock] },
        { file: BarMock, dependencies: [QuxMock] },
        { file: QuxMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const QuxMock = new MockFile("Qux", [">=0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, , Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [QuxMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc066,
        },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc066 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const QuxMock = new MockFile("Qux", [">=0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "modified",
          lastSolcConfig: solc066,
        },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc066 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const QuxMock = new MockFile("Qux", [">=0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        {
          file: FooMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc066,
        },
        { file: QuxMock, modified: "modified", lastSolcConfig: solc066 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const QuxMock = new MockFile("Qux", [">=0.5.0"]);
      const [dependencyGraph, solidityFilesCache] = await createMockData([
        {
          file: FooMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: BarMock,
          dependencies: [QuxMock],
          modified: "not-modified",
          lastSolcConfig: solc066,
        },
        { file: QuxMock, modified: "not-modified", lastSolcConfig: solc066 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.isTrue(group05.isEmpty());

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
    });

    it("the imported is overriden", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const QuxMock = new MockFile("Qux", [">=0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo, Bar, Qux],
      ] = await createMockData([
        { file: FooMock, dependencies: [QuxMock] },
        { file: BarMock, dependencies: [QuxMock] },
        { file: QuxMock },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        {
          ...solcConfig055and066,
          overrides: {
            [Qux.globalName]: solc055,
          },
        },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
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

  describe("five files, three layers, 2-1-2", function () {
    it("all new", async function () {
      const Layer1AMock = new MockFile("Layer1A", ["^0.5.0"]);
      const Layer1BMock = new MockFile("Layer1B", ["^0.5.0"]);
      const Layer2Mock = new MockFile("Layer2", ["^0.5.0"]);
      const Layer3AMock = new MockFile("Layer3A", ["^0.5.0"]);
      const Layer3BMock = new MockFile("Layer3B", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        resolvedFiles,
      ] = await createMockData([
        { file: Layer1AMock, dependencies: [Layer2Mock] },
        { file: Layer1BMock, dependencies: [Layer2Mock] },
        { file: Layer2Mock, dependencies: [Layer3AMock, Layer3BMock] },
        { file: Layer3AMock, dependencies: [] },
        { file: Layer3BMock, dependencies: [] },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.lengthOf(group05.getResolvedFiles(), 5);
      assert.sameMembers(group05.getResolvedFiles(), resolvedFiles);
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[0]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[1]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[2]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[3]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[4]));
    });

    it("layer 2 changed", async function () {
      const Layer1AMock = new MockFile("Layer1A", ["^0.5.0"]);
      const Layer1BMock = new MockFile("Layer1B", ["^0.5.0"]);
      const Layer2Mock = new MockFile("Layer2", ["^0.5.0"]);
      const Layer3AMock = new MockFile("Layer3A", ["^0.5.0"]);
      const Layer3BMock = new MockFile("Layer3B", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        resolvedFiles,
      ] = await createMockData([
        {
          file: Layer1AMock,
          dependencies: [Layer2Mock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer1BMock,
          dependencies: [Layer2Mock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer2Mock,
          dependencies: [Layer3AMock, Layer3BMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer3AMock,
          dependencies: [],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer3BMock,
          dependencies: [],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
      ]);

      const [Layer1A, Layer1B, Layer2, Layer3A, Layer3B] = resolvedFiles;

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.lengthOf(group05.getResolvedFiles(), 5);
      assert.sameMembers(group05.getResolvedFiles(), resolvedFiles);
      assert.isTrue(group05.emitsArtifacts(Layer1A));
      assert.isTrue(group05.emitsArtifacts(Layer1B));
      assert.isTrue(group05.emitsArtifacts(Layer2));
      assert.isFalse(group05.emitsArtifacts(Layer3A));
      assert.isFalse(group05.emitsArtifacts(Layer3B));
    });
  });

  describe("six files, three layers, 2-2-2", function () {
    it("all new", async function () {
      const Layer1AMock = new MockFile("Layer1A", ["^0.5.0"]);
      const Layer1BMock = new MockFile("Layer1B", ["^0.5.0"]);
      const Layer2AMock = new MockFile("Layer2A", ["^0.5.0"]);
      const Layer2BMock = new MockFile("Layer2B", ["^0.5.0"]);
      const Layer3AMock = new MockFile("Layer3A", ["^0.5.0"]);
      const Layer3BMock = new MockFile("Layer3B", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        resolvedFiles,
      ] = await createMockData([
        { file: Layer1AMock, dependencies: [Layer2AMock, Layer2BMock] },
        { file: Layer1BMock, dependencies: [Layer2AMock, Layer2BMock] },
        { file: Layer2AMock, dependencies: [Layer3AMock, Layer3BMock] },
        { file: Layer2BMock, dependencies: [Layer3AMock, Layer3BMock] },
        { file: Layer3AMock, dependencies: [] },
        { file: Layer3BMock, dependencies: [] },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.lengthOf(group05.getResolvedFiles(), 6);
      assert.sameMembers(group05.getResolvedFiles(), resolvedFiles);
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[0]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[1]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[2]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[3]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[4]));
      assert.isTrue(group05.emitsArtifacts(resolvedFiles[5]));
    });

    it("layer 2 changed", async function () {
      const Layer1AMock = new MockFile("Layer1A", ["^0.5.0"]);
      const Layer1BMock = new MockFile("Layer1B", ["^0.5.0"]);
      const Layer2AMock = new MockFile("Layer2A", ["^0.5.0"]);
      const Layer2BMock = new MockFile("Layer2B", ["^0.5.0"]);
      const Layer3AMock = new MockFile("Layer3A", ["^0.5.0"]);
      const Layer3BMock = new MockFile("Layer3B", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        resolvedFiles,
      ] = await createMockData([
        {
          file: Layer1AMock,
          dependencies: [Layer2AMock, Layer2BMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer1BMock,
          dependencies: [Layer2AMock, Layer2BMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer2AMock,
          dependencies: [Layer3AMock, Layer3BMock],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer2BMock,
          dependencies: [Layer3AMock, Layer3BMock],
          modified: "modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer3AMock,
          dependencies: [],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
        {
          file: Layer3BMock,
          dependencies: [],
          modified: "not-modified",
          lastSolcConfig: solc055,
        },
      ]);

      const [
        Layer1A,
        Layer1B,
        Layer2A,
        Layer2B,
        Layer3A,
        Layer3B,
      ] = resolvedFiles;

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.lengthOf(group05.getResolvedFiles(), 6);
      assert.sameMembers(group05.getResolvedFiles(), resolvedFiles);
      assert.isTrue(group05.emitsArtifacts(Layer1A));
      assert.isTrue(group05.emitsArtifacts(Layer1B));
      assert.isFalse(group05.emitsArtifacts(Layer2A));
      assert.isTrue(group05.emitsArtifacts(Layer2B));
      assert.isFalse(group05.emitsArtifacts(Layer3A));
      assert.isFalse(group05.emitsArtifacts(Layer3B));
    });
  });

  describe("config changes", function () {
    it("file didn't change but config version", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([
        { file: FooMock, modified: "not-modified", lastSolcConfig: solc054 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult);

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });

    it("same file version but optimizer was enabled", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [
        dependencyGraph,
        solidityFilesCache,
        [Foo],
      ] = await createMockData([
        { file: FooMock, modified: "not-modified", lastSolcConfig: solc055 },
      ]);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        { compilers: [{ ...solc055, optimizer: optimizerEnabled }] },
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult);

      assert.lengthOf(compilationGroups, 1);

      const [group05] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));
    });

    it("only one compiler changes", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const BarMock = new MockFile("Bar", ["^0.6.0"]);
      const [dependencyGraph, solidityFilesCache, [Foo]] = await createMockData(
        [
          { file: FooMock, modified: "not-modified", lastSolcConfig: solc054 },
          { file: BarMock, modified: "not-modified", lastSolcConfig: solc066 },
        ]
      );

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        solcConfig055and066,
        solidityFilesCache
      );

      const compilationGroups = assertIsRight(compilationGroupsResult).sort(
        sortByVersion
      );

      assert.lengthOf(compilationGroups, 2);

      const [group05, group06] = compilationGroups;

      assert.equal(group05.getVersion(), "0.5.5");
      assert.sameMembers(group05.getResolvedFiles(), [Foo]);
      assert.isTrue(group05.emitsArtifacts(Foo));

      assert.equal(group06.getVersion(), "0.6.6");
      assert.isTrue(group06.isEmpty());
    });
  });
});
