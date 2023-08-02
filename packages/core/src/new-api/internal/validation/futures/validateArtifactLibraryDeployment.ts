import { isAccountRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { ArtifactLibraryDeploymentFuture } from "../../../types/module";
import { validateAccountRuntimeValue } from "../utils";

export async function validateArtifactLibraryDeployment(
  future: ArtifactLibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[]
) {
  if (isAccountRuntimeValue(future.from)) {
    validateAccountRuntimeValue(future.from, accounts);
  }
}
