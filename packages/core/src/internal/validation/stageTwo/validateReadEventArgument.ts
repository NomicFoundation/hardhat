import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { ReadEventArgumentFuture } from "../../../types/module";

export async function validateReadEventArgument(
  _future: ReadEventArgumentFuture,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  _accounts: string[]
): Promise<string[]> {
  return []; // no-op
}
