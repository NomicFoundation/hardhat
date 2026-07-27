import type { DependencyGraph } from "../../../types/solidity.js";
import type { Remapping } from "../solidity/build-system/resolver/types.js";

import { parseRemappingString } from "../solidity/build-system/resolver/remappings.js";

/**
 * Builds a map from import paths as written in the Solidity sources
 * (e.g. `forge-std/src/Test.sol`) to the file paths on disk they point to.
 *
 * EDR uses it to resolve non-relative imports when parsing inline test
 * configuration, as it looks paths up by exact string match and doesn't apply
 * remappings itself. Relative imports don't need an entry.
 */
export function buildImportMappings(
  dependencyGraph: DependencyGraph,
): Record<string, string> {
  const importMappings: Record<string, string> = {};

  // The same remapping strings repeat across many dependency edges, so we
  // parse each distinct one only once.
  const parsedRemappings = new Map<string, Remapping | undefined>();

  for (const file of dependencyGraph.getAllFiles()) {
    // Baseline: a file imported by its exact input source name.
    importMappings[file.inputSourceName] = file.fsPath;
  }

  for (const from of dependencyGraph.getAllFiles()) {
    for (const { file: to, remappings } of dependencyGraph.getDependencies(
      from,
    )) {
      for (const remappingString of remappings) {
        let remapping = parsedRemappings.get(remappingString);
        if (remapping === undefined && !parsedRemappings.has(remappingString)) {
          remapping = parseRemappingString(remappingString);
          parsedRemappings.set(remappingString, remapping);
        }
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
