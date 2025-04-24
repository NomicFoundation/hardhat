import type { Resolver } from "./resolver/types.js";
import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";

import { DependencyGraphImplementation } from "./dependency-graph.js";
import { ResolverImplementation } from "./resolver/dependency-resolver.js";
import { isNpmParsedRootPath, parseRootPath } from "./root-paths-utils.js";

export async function buildDependencyGraph(
  rootFiles: string[],
  projectRoot: string,
  userRemappings: string[],
  readFile: (absPath: string) => Promise<string>,
): Promise<{
  dependencyGraph: DependencyGraphImplementation;
  resolver: Resolver;
}> {
  const resolver = await ResolverImplementation.create(
    projectRoot,
    userRemappings,
    readFile,
  );

  const dependencyGraph = new DependencyGraphImplementation();

  const filesToProcess: ResolvedFile[] = [];

  for (const file of rootFiles) {
    let resolvedFile;

    const rootPath = parseRootPath(file);
    if (isNpmParsedRootPath(rootPath)) {
      resolvedFile = await resolver.resolveNpmDependencyFileAsRoot(
        rootPath.npmPath,
      );
      dependencyGraph.addRootFile(rootPath.npmPath, resolvedFile);
    } else {
      resolvedFile = await resolver.resolveProjectFile(rootPath.fsPath);
      dependencyGraph.addRootFile(resolvedFile.sourceName, resolvedFile);
    }

    filesToProcess.push(resolvedFile);
  }

  let fileToProcess;
  while ((fileToProcess = filesToProcess.pop()) !== undefined) {
    for (const importPath of fileToProcess.content.importPaths) {
      const importedFile = await resolver.resolveImport(
        fileToProcess,
        importPath,
      );

      if (!dependencyGraph.hasFile(importedFile)) {
        filesToProcess.push(importedFile);
      }

      dependencyGraph.addDependency(fileToProcess, importedFile);
    }
  }

  return { dependencyGraph, resolver };
}
