import { isAccountRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { LibraryDeploymentFuture } from "../../../types/module";
import { validateLibraryNames } from "../../execution/libraries";
import { validateAccountRuntimeValue } from "../utils";

export async function validateArtifactLibraryDeployment(
  future: LibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[]
) {
  if (isAccountRuntimeValue(future.from)) {
    validateAccountRuntimeValue(future.from, accounts);
  }

  validateLibraryNames(future.artifact, Object.keys(future.libraries));
}
