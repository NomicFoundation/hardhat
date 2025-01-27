import type { ArtifactResolver } from "../../../types/artifact";
import type { DeploymentParameters } from "../../../types/deploy";
import type { NamedArtifactLibraryDeploymentFuture } from "../../../types/module";

import { IgnitionError } from "../../../errors";
import { isAccountRuntimeValue, isArtifactType } from "../../../type-guards";
import { ERRORS } from "../../errors-list";
import { validateLibraryNames } from "../../execution/libraries";
import { validateAccountRuntimeValue } from "../utils";

export async function validateNamedLibraryDeployment(
  future: NamedArtifactLibraryDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[],
): Promise<string[]> {
  const errors: IgnitionError[] = [];

  /* stage one */

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
        contractName: future.contractName,
      }),
    );
  } else {
    errors.push(
      ...validateLibraryNames(artifact, Object.keys(future.libraries)),
    );
  }

  /* stage two */

  if (isAccountRuntimeValue(future.from)) {
    errors.push(...validateAccountRuntimeValue(future.from, accounts));
  }

  return errors.map((e) => e.message);
}
