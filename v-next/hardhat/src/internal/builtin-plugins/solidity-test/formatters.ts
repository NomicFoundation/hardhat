import type { ArtifactId } from "@ignored/edr";

export function formatArtifactId(artifactId: ArtifactId): string {
  return `${artifactId.source}:${artifactId.name} (v${artifactId.solcVersion})`;
}
