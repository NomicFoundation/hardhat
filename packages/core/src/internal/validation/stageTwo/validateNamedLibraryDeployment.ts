import { isAccountRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { NamedArtifactLibraryDeploymentFuture } from "../../../types/module";
import { validateAccountRuntimeValue } from "../utils";

export async function validateNamedLibraryDeployment(
  future: NamedArtifactLibraryDeploymentFuture<string>,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[]
) {
  if (isAccountRuntimeValue(future.from)) {
    validateAccountRuntimeValue(future.from, accounts);
  }
}
