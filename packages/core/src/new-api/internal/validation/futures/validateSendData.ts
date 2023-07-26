import { IgnitionValidationError } from "../../../../errors";
import { isModuleParameterRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { SendDataFuture } from "../../../types/module";

export async function validateSendData(
  future: SendDataFuture,
  _artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters
) {
  if (isModuleParameterRuntimeValue(future.to)) {
    const param =
      deploymentParameters[future.to.moduleId]?.[future.to.name] ??
      future.to.defaultValue;
    if (param === undefined) {
      throw new IgnitionValidationError(
        `Module parameter '${future.to.name}' requires a value but was given none`
      );
    } else if (typeof param !== "string") {
      throw new IgnitionValidationError(
        `Module parameter '${
          future.to.name
        }' must be of type 'string' but is '${typeof param}'`
      );
    }
  }

  if (isModuleParameterRuntimeValue(future.value)) {
    const param =
      deploymentParameters[future.value.moduleId]?.[future.value.name] ??
      future.value.defaultValue;
    if (param === undefined) {
      throw new IgnitionValidationError(
        `Module parameter '${future.value.name}' requires a value but was given none`
      );
    } else if (typeof param !== "bigint") {
      throw new IgnitionValidationError(
        `Module parameter '${
          future.value.name
        }' must be of type 'bigint' but is '${typeof param}'`
      );
    }
  }

  return;
}
