import type { ArtifactId } from "@ignored/edr";

import chalk from "chalk";

export function formatArtifactId(artifactId: ArtifactId): string {
  return `${chalk.bold(`${artifactId.source}:${artifactId.name}`)} (v${artifactId.solcVersion})`;
}
