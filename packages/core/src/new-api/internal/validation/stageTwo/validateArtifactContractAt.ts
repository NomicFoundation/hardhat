import { IgnitionValidationError } from "../../../../errors";
import { isModuleParameterRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { ArtifactContractAtFuture } from "../../../types/module";

export async function validateArtifactContractAt(
  future: ArtifactContractAtFuture,
  _artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  _accounts: string[]
) {
  if (isModuleParameterRuntimeValue(future.address)) {
    const param =
      deploymentParameters[future.address.moduleId]?.[future.address.name] ??
      future.address.defaultValue;
    if (param === undefined) {
      throw new IgnitionValidationError(
        `Module parameter '${future.address.name}' requires a value but was given none`
      );
    } else if (typeof param !== "string") {
      throw new IgnitionValidationError(
        `Module parameter '${
          future.address.name
        }' must be of type 'string' but is '${typeof param}'`
      );
    }
  }
}
