import type { ArtifactId } from "@ignored/edr";

import chalk from "chalk";

export function formatArtifactId(
  artifactId: ArtifactId,
  sourceNameToUserSourceName: Map<string, string>,
): string {
  const sourceName =
    sourceNameToUserSourceName.get(artifactId.source) ?? artifactId.source;

  return `${chalk.bold(`${sourceName}:${artifactId.name}`)} (v${artifactId.solcVersion})`;
}
