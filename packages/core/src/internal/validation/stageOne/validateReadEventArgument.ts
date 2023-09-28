import { IgnitionError } from "../../../errors";
import { ERRORS } from "../../../errors-list";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { ReadEventArgumentFuture } from "../../../types/module";
import { validateArtifactEventArgumentParams } from "../../execution/abi";

export async function validateReadEventArgument(
  future: ReadEventArgumentFuture,
  artifactLoader: ArtifactResolver
) {
  const artifact =
    "artifact" in future.emitter
      ? future.emitter.artifact
      : await artifactLoader.loadArtifact(future.emitter.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
      contractName: future.emitter.contractName,
    });
  }

  validateArtifactEventArgumentParams(
    artifact,
    future.eventName,
    future.nameOrIndex
  );
}
