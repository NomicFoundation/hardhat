import type { IgnitionError } from "../../../errors";
import type { ArtifactResolver } from "../../../types/artifact";
import type { DeploymentParameters } from "../../../types/deploy";
import type { LibraryDeploymentFuture } from "../../../types/module";

import { isAccountRuntimeValue } from "../../../type-guards";
import { validateLibraryNames } from "../../execution/libraries";
import { validateAccountRuntimeValue } from "../utils";

export async function validateArtifactLibraryDeployment(
  future: LibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[],
): Promise<string[]> {
  const errors: IgnitionError[] = [];

  /* stage two */

  if (isAccountRuntimeValue(future.from)) {
    errors.push(...validateAccountRuntimeValue(future.from, accounts));
  }

  errors.push(
    ...validateLibraryNames(future.artifact, Object.keys(future.libraries)),
  );

  return errors.map((e) => e.message);
}
