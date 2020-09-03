import * as fs from "fs";
import path from "path";

import { SolidityFilesCache } from "../../../src/builtin-tasks/utils/solidity-files-cache";
import { DependencyGraph } from "../../../src/internal/solidity/dependencyGraph";
import { Parser } from "../../../src/internal/solidity/parse";
import {
  ResolvedFile,
  Resolver,
} from "../../../src/internal/solidity/resolver";
import { SolcConfig } from "../../../src/types";

const projectRoot = fs.realpathSync(".");

export class MockFile {
  public readonly globalName: string;
  public readonly absolutePath: string;

  constructor(
    public name: string,
    public versionPragmas: string[],
    public libraryName?: string
  ) {
    this.globalName = `contracts/${name}.sol`;
    this.absolutePath = path.join(projectRoot, "contracts", `${name}.sol`);
  }
}

export async function createMockData(
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
      new Date(),
      mockFile.libraryName,
      mockFile.libraryName === undefined ? undefined : "1.2.3"
    );

    mockFileToResolvedFile.set(mockFile, resolvedFile);
    importsMap.set(`./${mockFile.name}.sol`, resolvedFile);

    if (filesMap.get(mockFile)!.modified === "not-modified") {
      solidityFilesCache[mockFile.absolutePath] = {
        lastModificationDate: resolvedFile.lastModificationDate.valueOf(),
        globalName: resolvedFile.globalName,
        solcConfig: filesMap.get(mockFile)!.lastSolcConfig!,
        imports: [],
        versionPragmas: [],
        artifacts: [],
      };
    }

    return resolvedFile;
  });

  const resolver = new Resolver(projectRoot, new Parser({}));
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
