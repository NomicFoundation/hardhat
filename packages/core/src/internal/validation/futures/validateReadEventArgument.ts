import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { ReadEventArgumentFuture } from "../../../types/module";
import { validateArtifactEventArgumentParams } from "../../execution/abi";

export async function validateReadEventArgument(
  future: ReadEventArgumentFuture,
  artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  _accounts: string[]
): Promise<string[]> {
  const errors: string[] = [];

  /* stage one */

  const artifact =
    "artifact" in future.emitter
      ? future.emitter.artifact
      : await artifactLoader.loadArtifact(future.emitter.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(
      `Artifact for contract '${future.emitter.contractName}' is invalid`
    );
  } else {
    errors.push(
      ...validateArtifactEventArgumentParams(
        artifact,
        future.eventName,
        future.nameOrIndex
      )
    );
  }

  return errors;
}
