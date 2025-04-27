import type { Resolver } from "./resolver/types.js";
import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";

import { ResolvedFileType } from "../../../../types/solidity/resolved-file.js";

import { formatRemapping } from "./resolver/remappings.js";

export function printDependencyGraphAndRemappingsSummary(
  dependencyGraph: DependencyGraph,
  resolver?: Resolver,
): void {
  const roots = dependencyGraph.getRoots();
  const rootFiles = new Set(roots.values());
  const allFiles = dependencyGraph.getAllFiles();

  const rootRepresentations: string[] = [];

  for (const [rootFile, resolvedFile] of roots.entries()) {
    if (resolvedFile.type === ResolvedFileType.NPM_PACKAGE_FILE) {
      rootRepresentations.push(`- ${rootFile} -> ${resolvedFile.sourceName}
      ${resolvedFile.fsPath}`);
    } else {
      rootRepresentations.push(`- ${resolvedFile.sourceName}
      ${resolvedFile.fsPath}`);
    }
  }

  console.log(`Printing dependency graph and remappings summary`);

  console.log(`
Roots:
  ${rootRepresentations.join("\n  ")}
`);

  const otherFiles = [...allFiles].filter((file) => !rootFiles.has(file));

  if (otherFiles.length > 0) {
    console.log(`
Other files:
  ${otherFiles
    .map((file) => `- ` + file.sourceName + `\n      ` + file.fsPath)
    .join("\n  ")}
`);
  }

  const files = [...[...rootFiles].toSorted(), ...[...otherFiles].toSorted()];
  const dependencies: string[] = [];

  for (const file of files) {
    const dependenciesForFile = [...dependencyGraph.getDependencies(file)]
      .map((d) => d.sourceName)
      .sort();

    for (const dependency of dependenciesForFile) {
      dependencies.push(`- ${file.sourceName} -> ${dependency}`);
    }
  }

  if (dependencies.length > 0) {
    console.log(`
Dependencies:
  ${dependencies.join("\n  ")}
`);
  }

  if (resolver === undefined) {
    return;
  }

  const remappings = resolver.getRemappings();

  // TODO: Now we have duplicates, because we are getting all the remappings
  // ever used by the resolved (e.g. if a remappign was used to resolve two
  // imports its here twice).
  const remappingsWithoutDuplicates = [...new Set(remappings)];

  if (remappingsWithoutDuplicates.length > 0) {
    console.log(`
Remappings:
  ${remappingsWithoutDuplicates.map((r) => `- ${formatRemapping(r)}`).join("\n  ")}
`);

    console.log("\n\n");
  }
}
