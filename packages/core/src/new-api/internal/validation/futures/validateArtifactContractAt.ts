import { ArtifactResolver } from "../../../types/artifact";
import { ArtifactContractAtFuture } from "../../../types/module";

export async function validateArtifactContractAt(
  _future: ArtifactContractAtFuture,
  _artifactLoader: ArtifactResolver
) {
  return; /* noop - nothing to validate here */
}
