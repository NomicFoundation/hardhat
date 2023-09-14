import { ArtifactResolver } from "../../../types/artifact";
import { LibraryDeploymentFuture } from "../../../types/module";

export async function validateArtifactLibraryDeployment(
  _future: LibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver
) {
  return; // no-op
}
