import { IgnitionError } from "../../../errors";
import { ERRORS } from "../../../errors-list";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedArtifactContractAtFuture } from "../../../types/module";

export async function validateNamedContractAt(
  future: NamedArtifactContractAtFuture<string>,
  artifactLoader: ArtifactResolver
) {
  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
      contractName: future.contractName,
    });
  }
}
