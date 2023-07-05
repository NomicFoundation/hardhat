import { ArtifactResolver } from "../../../types/artifact";
import {
  ArtifactLibraryDeploymentFuture,
  ModuleParameters,
} from "../../../types/module";

export async function validateArtifactLibraryDeployment(
  _future: ArtifactLibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver,
  _moduleParameters: ModuleParameters
) {
  return; /* noop - nothing to validate here */
}
