import type { ArtifactId } from "@nomicfoundation/edr";

export function formatArtifactId(
  artifactId: ArtifactId,
  sourceNameToUserSourceName: Map<string, string>,
): string {
  const sourceName =
    sourceNameToUserSourceName.get(artifactId.source) ?? artifactId.source;

  return `${sourceName}:${artifactId.name}`;
}
