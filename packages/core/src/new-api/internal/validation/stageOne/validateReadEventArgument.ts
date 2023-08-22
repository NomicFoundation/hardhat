import { ethers } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { ReadEventArgumentFuture } from "../../../types/module";

export async function validateReadEventArgument(
  future: ReadEventArgumentFuture,
  artifactLoader: ArtifactResolver
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

  const iface = new ethers.utils.Interface(artifact.abi);

  const events = Object.entries(iface.events)
    .filter(([fname]) => fname === future.eventName)
    .map(([, fragment]) => fragment);

  const eventFragments = iface.fragments
    .filter((frag) => frag.name === future.eventName)
    .concat(events);

  if (eventFragments.length === 0) {
    throw new IgnitionValidationError(
      `Contract '${future.emitter.contractName}' doesn't have an event ${future.eventName}`
    );
  }
}
