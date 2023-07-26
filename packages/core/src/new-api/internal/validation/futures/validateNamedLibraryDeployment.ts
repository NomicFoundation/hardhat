import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { NamedLibraryDeploymentFuture } from "../../../types/module";

export async function validateNamedLibraryDeployment(
  future: NamedLibraryDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters
) {
  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }
}
