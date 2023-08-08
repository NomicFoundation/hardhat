import { Interface, EventFragment } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { ReadEventArgumentFuture } from "../../../types/module";

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

  const iface = new Interface(artifact.abi);

  const events: EventFragment[] = [];
  iface.forEachEvent((event) => {
    if (event.name === future.eventName) {
      events.push(event);
    }
  });

  if (events.length === 0) {
    throw new IgnitionValidationError(
      `Contract '${future.emitter.contractName}' doesn't have an event ${future.eventName}`
    );
  }
}
