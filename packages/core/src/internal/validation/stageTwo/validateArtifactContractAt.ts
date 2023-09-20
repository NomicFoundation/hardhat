import { IgnitionError } from "../../../errors";
import { ERRORS } from "../../../errors-list";
import { isModuleParameterRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { ContractAtFuture } from "../../../types/module";

export async function validateArtifactContractAt(
  future: ContractAtFuture,
  _artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  _accounts: string[]
) {
  if (isModuleParameterRuntimeValue(future.address)) {
    const param =
      deploymentParameters[future.address.moduleId]?.[future.address.name] ??
      future.address.defaultValue;
    if (param === undefined) {
      throw new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
        name: future.address.name,
      });
    } else if (typeof param !== "string") {
      throw new IgnitionError(ERRORS.VALIDATION.INVALID_MODULE_PARAMETER_TYPE, {
        name: future.address.name,
        expectedType: "string",
        actualType: typeof param,
      });
    }
  }
}
