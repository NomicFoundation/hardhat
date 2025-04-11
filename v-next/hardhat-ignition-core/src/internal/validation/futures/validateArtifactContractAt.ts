import type { ArtifactResolver } from "../../../types/artifact.js";
import type { DeploymentParameters } from "../../../types/deploy.js";
import type { ContractAtFuture } from "../../../types/module.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { isModuleParameterRuntimeValue } from "../../../type-guards.js";
import { resolvePotentialModuleParameterValueFrom } from "../utils.js";

export async function validateArtifactContractAt(
  future: ContractAtFuture,
  _artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  _accounts: string[],
): Promise<string[]> {
  const errors: HardhatError[] = [];

  /* stage two */

  if (isModuleParameterRuntimeValue(future.address)) {
    const param = resolvePotentialModuleParameterValueFrom(
      deploymentParameters,
      future.address,
    );

    if (param === undefined) {
      errors.push(
        new HardhatError(
          HardhatError.ERRORS.IGNITION.VALIDATION.MISSING_MODULE_PARAMETER,
          {
            name: future.address.name,
          },
        ),
      );
    } else if (typeof param !== "string") {
      errors.push(
        new HardhatError(
          HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE_PARAMETER_TYPE,
          {
            name: future.address.name,
            expectedType: "string",
            actualType: typeof param,
          },
        ),
      );
    }
  }

  return errors.map((e) => e.message);
}
