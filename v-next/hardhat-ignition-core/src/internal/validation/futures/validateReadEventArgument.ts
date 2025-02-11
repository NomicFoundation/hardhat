import type { ArtifactResolver } from "../../../types/artifact.js";
import type { DeploymentParameters } from "../../../types/deploy.js";
import type { ReadEventArgumentFuture } from "../../../types/module.js";

import { IgnitionError } from "../../../errors.js";
import { isArtifactType } from "../../../type-guards.js";
import { ERRORS } from "../../errors-list.js";
import { validateArtifactEventArgumentParams } from "../../execution/abi.js";

export async function validateReadEventArgument(
  future: ReadEventArgumentFuture,
  artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  _accounts: string[],
): Promise<string[]> {
  const errors: IgnitionError[] = [];

  /* stage one */

  const artifact =
    "artifact" in future.emitter
      ? future.emitter.artifact
      : await artifactLoader.loadArtifact(future.emitter.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
        contractName: future.emitter.contractName,
      }),
    );
  } else {
    errors.push(
      ...validateArtifactEventArgumentParams(
        artifact,
        future.eventName,
        future.nameOrIndex,
      ),
    );
  }

  return errors.map((e) => e.message);
}
