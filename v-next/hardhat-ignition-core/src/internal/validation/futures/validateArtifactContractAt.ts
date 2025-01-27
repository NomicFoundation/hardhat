import type { ArtifactResolver } from "../../../types/artifact";
import type { DeploymentParameters } from "../../../types/deploy";
import type { ContractAtFuture } from "../../../types/module";

import { IgnitionError } from "../../../errors";
import { isModuleParameterRuntimeValue } from "../../../type-guards";
import { ERRORS } from "../../errors-list";
import { resolvePotentialModuleParameterValueFrom } from "../utils";

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
