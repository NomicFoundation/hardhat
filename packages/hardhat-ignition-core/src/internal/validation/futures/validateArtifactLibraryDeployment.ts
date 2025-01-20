import { IgnitionError } from "../../../errors";
import { isAccountRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { LibraryDeploymentFuture } from "../../../types/module";
import { validateLibraryNames } from "../../execution/libraries";
import { validateAccountRuntimeValue } from "../utils";

export async function validateArtifactLibraryDeployment(
  future: LibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<string[]> {
  const errors: IgnitionError[] = [];

  /* stage two */

  if (isAccountRuntimeValue(future.from)) {
    errors.push(...validateAccountRuntimeValue(future.from, accounts));
  }

  errors.push(
    ...validateLibraryNames(future.artifact, Object.keys(future.libraries))
  );

  return errors.map((e) => e.message);
}
