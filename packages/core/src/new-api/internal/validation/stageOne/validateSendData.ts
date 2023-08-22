import { ArtifactResolver } from "../../../types/artifact";
import { SendDataFuture } from "../../../types/module";

export async function validateSendData(
  _future: SendDataFuture,
  _artifactLoader: ArtifactResolver
) {
  return; // no-op
}
