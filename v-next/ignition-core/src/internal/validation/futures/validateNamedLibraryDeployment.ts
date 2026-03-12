import type { ArtifactResolver } from "../../../types/artifact.js";
import type { DeploymentParameters } from "../../../types/deploy.js";
import type { NamedArtifactLibraryDeploymentFuture } from "../../../types/module.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { isAccountRuntimeValue, isArtifactType } from "../../../type-guards.js";
import { validateLibraryNames } from "../../execution/libraries.js";
import { validateAccountRuntimeValue } from "../utils.js";

export async function validateNamedLibraryDeployment(
  future: NamedArtifactLibraryDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  _deploymentParameters: DeploymentParameters,
  accounts: string[],
): Promise<string[]> {
  const errors: HardhatError[] = [];

  /* stage one */

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(
      new HardhatError(
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_ARTIFACT,
        {
          contractName: future.contractName,
        },
      ),
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
