import type { DependencyGraph } from "../../../types/solidity/dependency-graph.js";
import type { ResolvedFile } from "../../../types/solidity/resolved-file.js";

import {
  applyValidRemapping,
  parseRemappingString,
} from "../solidity/build-system/resolver/remappings.js";

type DependencyEdges = ReadonlySet<{
  file: ResolvedFile;
  remappings: ReadonlySet<string>;
}>;

/**
 * Maps every non-relative import path of every file in the graph, exactly as
 * written, to the absolute path of the file it resolves to. EDR needs this to
 * follow the imports of the test sources it parses.
 *
 * Relative import paths are left out, as EDR resolves them against the
 * importing file itself.
 *
 * EDR keys the map by import path alone. Two importers can write the same
 * import path and resolve it to different files, which npm's nested installs
 * make possible. Only one of them fits the map, and the first one found wins.
 */
export function collectImportMappings(
  dependencyGraph: DependencyGraph,
): Record<string, string> {
  const importMappings: Record<string, string> = {};

  for (const file of dependencyGraph.getAllFiles()) {
    const dependencies = dependencyGraph.getDependencies(file);

    for (const importPath of file.content.importPaths) {
      if (isRelativeImport(importPath) || importPath in importMappings) {
        continue;
      }

      const importedFile = resolveImport(file, importPath, dependencies);

      if (importedFile !== undefined) {
        importMappings[importPath] = importedFile.fsPath;
      }
    }
  }

  return importMappings;
}

function isRelativeImport(importPath: string): boolean {
  return importPath.startsWith("./") || importPath.startsWith("../");
}

/**
 * Finds which of the importer's dependencies an import path resolves to.
 *
 * The graph records the remappings that resolved each dependency, but not the
 * import path they were applied to. So each dependency's remappings are
 * replayed against the import path until one of them lands on that dependency.
 */
function resolveImport(
  from: ResolvedFile,
  importPath: string,
  dependencies: DependencyEdges,
): ResolvedFile | undefined {
  for (const { file, remappings } of dependencies) {
    // An import that needed no remapping is written as the input source name.
    if (importPath === file.inputSourceName) {
      return file;
    }

    for (const formattedRemapping of remappings) {
      const remapping = parseRemappingString(formattedRemapping);

      if (
        remapping === undefined ||
        !from.inputSourceName.startsWith(remapping.context) ||
        !importPath.startsWith(remapping.prefix)
      ) {
        continue;
      }

      if (applyValidRemapping(importPath, remapping) === file.inputSourceName) {
        return file;
      }
    }
  }

  return undefined;
}
