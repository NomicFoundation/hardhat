import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import {
  ModuleParameters,
  NamedLibraryDeploymentFuture,
} from "../../../types/module";

export async function validateNamedLibraryDeployment(
  future: NamedLibraryDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  _moduleParameters: ModuleParameters
) {
  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }
}
