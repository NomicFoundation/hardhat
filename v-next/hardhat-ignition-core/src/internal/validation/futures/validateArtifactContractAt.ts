import type { ArtifactResolver } from "../../../types/artifact.js";
import type { DeploymentParameters } from "../../../types/deploy.js";
import type { ContractAtFuture } from "../../../types/module.js";

import { IgnitionError } from "../../../errors.js";
import { isModuleParameterRuntimeValue } from "../../../type-guards.js";
import { ERRORS } from "../../errors-list.js";
import { resolvePotentialModuleParameterValueFrom } from "../utils.js";

export async function validateArtifactContractAt(
  future: ContractAtFuture,
  _artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  _accounts: string[],
): Promise<string[]> {
  const errors: IgnitionError[] = [];

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
