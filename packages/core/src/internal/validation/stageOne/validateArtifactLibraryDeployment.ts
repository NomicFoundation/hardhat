import { ArtifactResolver } from "../../../types/artifact";
import { ArtifactLibraryDeploymentFuture } from "../../../types/module";

export async function validateArtifactLibraryDeployment(
  _future: ArtifactLibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver
) {
  return; // no-op
}
