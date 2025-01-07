import type {
  ArtifactId as EdrArtifactId,
  Artifact as EdrArtifact,
} from "@ignored/edr";

import path from "node:path";

/**
 * This function returns the test suite ids associated with the given artifacts.
 * The test suite ID is the relative path of the test file, relative to the
 * project root.
 */
export async function getTestSuiteIds(
  artifacts: EdrArtifact[],
  rootTestFilePaths: string[],
  projectRoot: string,
): Promise<EdrArtifactId[]> {
  const testSources = rootTestFilePaths.map((p) =>
    path.relative(projectRoot, p),
  );

  return artifacts
    .map(({ id }) => id)
    .filter(({ source }) => testSources.includes(source));
}
