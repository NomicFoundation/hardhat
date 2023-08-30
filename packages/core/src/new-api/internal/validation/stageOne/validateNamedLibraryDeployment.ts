import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedLibraryDeploymentFuture } from "../../../types/module";
import { validateLibraryNames } from "../../new-execution/libraries";

export async function validateNamedLibraryDeployment(
  future: NamedLibraryDeploymentFuture<string>,
  artifactLoader: ArtifactResolver
) {
  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }

  validateLibraryNames(artifact, Object.keys(future.libraries));
}
