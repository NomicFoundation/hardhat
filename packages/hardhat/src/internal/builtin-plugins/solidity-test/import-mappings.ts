import type { DependencyGraph } from "../../../types/solidity.js";

import { parseRemappingString } from "../solidity/build-system/resolver/remappings.js";

/**
 * Builds the `importMappings` that EDR uses to resolve non-relative Solidity
 * imports while parsing inline test configuration.
 *
 * EDR's resolver keys this map by the import path *as written* in the source
 * (e.g. `forge-std/src/Test.sol`) and looks it up with an exact string match —
 * it doesn't apply solc remappings itself. Relative imports (`./`, `../`) are
 * resolved by EDR against the importing file and need no entry here.
 *
 * We reconstruct the as-written import paths from the dependency graph:
 *
 * - Every file is importable by its own input source name, so we map
 *   `inputSourceName -> fsPath` for all files. This covers imports written
 *   directly as input source names.
 * - Each dependency edge records the remappings solc used to resolve it. A
 *   remapping is `context:prefix=target`; the resolved dependency's input
 *   source name is `target + tail`, so the path as written was `prefix + tail`.
 *   We map that reconstructed path to the dependency's `fsPath`.
 *
 * The map is flat and global (not context-aware), mirroring EDR's resolver. If
 * the same as-written path resolves to different files from different contexts,
 * the last one wins; this is rare and acceptable for inline-config parsing.
 */
export function buildImportMappings(
  dependencyGraph: DependencyGraph,
): Record<string, string> {
  const importMappings: Record<string, string> = {};

  for (const file of dependencyGraph.getAllFiles()) {
    // Baseline: a file imported by its exact input source name.
    importMappings[file.inputSourceName] = file.fsPath;
  }

  for (const from of dependencyGraph.getAllFiles()) {
    for (const { file: to, remappings } of dependencyGraph.getDependencies(
      from,
    )) {
      for (const remappingString of remappings) {
        const remapping = parseRemappingString(remappingString);
        if (remapping === undefined) {
          continue;
        }

        if (!to.inputSourceName.startsWith(remapping.target)) {
          continue;
        }

        const tail = to.inputSourceName.substring(remapping.target.length);
        const importPathAsWritten = remapping.prefix + tail;
        importMappings[importPathAsWritten] = to.fsPath;
      }
    }
  }

  return importMappings;
}
