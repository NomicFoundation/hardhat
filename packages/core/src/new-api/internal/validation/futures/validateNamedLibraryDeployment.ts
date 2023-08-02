import { IgnitionValidationError } from "../../../../errors";
import { isAccountRuntimeValue, isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { NamedLibraryDeploymentFuture } from "../../../types/module";
import { validateAccountRuntimeValue } from "../utils";

export async function validateNamedLibraryDeployment(
  future: NamedLibraryDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[]
) {
  if (isAccountRuntimeValue(future.from)) {
    validateAccountRuntimeValue(future.from, accounts);
  }

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }
}
