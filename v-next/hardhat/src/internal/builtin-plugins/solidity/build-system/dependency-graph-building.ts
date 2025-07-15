import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { shortenPath } from "@nomicfoundation/hardhat-utils/path";

import { DependencyGraphImplementation } from "./dependency-graph.js";
import { ResolverImplementation } from "./resolver/dependency-resolver.js";
import {
  formatImportResolutionError,
  formatNpmRootResolutionError,
  formatProjectRootResolutionError,
} from "./resolver/error-messages.js";
import { formatRemapping } from "./resolver/remappings.js";
import { isNpmParsedRootPath, parseRootPath } from "./root-paths-utils.js";

export async function buildDependencyGraph(
  rootFiles: string[],
  projectRoot: string,
  readFile: (absPath: string) => Promise<string>,
): Promise<DependencyGraphImplementation> {
  const resolver = await ResolverImplementation.create(projectRoot, readFile);

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
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY.NPM_ROOT_RESOLUTION_ERROR,
          {
            npmModule: rootPath.npmPath,
            error: formatNpmRootResolutionError(resolutionResult.error),
          },
        );
      }

      resolvedFile = resolutionResult.value.file;

      dependencyGraph.addRootFile(rootPath.npmPath, resolvedFile);
    } else {
      const resolutionResult = await resolver.resolveProjectFile(
        rootPath.fsPath,
      );

      if (resolutionResult.success === false) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY.PROJECT_ROOT_RESOLUTION_ERROR,
          {
            filePath: shortenPath(rootPath.fsPath),
            error: formatProjectRootResolutionError(resolutionResult.error),
          },
        );
      }

      resolvedFile = resolutionResult.value;
      dependencyGraph.addRootFile(
        // We don't use the package's input source name root in the local files
        // user source name.
        resolvedFile.inputSourceName.substring(
          resolvedFile.package.inputSourceNameRoot.length + 1,
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
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY.IMPORT_RESOLUTION_ERROR,
          {
            importPath,
            filePath: shortenPath(fileToProcess.fsPath),
            error: formatImportResolutionError(resolutionResult.error),
          },
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
