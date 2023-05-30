import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedContractAtFuture } from "../../../types/module";

export async function validateNamedContractAt(
  future: NamedContractAtFuture<string>,
  artifactLoader: ArtifactResolver
) {
  const artifact = await artifactLoader.load(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }
}
