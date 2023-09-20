import { IgnitionError } from "../../../errors";
import { ERRORS } from "../../../errors-list";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedArtifactLibraryDeploymentFuture } from "../../../types/module";
import { validateLibraryNames } from "../../execution/libraries";

export async function validateNamedLibraryDeployment(
  future: NamedArtifactLibraryDeploymentFuture<string>,
  artifactLoader: ArtifactResolver
) {
  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
      contractName: future.contractName,
    });
  }

  validateLibraryNames(artifact, Object.keys(future.libraries));
}
