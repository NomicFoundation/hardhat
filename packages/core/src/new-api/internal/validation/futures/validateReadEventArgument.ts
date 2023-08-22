import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { ReadEventArgumentFuture } from "../../../types/module";
import { validateArtifactEventArgumentParams } from "../../new-execution/abi";

export async function validateReadEventArgument(
  future: ReadEventArgumentFuture,
  artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  _accounts: string[]
) {
  const artifact =
    "artifact" in future.emitter
      ? future.emitter.artifact
      : await artifactLoader.loadArtifact(future.emitter.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.emitter.contractName}' is invalid`
    );
  }

  validateArtifactEventArgumentParams(
    artifact,
    future.eventName,
    future.argumentName
  );
}
