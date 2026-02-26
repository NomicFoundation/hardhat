import type { ArtifactResolver } from "../../../types/artifact.js";
import type { DeploymentParameters } from "../../../types/deploy.js";
import type { LibraryDeploymentFuture } from "../../../types/module.js";
import type { HardhatError } from "@nomicfoundation/hardhat-errors";

import { isAccountRuntimeValue } from "../../../type-guards.js";
import { validateLibraryNames } from "../../execution/libraries.js";
import { validateAccountRuntimeValue } from "../utils.js";

export async function validateArtifactLibraryDeployment(
  future: LibraryDeploymentFuture,
  _artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[],
): Promise<string[]> {
  const errors: HardhatError[] = [];

  /* stage two */

  if (isAccountRuntimeValue(future.from)) {
    errors.push(...validateAccountRuntimeValue(future.from, accounts));
  }

  errors.push(
    ...validateLibraryNames(future.artifact, Object.keys(future.libraries)),
  );

  return errors.map((e) => e.message);
}
