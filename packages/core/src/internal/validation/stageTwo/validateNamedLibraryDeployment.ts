import { isAccountRuntimeValue, isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { NamedArtifactLibraryDeploymentFuture } from "../../../types/module";
import { validateLibraryNames } from "../../execution/libraries";
import { validateAccountRuntimeValue } from "../utils";

export async function validateNamedLibraryDeployment(
  future: NamedArtifactLibraryDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<string[]> {
  const errors: string[] = [];

  /* stage one */

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(`Artifact for contract '${future.contractName}' is invalid`);
  } else {
    errors.push(
      ...validateLibraryNames(artifact, Object.keys(future.libraries))
    );
  }

  /* stage two */

  if (isAccountRuntimeValue(future.from)) {
    errors.push(...validateAccountRuntimeValue(future.from, accounts));
  }

  return errors;
}
