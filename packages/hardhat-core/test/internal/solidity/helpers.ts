import * as fs from "fs";
import fsExtra from "fs-extra";
import path from "path";

import { DependencyGraph } from "../../../src/internal/solidity/dependencyGraph";
import { Parser } from "../../../src/internal/solidity/parse";
import {
  ResolvedFile,
  Resolver,
} from "../../../src/internal/solidity/resolver";
import * as taskTypes from "../../../src/types/builtin-tasks";

const projectRoot = fs.realpathSync(".");

export class MockFile {
  public readonly sourceName: string;
  public readonly absolutePath: string;

  constructor(
    public name: string,
    public versionPragmas: string[],
    public libraryName?: string
  ) {
    this.sourceName = `contracts/${name}.sol`;
    this.absolutePath = path.join(projectRoot, "contracts", `${name}.sol`);
  }
}

export async function createMockData(
  files: Array<{
    file: MockFile;
    dependencies?: MockFile[];
  }>
): Promise<[taskTypes.DependencyGraph, ResolvedFile[]]> {
  const filesMap = new Map<
    MockFile,
    {
      dependencies: MockFile[];
    }
  >();

  for (const { file, dependencies } of files) {
    filesMap.set(file, {
      dependencies: dependencies ?? [],
    });
  }

  const mockFileToResolvedFile: Map<MockFile, ResolvedFile> = new Map();

  const importsMap = new Map<string, ResolvedFile>();

  const resolvedFiles = [...filesMap.keys()].map((mockFile) => {
    const resolvedFile = new ResolvedFile(
      mockFile.sourceName,
      mockFile.absolutePath,
      {
        rawContent: "mock file",
        imports: filesMap
          .get(mockFile)!
          .dependencies.map((dependency) => `./${dependency.name}.sol`),
        versionPragmas: mockFile.versionPragmas,
      },
      "<content-hash-mock-file>",
      new Date(),
      mockFile.libraryName,
      mockFile.libraryName === undefined ? undefined : "1.2.3"
    );

    mockFileToResolvedFile.set(mockFile, resolvedFile);
    importsMap.set(`./${mockFile.name}.sol`, resolvedFile);

    return resolvedFile;
  });

  const resolver = new Resolver(
    projectRoot,
    new Parser(),
    (absolutePath: string) =>
      fsExtra.readFile(absolutePath, { encoding: "utf8" })
  );
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

  return [dependencyGraph, resolvedFiles];
}
