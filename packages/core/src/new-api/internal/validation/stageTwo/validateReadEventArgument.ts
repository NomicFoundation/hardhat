import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { ReadEventArgumentFuture } from "../../../types/module";

export async function validateReadEventArgument(
  _future: ReadEventArgumentFuture,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  _accounts: string[]
) {
  return; // no-op
}
