import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";

import { DependencyGraphImplementation } from "./dependency-graph.js";
import { NewResolverImplementation } from "./resolver/new-dependency-resolver.js";
import { formatRemapping } from "./resolver/remappings.js";
import { isNpmParsedRootPath, parseRootPath } from "./root-paths-utils.js";

export async function buildDependencyGraph(
  rootFiles: string[],
  projectRoot: string,
  readFile: (absPath: string) => Promise<string>,
): Promise<DependencyGraphImplementation> {
  const resolver = await NewResolverImplementation.create(
    projectRoot,
    readFile,
  );

  const dependencyGraph = new DependencyGraphImplementation();

  const filesToProcess: ResolvedFile[] = [];

  for (const file of rootFiles) {
    let resolvedFile: ResolvedFile;

    const rootPath = parseRootPath(file);
    if (isNpmParsedRootPath(rootPath)) {
      const resolutionResult = await resolver.resolveNpmDependencyFileAsRoot(
        rootPath.npmPath,
      );

      if (resolutionResult.success === false) {
        throw new Error(
          "Resolver failed: " + JSON.stringify(resolutionResult.error),
        );
      }

      resolvedFile = resolutionResult.value.file;

      dependencyGraph.addRootFile(rootPath.npmPath, resolvedFile);
    } else {
      const resolutionResult = await resolver.resolveProjectFile(
        rootPath.fsPath,
      );

      if (resolutionResult.success === false) {
        throw new Error(
          "Resolver failed: " + JSON.stringify(resolutionResult.error),
        );
      }

      resolvedFile = resolutionResult.value;
      dependencyGraph.addRootFile(
        // We don't use the package's root source name in the local files public
        // source name.
        resolvedFile.sourceName.substring(
          resolvedFile.package.rootSourceName.length + 1,
        ),
        resolvedFile,
      );
    }

    filesToProcess.push(resolvedFile);
  }

  let fileToProcess;
  while ((fileToProcess = filesToProcess.pop()) !== undefined) {
    for (const importPath of fileToProcess.content.importPaths) {
      const resolutionResult = await resolver.resolveImport(
        fileToProcess,
        importPath,
      );

      if (resolutionResult.success === false) {
        throw new Error(
          "Resolver failed: " + JSON.stringify(resolutionResult.error),
        );
      }

      const importedFile = resolutionResult.value.file;

      if (!dependencyGraph.hasFile(importedFile)) {
        filesToProcess.push(importedFile);
      }

      dependencyGraph.addDependency(
        fileToProcess,
        importedFile,
        resolutionResult.value.remapping !== undefined
          ? formatRemapping(resolutionResult.value.remapping)
          : undefined,
      );
    }
  }

  return dependencyGraph;
}
