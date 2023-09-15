import { IgnitionValidationError } from "../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedArtifactContractAtFuture } from "../../../types/module";

export async function validateNamedContractAt(
  future: NamedArtifactContractAtFuture<string>,
  artifactLoader: ArtifactResolver
) {
  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }
}
