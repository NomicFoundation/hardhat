import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { ArtifactLibraryDeploymentFuture } from "../../../types/module";

export async function validateArtifactLibraryDeployment(
  _future: ArtifactLibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters
) {
  return; /* noop - nothing to validate here */
}
