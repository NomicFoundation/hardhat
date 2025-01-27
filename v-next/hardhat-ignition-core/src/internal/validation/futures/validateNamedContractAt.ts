import type { ArtifactResolver } from "../../../types/artifact.js";
import type { DeploymentParameters } from "../../../types/deploy.js";
import type { NamedArtifactContractAtFuture } from "../../../types/module.js";

import { IgnitionError } from "../../../errors.js";
import {
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards.js";
import { ERRORS } from "../../errors-list.js";
import { resolvePotentialModuleParameterValueFrom } from "../utils.js";

export async function validateNamedContractAt(
  future: NamedArtifactContractAtFuture<string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  _accounts: string[],
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
  }

  /* stage two */

  if (isModuleParameterRuntimeValue(future.address)) {
    const param = resolvePotentialModuleParameterValueFrom(
      deploymentParameters,
      future.address,
    );

    if (param === undefined) {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
          name: future.address.name,
        }),
      );
    } else if (typeof param !== "string") {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.INVALID_MODULE_PARAMETER_TYPE, {
          name: future.address.name,
          expectedType: "string",
          actualType: typeof param,
        }),
      );
    }
  }

  return errors.map((e) => e.message);
}
